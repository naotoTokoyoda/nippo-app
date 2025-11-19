'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewUserPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'member' as 'admin' | 'manager' | 'member',
    email: '',
    password: '',
    pin: '',
    isTrainee: false,
    isActive: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('ユーザーを作成しました');
        router.push('/admin/users');
      } else {
        setError(data.error || 'ユーザーの作成に失敗しました');
      }
    } catch (err) {
      setError('ユーザーの作成に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const needsEmailPassword = formData.role === 'admin' || formData.role === 'manager';

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Link
            href="/admin/users"
            className="text-blue-600 hover:text-blue-800"
          >
            ← ユーザー管理
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">新規ユーザー作成</h1>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="space-y-6">
          {/* ユーザー名 */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              ユーザー名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* 権限 */}
          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              権限 <span className="text-red-500">*</span>
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'manager' | 'member' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="member">Member（作業者）</option>
              <option value="manager">Manager（マネージャー）</option>
              <option value="admin">Admin（管理者）</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Admin/Managerはメールアドレスとパスワードが必要です
            </p>
          </div>

          {/* メールアドレス（Admin/Managerのみ） */}
          {needsEmailPassword && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={needsEmailPassword}
              />
            </div>
          )}

          {/* パスワード（Admin/Managerのみ） */}
          {needsEmailPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={needsEmailPassword}
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                8文字以上で入力してください
              </p>
            </div>
          )}

          {/* PIN */}
          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-2">
              PIN（4桁） <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pin"
              value={formData.pin}
              onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
              required
              pattern="\d{4}"
              maxLength={4}
              placeholder="0000"
            />
            <p className="mt-1 text-xs text-gray-500">
              日報送信時に使用する4桁の数字
            </p>
          </div>

          {/* 実習生フラグ */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isTrainee"
              checked={formData.isTrainee}
              onChange={(e) => setFormData({ ...formData, isTrainee: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isTrainee" className="ml-2 block text-sm text-gray-700">
              実習生として扱う
            </label>
          </div>

          {/* アクティブフラグ */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
              アクティブ（有効）
            </label>
          </div>
        </div>

        {/* ボタン */}
        <div className="mt-8 flex justify-end gap-4">
          <Link
            href="/admin/users"
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? '作成中...' : '作成'}
          </button>
        </div>
      </form>
    </div>
  );
}

