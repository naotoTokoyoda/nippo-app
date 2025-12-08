'use client';

import { useState, useEffect } from 'react';
import { FilterOptions, Filters } from '@/hooks/useReportsList';
import DatabaseClientNameInput from '../DatabaseClientNameInput';

interface ReportsSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: Omit<Filters, 'month'>) => void;
  currentFilters: Filters;
  filterOptions: FilterOptions;
}

export default function ReportsSearchModal({
  isOpen,
  onClose,
  onSearch,
  currentFilters,
  filterOptions,
}: ReportsSearchModalProps) {
  // ローカルの検索条件（モーダル内で編集用）
  const [localFilters, setLocalFilters] = useState<Omit<Filters, 'month'>>({
    workerName: '',
    customerName: '',
    workNumberFront: '',
    workNumberBack: '',
    machineType: '',
  });

  // モーダルが開いた時に現在のフィルターをセット
  useEffect(() => {
    if (isOpen) {
      setLocalFilters({
        workerName: currentFilters.workerName,
        customerName: currentFilters.customerName,
        workNumberFront: currentFilters.workNumberFront,
        workNumberBack: currentFilters.workNumberBack,
        machineType: currentFilters.machineType,
      });
    }
  }, [isOpen, currentFilters]);

  const handleSearch = () => {
    onSearch(localFilters);
    onClose();
  };

  const handleClear = () => {
    setLocalFilters({
      workerName: '',
      customerName: '',
      workNumberFront: '',
      workNumberBack: '',
      machineType: '',
    });
  };

  const updateLocalFilter = <K extends keyof Omit<Filters, 'month'>>(
    key: K,
    value: Omit<Filters, 'month'>[K]
  ) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* モーダル本体 */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">詳細検索</h2>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* コンテンツ */}
        <div className="px-6 py-4 space-y-4">
          {/* 作業者名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">作業者名</label>
            <select
              value={localFilters.workerName}
              onChange={(e) => updateLocalFilter('workerName', e.target.value)}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {filterOptions.uniqueWorkers.map((worker, index) => (
                <option key={`worker-${worker}-${index}`} value={worker}>{worker}</option>
              ))}
            </select>
          </div>

          {/* 客先名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">客先名</label>
            <DatabaseClientNameInput
              value={localFilters.customerName}
              onChange={(value) => updateLocalFilter('customerName', value)}
              availableNames={filterOptions.uniqueCustomerNames}
              placeholder="客先名を入力"
              className="text-gray-900 h-10"
            />
          </div>

          {/* 工番（前番） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工番（前番）</label>
            <select
              value={localFilters.workNumberFront}
              onChange={(e) => updateLocalFilter('workNumberFront', e.target.value)}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {filterOptions.uniqueWorkNumbers.map((number, index) => (
                <option key={`workNumber-${number}-${index}`} value={number}>{number}</option>
              ))}
            </select>
          </div>

          {/* 工番（後番） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">工番（後番）</label>
            <input
              type="text"
              value={localFilters.workNumberBack}
              onChange={(e) => updateLocalFilter('workNumberBack', e.target.value)}
              placeholder="工番（後番）を入力"
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            />
          </div>

          {/* 機械種類 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">機械種類</label>
            <select
              value={localFilters.machineType}
              onChange={(e) => updateLocalFilter('machineType', e.target.value)}
              className="w-full px-3 py-2 h-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
            >
              <option value="">すべて</option>
              {filterOptions.uniqueMachineTypes.map((type, index) => (
                <option key={`machineType-${type}-${index}`} value={type}>{type}</option>
              ))}
            </select>
          </div>
        </div>

        {/* フッター */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-md transition-colors"
          >
            条件をクリア
          </button>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            検索
          </button>
        </div>
      </div>
    </div>
  );
}

