'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

// 統計情報の型定義
interface AdminStats {
  reportStatus: {
    submitted: number;
    total: number;
    submittedUsers: string[];
    pendingUsers: string[];
    targetMonth: number;
    targetDay: number;
  };
  monthlyReports: {
    count: number;
    month: number;
  };
  aggregatingWorkOrders: {
    count: number;
  };
}

// 8文字を超える場合は省略
function getDisplayName(name: string): string {
  if (name.length > 8) {
    return name.slice(0, 8) + '...';
  }
  return name;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const menuItems = [
    {
      title: 'ユーザー管理',
      description: 'ユーザーの追加、編集、削除、権限設定',
      icon: '👥',
      href: '/admin/users',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: '単価管理',
      description: '人工費・機械単価の設定と履歴管理',
      icon: '💰',
      href: '/admin/rates',
      color: 'bg-green-50 hover:bg-green-100 border-green-200',
    },
    {
      title: '機械管理',
      description: '機械のマスタ情報管理',
      icon: '🔧',
      href: '/admin/machines',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
    {
      title: '経費率管理',
      description: '経費カテゴリごとの上乗せ率設定と履歴管理',
      icon: '📊',
      href: '/admin/expense-rates',
      color: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        const data = await response.json();
        
        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error || '統計情報の取得に失敗しました');
        }
      } catch {
        setError('統計情報の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">管理画面ダッシュボード</h1>
        <p className="mt-2 text-gray-600">
          システムの各種設定を管理します。左のメニューまたは下のカードから選択してください。
        </p>
      </div>

      {/* メニューカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block p-6 rounded-lg border-2 transition-all ${item.color}`}
          >
            <div className="flex items-start">
              <div className="text-4xl mr-4">{item.icon}</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {item.title}
                </h2>
                <p className="text-gray-600 text-sm">
                  {item.description}
                </p>
              </div>
              <div className="ml-4">
                <svg
                  className="w-6 h-6 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* システム情報 */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          システム情報
        </h2>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 bg-gray-50 rounded-lg animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-16 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-24 mx-auto"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center p-4 text-red-600">
            <p>{error}</p>
          </div>
        ) : stats ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 日報提出状況 */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-center mb-3">
                <div className="text-2xl font-bold text-blue-900">
                  {stats.reportStatus.submitted} / {stats.reportStatus.total} 人
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  日報提出状況（{stats.reportStatus.targetMonth}/{stats.reportStatus.targetDay}）
                </div>
              </div>
              <div className="border-t border-blue-200 pt-3 mt-3">
                {stats.reportStatus.total === 0 ? (
                  <p className="text-xs text-blue-600 text-center">対象の作業者がいません</p>
                ) : (
                  <div className="flex flex-wrap gap-1 justify-center">
                    {stats.reportStatus.submittedUsers.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-800"
                        title={name}
                      >
                        ✓ {getDisplayName(name)}
                      </span>
                    ))}
                    {stats.reportStatus.pendingUsers.map((name) => (
                      <span
                        key={name}
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-800"
                        title={name}
                      >
                        ✗ {getDisplayName(name)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 今月の日報総数 */}
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-900">
                  {stats.monthlyReports.count} 件
                </div>
                <div className="text-sm text-green-700 mt-1">
                  今月の日報（{stats.monthlyReports.month}月）
                </div>
              </div>
            </div>

            {/* 集計中の工番数 */}
            <div className="p-4 bg-orange-50 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-900">
                  {stats.aggregatingWorkOrders.count} 件
                </div>
                <div className="text-sm text-orange-700 mt-1">集計中の工番</div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
