'use client';

import { useState, useEffect } from 'react';
import BasicAuthLogin from './BasicAuthLogin';
import { useEnvironment } from '@/hooks/useEnvironment';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { isDevelopment, isClient } = useEnvironment();

  useEffect(() => {
    const checkAuthentication = async () => {
      // クライアントサイドでのみ実行
      if (!isClient) return;

      // 開発環境では認証をスキップ
      if (isDevelopment) {
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/basic');
        const data = await response.json();
        setIsAuthenticated(data.authenticated);
      } catch (error) {
        console.error('認証チェックエラー:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthentication();
  }, [isDevelopment, isClient]);

  // ローディング中
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証を確認しています...</p>
        </div>
      </div>
    );
  }

  // 未認証の場合はログイン画面を表示
  if (!isAuthenticated) {
    return <BasicAuthLogin />;
  }

  // 認証済みの場合は子コンポーネントを表示
  return <>{children}</>;
}
