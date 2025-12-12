'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { AdminUser } from '@/types/admin';
import { canManageUser, canCreateUserWithRole, UserRole } from '@/lib/auth/permissions';

export default function UsersPage() {
  const { data: session } = useSession();
  const currentUserRole = session?.user?.role as UserRole | undefined;
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [sortByRole, setSortByRole] = useState<'asc' | 'desc' | null>('asc'); // デフォルトで権限順

  // ロールの優先順位（ソート用）
  const rolePriority: Record<string, number> = {
    superAdmin: 1,
    admin: 2,
    manager: 3,
    member: 4,
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();

      if (data.success) {
        setUsers(data.data);
      } else {
        setError(data.error || 'ユーザー一覧の取得に失敗しました');
      }
    } catch (err) {
      setError('ユーザー一覧の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} を無効化しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        alert('ユーザーを無効化しました');
        fetchUsers();
      } else {
        alert(data.error || 'ユーザーの無効化に失敗しました');
      }
    } catch (err) {
      alert('ユーザーの無効化に失敗しました');
      console.error(err);
    }
  };

  const getRoleBadge = (role: string) => {
    const styles: Record<string, string> = {
      superAdmin: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      member: 'bg-gray-100 text-gray-800',
    };
    const labels: Record<string, string> = {
      superAdmin: 'Super Admin',
      admin: 'Admin',
      manager: 'Manager',
      member: 'Member',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[role] || 'bg-gray-100 text-gray-800'}`}>
        {labels[role] || role}
      </span>
    );
  };

  // 表示するユーザーをフィルタリング＆ソート
  const displayedUsers = (() => {
    let filtered = showInactive ? users : users.filter(user => user.isActive);
    
    if (sortByRole) {
      filtered = [...filtered].sort((a, b) => {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;
        return sortByRole === 'asc' ? priorityA - priorityB : priorityB - priorityA;
      });
    }
    
    return filtered;
  })();

  // ソートのトグル
  const toggleRoleSort = () => {
    if (sortByRole === null) {
      setSortByRole('asc');
    } else if (sortByRole === 'asc') {
      setSortByRole('desc');
    } else {
      setSortByRole('asc');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ユーザー管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            ユーザーの追加、編集、削除、権限設定
            {currentUserRole === 'admin' && (
              <span className="ml-2 text-orange-600">
                （SuperAdmin以外を管理可能）
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            無効なユーザーを表示
          </label>
          {/* superAdminは全ロール作成可能、adminはsuperAdmin以外作成可能 */}
          {(currentUserRole === 'superAdmin' || currentUserRole === 'admin') && (
            <Link
              href="/admin/users/new"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + 新規ユーザー
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ユーザー名
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                onClick={toggleRoleSort}
              >
                <div className="flex items-center gap-1">
                  権限
                  <span className="text-gray-400">
                    {sortByRole === 'asc' && '↑'}
                    {sortByRole === 'desc' && '↓'}
                    {sortByRole === null && '↕'}
                  </span>
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                タグ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状態
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {displayedUsers.map((user) => (
              <tr key={user.id} className={!user.isActive ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {user.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getRoleBadge(user.role)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isTrainee ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      実習生
                    </span>
                  ) : (
                    <span className="text-sm text-gray-400">-</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {user.isActive ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      有効
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                      無効
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {canManageUser(currentUserRole, user.role as UserRole) ? (
                    <>
                      <Link
                        href={`/admin/users/${user.id}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        編集
                      </Link>
                      {user.isActive && (
                        <button
                          onClick={() => handleDelete(user.id, user.name)}
                          className="text-red-600 hover:text-red-900"
                        >
                          無効化
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs">権限なし</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {displayedUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {showInactive ? 'ユーザーが登録されていません' : '有効なユーザーが登録されていません'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

