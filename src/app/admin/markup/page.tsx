'use client';

import { useState, useEffect } from 'react';

interface MarkupSetting {
  id: string;
  category: string;
  markupRate: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  markupRate: string;
  effectiveFrom: string;
  effectiveTo: string;
  memo: string;
}

export default function MarkupPage() {
  const [settings, setSettings] = useState<MarkupSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // カテゴリ別のフォームデータ
  const [formData, setFormData] = useState<Record<string, CategoryFormData>>({
    materials: {
      markupRate: '20',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      memo: '',
    },
    outsourcing: {
      markupRate: '20',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      memo: '',
    },
    shipping: {
      markupRate: '20',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      memo: '',
    },
    other: {
      markupRate: '20',
      effectiveFrom: new Date().toISOString().split('T')[0],
      effectiveTo: '',
      memo: '',
    },
  });

  useEffect(() => {
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/markup');
      const data = await response.json();

      if (data.success) {
        setSettings(data.data);
        
        // 各カテゴリの最新設定をフォームに反映
        const latestSettings: Record<string, MarkupSetting> = {};
        data.data.forEach((setting: MarkupSetting) => {
          if (!latestSettings[setting.category] || 
              new Date(setting.effectiveFrom) > new Date(latestSettings[setting.category].effectiveFrom)) {
            latestSettings[setting.category] = setting;
          }
        });

        const newFormData = { ...formData };
        Object.entries(latestSettings).forEach(([category, setting]) => {
          newFormData[category] = {
            markupRate: String(setting.markupRate),
            effectiveFrom: new Date(setting.effectiveFrom).toISOString().split('T')[0],
            effectiveTo: setting.effectiveTo ? new Date(setting.effectiveTo).toISOString().split('T')[0] : '',
            memo: setting.memo || '',
          };
        });
        setFormData(newFormData);
      } else {
        setError(data.error || 'マークアップ率の取得に失敗しました');
      }
    } catch (err) {
      setError('マークアップ率の取得に失敗しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (category: string) => {
    const data = formData[category];
    
    try {
      const response = await fetch('/api/admin/markup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          markupRate: parseFloat(data.markupRate),
          effectiveFrom: new Date(data.effectiveFrom).toISOString(),
          effectiveTo: data.effectiveTo ? new Date(data.effectiveTo).toISOString() : null,
          memo: data.memo || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert('マークアップ率を保存しました');
        fetchSettings();
      } else {
        alert(result.error || 'マークアップ率の保存に失敗しました');
      }
    } catch (err) {
      alert('マークアップ率の保存に失敗しました');
      console.error(err);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      materials: '材料費',
      outsourcing: '外注費',
      shipping: '配送費',
      other: 'その他',
    };
    return labels[category] || category;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  const getCategorySettings = (category: string) => {
    return settings.filter(s => s.category === category).sort((a, b) => 
      new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime()
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const categories = ['materials', 'outsourcing', 'shipping', 'other'];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">経費マークアップ率管理</h1>
        <p className="mt-2 text-sm text-gray-600">
          各経費カテゴリの原価に対するマークアップ率（％）を設定します
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {categories.map((category) => {
          const categorySettings = getCategorySettings(category);
          const data = formData[category];
          
          return (
            <div key={category} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {getCategoryLabel(category)}
              </h2>

              {/* 設定フォーム */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    マークアップ率（%） <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={data.markupRate}
                    onChange={(e) => setFormData({
                      ...formData,
                      [category]: { ...data, markupRate: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    max="100"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    適用開始日 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={data.effectiveFrom}
                    onChange={(e) => setFormData({
                      ...formData,
                      [category]: { ...data, effectiveFrom: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    適用終了日（任意）
                  </label>
                  <input
                    type="date"
                    value={data.effectiveTo}
                    onChange={(e) => setFormData({
                      ...formData,
                      [category]: { ...data, effectiveTo: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    メモ（任意）
                  </label>
                  <input
                    type="text"
                    value={data.memo}
                    onChange={(e) => setFormData({
                      ...formData,
                      [category]: { ...data, memo: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    maxLength={200}
                    placeholder="備考・変更理由など"
                  />
                </div>
              </div>

              <button
                onClick={() => handleSubmit(category)}
                className="mb-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                この設定を保存
              </button>

              {/* 履歴 */}
              {categorySettings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">設定履歴</h3>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            マークアップ率
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            有効期間
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            メモ
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {categorySettings.map((setting) => (
                          <tr key={setting.id}>
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {Number(setting.markupRate)}%
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {formatDate(setting.effectiveFrom)}
                              {setting.effectiveTo && ` 〜 ${formatDate(setting.effectiveTo)}`}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {setting.memo || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 注意事項 */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong className="font-semibold">⚠️ 注意</strong><br />
          設定したマークアップ率は、適用開始日以降に作成される案件の経費計算に使用されます。<br />
          既存の案件には影響しません。
        </p>
      </div>
    </div>
  );
}

