'use client';

import { useState, useEffect, useRef } from 'react';

interface User {
  id: string;
  name: string;
}

interface PinAuthModalProps {
  isOpen: boolean;
  users: User[];
  selectedUserId?: string;
  onSuccess: (user: { id: string; name: string; role: string }) => void;
  onCancel: () => void;
  title?: string;
  description?: string;
}

export default function PinAuthModal({
  isOpen,
  users,
  selectedUserId,
  onSuccess,
  onCancel,
  title = 'PIN認証',
  description = '4桁のPINを入力してください',
}: PinAuthModalProps) {
  const [userId, setUserId] = useState(selectedUserId || '');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const pinInputRef = useRef<HTMLInputElement>(null);

  // モーダルが開いたらPIN入力欄にフォーカス
  useEffect(() => {
    if (isOpen && userId) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, userId]);

  // selectedUserIdが変更されたら更新
  useEffect(() => {
    if (selectedUserId) {
      setUserId(selectedUserId);
    }
  }, [selectedUserId]);

  // モーダルが閉じたらリセット
  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userId) {
      setError('作業者を選択してください');
      return;
    }
    
    if (pin.length !== 4) {
      setError('PINは4桁で入力してください');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, pin }),
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user);
        setPin('');
      } else {
        setError(data.message || 'PINが正しくありません');
        setPin('');
        pinInputRef.current?.focus();
      }
    } catch (err) {
      console.error('PIN認証エラー:', err);
      setError('認証処理中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(value);
    setError('');
  };

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setUserId(e.target.value);
    setPin('');
    setError('');
    if (e.target.value) {
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 100);
    }
  };

  const handleCancel = () => {
    setPin('');
    setError('');
    onCancel();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <p className="text-blue-100 text-sm mt-1">{description}</p>
        </div>

        {/* コンテンツ */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* 作業者選択（selectedUserIdがない場合のみ表示） */}
          {!selectedUserId && (
            <div>
              <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-2">
                作業者を選択
              </label>
              <select
                id="user"
                value={userId}
                onChange={handleUserChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                disabled={isLoading}
              >
                <option value="">選択してください</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* PIN入力 */}
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              4桁のPIN
            </label>
            <input
              ref={pinInputRef}
              type="password"
              id="pin"
              value={pin}
              onChange={handlePinChange}
              className="w-full px-4 py-4 border border-gray-300 rounded-lg text-center text-3xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••"
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              disabled={isLoading || !userId}
              autoComplete="off"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleCancel}
              className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              disabled={isLoading}
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !userId || pin.length !== 4}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  認証中...
                </div>
              ) : (
                '認証'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

