'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import ReportsList from '@/components/ReportsList';
import PinAuthModal from '@/components/PinAuthModal';
import { useIdleTimeout } from '@/hooks/useIdleTimeout';
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

const PIN_AUTH_KEY = 'reports_pin_auth';
const IDLE_TIMEOUT_MS = 10 * 60 * 1000; // 10分

export default function ReportsListWithAuth() {
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
        const result = await response.json();
        // APIは { success: true, data: [...] } の形式で返す
        if (result.success && Array.isArray(result.data)) {
          setUsers(result.data);
        } else {
          console.error('ユーザー取得エラー:', result.error);
          showToast('ユーザー情報の取得に失敗しました', 'error');
        }
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

  // タイムアウト時の処理
  const handleTimeout = useCallback(() => {
    sessionStorage.removeItem(PIN_AUTH_KEY);
    setAuthenticatedUser(null);
    showToast('セッションがタイムアウトしました', 'info');
  }, [showToast]);

  // 無操作タイムアウト
  useIdleTimeout({
    timeout: IDLE_TIMEOUT_MS,
    onTimeout: handleTimeout,
    redirectTo: '/',
    enabled: !!authenticatedUser,
  });

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
        title="日報一覧認証"
        description="作業者を選択してPINを入力してください"
      />
    );
  }

  // 認証済みの場合は日報一覧を表示
  return (
    <div>
      {/* 認証ユーザー表示 & タイムアウト警告 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-blue-600">ログイン中</p>
            <p className="text-lg font-bold text-blue-900">{authenticatedUser.name}</p>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-xs text-blue-600">
              ※ 10分間操作がないと自動でログアウトします
            </p>
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
        </div>
      </div>

      {/* 日報一覧（認証済みユーザー情報を渡す） */}
      <ReportsList 
        authenticatedUserId={authenticatedUser.id}
        authenticatedUserName={authenticatedUser.name}
      />
    </div>
  );
}

