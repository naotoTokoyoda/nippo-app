/**
 * PIN認証用カスタムフック
 */
'use client';

import { useState, useCallback, useEffect } from 'react';

interface PinAuthUser {
  id: string;
  name: string;
  role: string;
}

interface UsePinAuthReturn {
  authenticatedUser: PinAuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  authenticate: (userId: string, pin: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
}

const PIN_AUTH_KEY = 'pin_auth';

export function usePinAuth(): UsePinAuthReturn {
  const [authenticatedUser, setAuthenticatedUser] = useState<PinAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        }
      } catch {
        sessionStorage.removeItem(PIN_AUTH_KEY);
      }
    }
  }, []);

  // PIN認証を実行
  const authenticate = useCallback(async (userId: string, pin: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      });

      const data = await response.json();

      if (data.success) {
        const user = data.user as PinAuthUser;
        setAuthenticatedUser(user);

        // セッションストレージに保存（30分有効）
        sessionStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          user,
          expiresAt: Date.now() + 30 * 60 * 1000,
        }));

        return true;
      } else {
        setError(data.message || 'PINが正しくありません');
        return false;
      }
    } catch (err) {
      console.error('PIN認証エラー:', err);
      setError('認証処理中にエラーが発生しました');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ログアウト
  const logout = useCallback(() => {
    setAuthenticatedUser(null);
    sessionStorage.removeItem(PIN_AUTH_KEY);
  }, []);

  // エラーをクリア
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    authenticatedUser,
    isAuthenticated: authenticatedUser !== null,
    isLoading,
    error,
    authenticate,
    logout,
    clearError,
  };
}

