'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { validateDailyReport, validateBasicInfo } from '@/utils/validation';
import { getTodayInJST } from '@/utils/timeCalculation';
import { DailyReportData, WorkItemData, ValidationError } from '@/types/daily-report';

export interface User {
  id: string;
  name: string;
}

// 初期作業項目
const createInitialWorkItem = (): WorkItemData => ({
  id: '1',
  customerName: '',
  workNumberFront: '',
  workNumberBack: '',
  name: '',
  startTime: '',
  endTime: '',
  machineType: '',
  workStatus: 'normal',
  remarks: ''
});

// 初期日報データ
const createInitialReportData = (): DailyReportData => ({
  date: getTodayInJST(),
  workerName: '',
  workItems: [createInitialWorkItem()]
});

interface UseDailyReportFormOptions {
  /** 送信完了時のコールバック */
  onSubmitComplete?: () => void;
}

export function useDailyReportForm(options: UseDailyReportFormOptions = {}) {
  const { onSubmitComplete } = options;
  const router = useRouter();
  
  // 状態
  const [reportData, setReportData] = useState<DailyReportData>(createInitialReportData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [basicInfoErrors, setBasicInfoErrors] = useState<ValidationError[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // ユーザー一覧を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await fetch('/api/users');
        const data = await response.json();
        
        if (data.success) {
          setUsers(data.data);
        } else {
          console.error('ユーザー一覧の取得に失敗しました:', data.error);
        }
      } catch (error) {
        console.error('ユーザー一覧の取得に失敗しました:', error);
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, []);

  // 基本情報のリアルタイムバリデーション
  useEffect(() => {
    if (!showValidation) {
      setBasicInfoErrors([]);
      return;
    }
    
    const validation = validateBasicInfo({
      date: reportData.date,
      workerName: reportData.workerName
    });
    
    if (!validation.success && validation.errors) {
      setBasicInfoErrors(validation.errors);
    } else {
      setBasicInfoErrors([]);
    }
  }, [reportData.date, reportData.workerName, showValidation]);

  // 作業項目のリアルタイムバリデーション
  useEffect(() => {
    if (!showValidation) {
      setValidationErrors([]);
      return;
    }
    
    const validation = validateDailyReport(reportData);
    
    if (!validation.success && validation.errors) {
      setValidationErrors(validation.errors);
    } else {
      setValidationErrors([]);
    }
  }, [reportData, showValidation]);

  // 日付を更新
  const updateDate = useCallback((date: string) => {
    setReportData(prev => ({ ...prev, date }));
  }, []);

  // 作業者名を更新
  const updateWorkerName = useCallback((workerName: string) => {
    setReportData(prev => ({ ...prev, workerName }));
  }, []);

  // 作業項目を更新
  const updateWorkItem = useCallback((id: string, updatedItem: Partial<WorkItemData>) => {
    setReportData(prev => ({
      ...prev,
      workItems: prev.workItems.map(item =>
        item.id === id ? { ...item, ...updatedItem } : item
      )
    }));
  }, []);

  // 作業項目を削除
  const removeWorkItem = useCallback((id: string) => {
    setReportData(prev => ({
      ...prev,
      workItems: prev.workItems.filter(item => item.id !== id)
    }));
  }, []);

  // 工番検索結果から最初の作業項目に自動入力
  const applyWorkNumberSearch = useCallback((workInfo: {
    customerName: string;
    workNumberFront: string;
    workNumberBack: string;
    workName: string;
  }) => {
    setReportData(prev => {
      const firstWorkItem = prev.workItems[0];
      if (firstWorkItem) {
        const updatedWorkItem = {
          ...firstWorkItem,
          customerName: workInfo.customerName || firstWorkItem.customerName,
          workNumberFront: workInfo.workNumberFront || firstWorkItem.workNumberFront,
          workNumberBack: workInfo.workNumberBack || firstWorkItem.workNumberBack,
          name: workInfo.workName || firstWorkItem.name
        };

        return {
          ...prev,
          workItems: [updatedWorkItem, ...prev.workItems.slice(1)]
        };
      }
      return prev;
    });
  }, []);

  // 日報を送信
  const handleSubmit = useCallback(async () => {
    // バリデーション実行
    const validation = validateDailyReport(reportData);
    
    if (!validation.success) {
      setShowValidation(true);
      setValidationErrors(validation.errors || []);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reportData),
      });

      const result = await response.json();

      if (result.success) {
        // onSubmitCompleteが指定されている場合はそれを呼び出す
        if (onSubmitComplete) {
          onSubmitComplete();
        } else {
          router.push('/reports');
        }
      } else {
        console.error('保存エラー:', result.error);
        alert('日報の保存に失敗しました: ' + result.error);
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('送信エラー:', error);
      alert('日報の送信中にエラーが発生しました');
      setIsSubmitting(false);
    }
  }, [reportData, router, onSubmitComplete]);

  // エラーがあるかどうか
  const hasErrors = validationErrors.length > 0 || basicInfoErrors.length > 0;

  return {
    // 状態
    reportData,
    isSubmitting,
    showValidation,
    validationErrors,
    basicInfoErrors,
    users,
    loadingUsers,
    hasErrors,
    // アクション
    updateDate,
    updateWorkerName,
    updateWorkItem,
    removeWorkItem,
    applyWorkNumberSearch,
    handleSubmit,
  };
}

