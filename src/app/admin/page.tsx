import Link from 'next/link';

export default function AdminDashboard() {
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

      {/* 統計情報（将来的に追加） */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          システム情報
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-sm text-gray-600 mt-1">登録ユーザー数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-sm text-gray-600 mt-1">登録機械数</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">-</div>
            <div className="text-sm text-gray-600 mt-1">有効な単価設定数</div>
          </div>
        </div>
        <p className="mt-4 text-xs text-gray-500 text-center">
          ※ 統計情報は今後実装予定です
        </p>
      </div>
    </div>
  );
}

