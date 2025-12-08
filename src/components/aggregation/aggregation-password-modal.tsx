'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface AggregationPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AggregationPasswordModal({ isOpen, onClose }: AggregationPasswordModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/aggregation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        // 認証成功時は集計ページに遷移
        router.push('/aggregation');
        onClose();
        setPassword('');
      } else {
        const data = await response.json();
        setError(data.message || 'パスワードが正しくありません');
      }
    } catch (error) {
      console.error('認証エラー:', error);
      setError('認証処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">集計機能へのアクセス</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isLoading}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          集計機能にアクセスするにはパスワードが必要です。
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              パスワード
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="パスワードを入力してください"
              required
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !password.trim()}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="ml-2">認証中...</span>
                </div>
              ) : (
                'アクセス'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
