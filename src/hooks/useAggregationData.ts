import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { WorkOrderDetail } from '@/types/aggregation';

/**
 * 集計データ取得のカスタムフック
 * 
 * 認証チェックと工番詳細データの取得を担当する
 */
export function useAggregationData(workOrderId: string) {
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  /**
   * 工番詳細データを取得
   */
  const fetchWorkOrderDetail = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/aggregation/${workOrderId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || 'データの取得に失敗しました';
        const errorDetails = errorData.details ? `\n詳細: ${errorData.details}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      const data = await response.json();
      setWorkOrder(data);
    } catch (error) {
      console.error('集計詳細取得エラー:', error);
      const message = error instanceof Error ? error.message : 'データの取得に失敗しました。再度お試しください。';
      alert(message);
    } finally {
      setLoading(false);
    }
  }, [workOrderId]);

  /**
   * 認証チェック
   */
  const checkAuthentication = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/aggregation');
      const data = await response.json();

      if (!data.authenticated) {
        router.replace('/');
        return;
      }

      setIsAuthenticated(true);
    } catch (error) {
      console.error('認証チェックエラー:', error);
      router.replace('/');
    }
  }, [router]);

  /**
   * 初期化時に認証チェック
   */
  useEffect(() => {
    checkAuthentication();
  }, [checkAuthentication]);

  /**
   * 認証完了後にデータ取得
   */
  useEffect(() => {
    if (isAuthenticated) {
      fetchWorkOrderDetail();
    }
  }, [fetchWorkOrderDetail, isAuthenticated]);

  /**
   * ステータスのみをローカルで更新（軽量化のため、API呼び出しなし）
   */
  const updateStatus = useCallback((newStatus: 'delivered' | 'aggregating' | 'aggregated') => {
    if (workOrder) {
      setWorkOrder({
        ...workOrder,
        status: newStatus,
      });
    }
  }, [workOrder]);

  return {
    workOrder,
    loading,
    isAuthenticated,
    refetch: fetchWorkOrderDetail,
    updateStatus,
  };
}

