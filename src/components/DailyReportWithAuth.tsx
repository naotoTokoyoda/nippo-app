'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DailyReport from '@/components/DailyReport';
import PinAuthModal from '@/components/PinAuthModal';
import { useToast } from '@/components/ToastProvider';

interface User {
  id: string;
  name: string;
}

interface AuthenticatedUser {
  id: string;
  name: string;
  role: string;
}

const PIN_AUTH_KEY = 'daily_report_pin_auth';

export default function DailyReportWithAuth() {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  // ユーザー一覧を取得（PIN認証が必要なユーザーのみ = member と manager）
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        // member と manager のみ表示（adminは日報入力しない）
        const filteredUsers = data.filter((u: { role: string }) => 
          u.role === 'member' || u.role === 'manager'
        );
        setUsers(filteredUsers);
      } catch (error) {
        console.error('ユーザー取得エラー:', error);
        showToast('ユーザー情報の取得に失敗しました', 'error');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, [showToast]);

  // セッションストレージから認証情報を復元
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const stored = sessionStorage.getItem(PIN_AUTH_KEY);
    if (stored) {
      try {
        const { user, expiresAt } = JSON.parse(stored);
        if (expiresAt > Date.now()) {
          setAuthenticatedUser(user);
        } else {
          sessionStorage.removeItem(PIN_AUTH_KEY);
          setShowPinModal(true);
        }
      } catch {
        sessionStorage.removeItem(PIN_AUTH_KEY);
        setShowPinModal(true);
      }
    } else {
      setShowPinModal(true);
    }
  }, []);

  // PIN認証成功時
  const handleAuthSuccess = useCallback((user: AuthenticatedUser) => {
    setAuthenticatedUser(user);
    setShowPinModal(false);
    
    // セッションストレージに保存（30分有効）
    sessionStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
      user,
      expiresAt: Date.now() + 30 * 60 * 1000,
    }));
    
    showToast(`${user.name}さんとしてログインしました`, 'success');
  }, [showToast]);

  // 認証キャンセル時
  const handleAuthCancel = useCallback(() => {
    router.push('/');
  }, [router]);

  // 日報送信完了時（DailyReportから呼ばれる）
  const handleSubmitComplete = useCallback(() => {
    // PIN認証をクリア
    sessionStorage.removeItem(PIN_AUTH_KEY);
    setAuthenticatedUser(null);
    
    // ホームへリダイレクト
    router.push('/');
  }, [router]);

  // ローディング中
  if (loadingUsers) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    );
  }

  // 未認証時はPINモーダルを表示
  if (!authenticatedUser) {
    return (
      <PinAuthModal
        isOpen={showPinModal}
        users={users}
        onSuccess={handleAuthSuccess}
        onCancel={handleAuthCancel}
        title="日報入力認証"
        description="作業者を選択してPINを入力してください"
      />
    );
  }

  // 認証済みの場合は日報入力フォームを表示
  return (
    <div>
      {/* 認証ユーザー表示 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center justify-between">
        <div>
          <p className="text-sm text-blue-600">ログイン中</p>
          <p className="text-lg font-bold text-blue-900">{authenticatedUser.name}</p>
        </div>
        <button
          onClick={() => {
            sessionStorage.removeItem(PIN_AUTH_KEY);
            setAuthenticatedUser(null);
            setShowPinModal(true);
          }}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          ユーザー切替
        </button>
      </div>

      {/* 日報入力フォーム */}
      <DailyReport 
        authenticatedUserId={authenticatedUser.id}
        authenticatedUserName={authenticatedUser.name}
        onSubmitComplete={handleSubmitComplete}
      />
    </div>
  );
}

