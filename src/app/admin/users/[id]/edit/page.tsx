'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { AdminUser } from '@/types/admin';
import { UserRole } from '@/lib/auth/permissions';

interface EditUserPageProps {
  params: Promise<{ id: string }>;
}

export default function EditUserPage({ params }: EditUserPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role as UserRole | undefined;
  const [id, setId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'member' as UserRole,
    email: '',
    password: '',
    pin: '',
    isTrainee: false,
    isActive: true,
  });

  useEffect(() => {
    params.then(p => {
      setId(p.id);
      fetchUser(p.id);
    });
  }, [params]);

  const fetchUser = async (userId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/users/${userId}`);
      const data = await response.json();

      if (data.success) {
        setUser(data.data);
        setFormData({
          name: data.data.name,
          role: data.data.role,
          email: data.data.email || '',
          password: '',
          pin: data.data.pin,
          isTrainee: data.data.isTrainee,
          isActive: data.data.isActive,
        });
      } else {
        setError(data.error || 'ユーザーの取得に失敗しました');
      }
    } catch (err) {
      setError('ユーザーの取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      // パスワードが空の場合は送信しない
      const updateData: Partial<typeof formData> & { password?: string } = { ...formData };
      if (!updateData.password) {
        delete updateData.password;
      }

      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (data.success) {
        alert('ユーザーを更新しました');
        router.push('/admin/users');
      } else {
        setError(data.error || 'ユーザーの更新に失敗しました');
      }
    } catch (err) {
      setError('ユーザーの更新に失敗しました');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const needsEmailPassword = formData.role === 'superAdmin' || formData.role === 'admin' || formData.role === 'manager';

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">ユーザーが見つかりません</p>
      </div>
    );
  }

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
        <h1 className="text-2xl font-bold text-gray-900">ユーザー編集</h1>
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
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={user?.role === 'superAdmin' && currentUserRole !== 'superAdmin'}
            >
              <option value="member">Member（作業者）</option>
              <option value="manager">Manager（共有端末用）</option>
              <option value="admin">Admin（管理者）</option>
              {/* SuperAdminのみがSuperAdminを設定可能 */}
              {(currentUserRole === 'superAdmin' || user?.role === 'superAdmin') && (
                <option value="superAdmin">Super Admin（最高責任者）</option>
              )}
            </select>
            {user?.role === 'superAdmin' && currentUserRole !== 'superAdmin' && (
              <p className="mt-1 text-xs text-orange-600">
                SuperAdminの権限は変更できません
              </p>
            )}
          </div>

          {/* メールアドレス（Admin/Managerのみ） */}
          {needsEmailPassword && (
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                メールアドレス {needsEmailPassword && <span className="text-red-500">*</span>}
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
                パスワード（変更する場合のみ）
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                minLength={8}
              />
              <p className="mt-1 text-xs text-gray-500">
                空欄の場合は変更されません
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
            />
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
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </form>
    </div>
  );
}

