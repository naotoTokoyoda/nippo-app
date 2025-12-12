'use client';

import { useEffect, useState } from 'react';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
}

interface Operator {
  userId: string;
  userName: string;
}

interface AuditLogsResponse {
  success: boolean;
  items: AuditLog[];
  operators: Operator[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 操作種別の日本語表示
const actionLabels: Record<string, string> = {
  access: 'アクセス',
  update: '更新',
};

// 詳細情報のフィールド名を日本語に変換
const fieldLabels: Record<string, string> = {
  status: 'ステータス',
  final_decision_amount: '最終決定金額',
};

// ステータスの日本語表示
const statusLabels: Record<string, string> = {
  delivered: '納品済み',
  aggregating: '集計中',
  aggregated: '完了',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [userFilter, setUserFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (userFilter) params.set('userId', userFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/admin/audit-logs?${params}`);
      const data: AuditLogsResponse = await response.json();

      if (data.success) {
        setLogs(data.items);
        setOperators(data.operators || []);
        setTotalPages(data.totalPages);
      } else {
        setError('監査ログの取得に失敗しました');
      }
    } catch {
      setError('監査ログの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 初回ロードとページ変更時のみAPI呼び出し
  useEffect(() => {
    fetchLogs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const clearFilters = () => {
    setUserFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    // フィルタークリア後に再検索
    setTimeout(() => fetchLogs(), 0);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 工番を取得（details.workNumber または resourceId）
  const getWorkNumber = (log: AuditLog): string => {
    if (log.details?.workNumber) {
      return log.details.workNumber as string;
    }
    // resourceIdが工番形式でない場合は省略表示
    if (log.resourceId.length > 10) {
      return log.resourceId.slice(0, 8) + '...';
    }
    return log.resourceId;
  };

  // 値をフォーマット（金額 or ステータス）
  const formatValue = (value: unknown, field: string): string => {
    if (value === null || value === undefined) return '未設定';
    if (field === 'status') {
      return statusLabels[value as string] || (value as string);
    }
    if (typeof value === 'number') {
      return `¥${value.toLocaleString()}`;
    }
    return String(value);
  };

  // 変更内容を簡潔に表示
  const formatChangesSummary = (details: Record<string, unknown> | null): string => {
    if (!details) return '-';
    
    const field = details.field as string;
    const fieldName = fieldLabels[field] || field;
    const oldVal = formatValue(details.oldValue, field);
    const newVal = formatValue(details.newValue, field);
    
    return `${fieldName}: ${oldVal} → ${newVal}`;
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">監査ログ</h1>
        <p className="mt-1 text-sm text-gray-600">
          重要な操作の記録を確認できます
        </p>
      </div>

      {/* フィルター */}
      <div className="mb-4 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              操作者
            </label>
            <select
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[150px]"
            >
              <option value="">すべて</option>
              {operators.map((op) => (
                <option key={op.userId} value={op.userId}>
                  {op.userName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              開始日
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              終了日
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            検索
          </button>
          {(userFilter || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
            >
              クリア
            </button>
          )}
        </div>
      </div>

      {/* テーブル */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">監査ログがありません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    工番
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    変更内容
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatTimestamp(log.timestamp)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {log.userName}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.action === 'update' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {actionLabels[log.action] || log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-mono font-medium">{getWorkNumber(log)}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {formatChangesSummary(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            前へ
          </button>
          <span className="px-3 py-1 text-sm text-gray-600">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
}
