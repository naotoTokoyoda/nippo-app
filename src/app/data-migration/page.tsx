'use client';

import { useState } from 'react';
import { generateSampleCSV } from '@/lib/spreadsheet-import';

export default function DataMigrationPage() {
  const [file, setFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    summary: {
      totalReports: number;
      totalWorkItems: number;
      importedReports: number;
      importedWorkItems: number;
      skippedItems: number;
      errors: string[];
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setCsvData('');
    } else {
      setError('CSVファイルを選択してください');
    }
  };

  const handleCsvDataChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCsvData(e.target.value);
    setFile(null);
  };

  const handleImport = async () => {
    if (!file && !csvData.trim()) {
      setError('ファイルまたはCSVデータを入力してください');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('csvData', csvData);
      }

      const response = await fetch('/api/data/import', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'インポートに失敗しました');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '予期しないエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleCSV = generateSampleCSV();
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample-import.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setFile(null);
    setCsvData('');
    setResult(null);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">データ移行ツール</h1>
        
        <div className="space-y-6">
          {/* 説明セクション */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">使用方法</h2>
            <ul className="text-blue-800 space-y-1 text-sm">
              <li>• スプレッドシートのデータをCSV形式でエクスポートしてください</li>
              <li>• 以下のカラムが必要です: date, workerName, customerName, workNumberFront, workNumberBack, workName, startTime, endTime, machineType, workStatus, remarks</li>
              <li>• 日付は YYYY-MM-DD 形式で入力してください</li>
              <li>• 時刻は HH:MM 形式で入力してください</li>
            </ul>
          </div>

          {/* ファイルアップロード */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CSVファイルのアップロード</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                CSVファイルを選択
              </label>
              {file && (
                <p className="mt-2 text-sm text-gray-600">
                  選択されたファイル: {file.name}
                </p>
              )}
            </div>
          </div>

          {/* または */}
          <div className="text-center">
            <span className="text-gray-500">または</span>
          </div>

          {/* CSVデータ直接入力 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">CSVデータの直接入力</h2>
            <textarea
              value={csvData}
              onChange={handleCsvDataChange}
              placeholder="CSVデータをここに貼り付けてください..."
              className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* サンプルCSVダウンロード */}
          <div className="text-center">
            <button
              onClick={downloadSampleCSV}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              サンプルCSVをダウンロード
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 結果表示 */}
          {result && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-900 mb-2">インポート結果</h3>
              <div className="text-green-800 space-y-1">
                <p>• 総日報数: {result.summary.totalReports}件</p>
                <p>• 総作業項目数: {result.summary.totalWorkItems}件</p>
                <p>• インポート成功日報: {result.summary.importedReports}件</p>
                <p>• インポート成功作業項目: {result.summary.importedWorkItems}件</p>
                <p>• スキップされた項目: {result.summary.skippedItems}件</p>
              </div>
              {result.summary.errors.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-red-900 mb-2">エラー詳細:</h4>
                  <ul className="text-red-800 text-sm space-y-1">
                    {result.summary.errors.map((error: string, index: number) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex justify-center space-x-4">
            <button
              onClick={handleImport}
              disabled={isLoading || (!file && !csvData.trim())}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
            >
              {isLoading ? 'インポート中...' : 'データをインポート'}
            </button>
            <button
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              リセット
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
