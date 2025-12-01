import Link from 'next/link';

export default function RatesPage() {
  const rateTypes = [
    {
      title: '人工費単価管理',
      description: '通常作業、実習生、検査作業等の単価を管理',
      icon: '👷',
      href: '/admin/rates/labor',
      color: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    },
    {
      title: '機械単価管理',
      description: '機械稼働費の単価を管理（機械マスタと連携）',
      icon: '🔧',
      href: '/admin/rates/machine',
      color: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">単価管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          単価の種類を選択してください
        </p>
      </div>

      {/* 補足情報 */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          💡 単価管理について
        </h3>
        <ul className="text-xs text-blue-800 space-y-1">
          <li>• 人工費単価: 作業者の労働時間に対する単価（Activity別）</li>
          <li>• 機械単価: 機械稼働時間に対する単価（機械マスタと連携）</li>
          <li>• 各単価は必要に応じて更新できます</li>
        </ul>
      </div>

      {/* 単価種別選択カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {rateTypes.map((type) => (
          <Link
            key={type.href}
            href={type.href}
            className={`block p-6 rounded-lg border-2 transition-all ${type.color}`}
          >
            <div className="flex items-start">
              <div className="text-4xl mr-4">{type.icon}</div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {type.title}
                </h2>
                <p className="text-gray-600 text-sm">
                  {type.description}
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
    </div>
  );
}
