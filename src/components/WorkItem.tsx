'use client';

import { WorkItemData } from './DailyReport';

interface WorkItemProps {
  item: WorkItemData;
  index: number;
  onUpdate: (updates: Partial<WorkItemData>) => void;
  onRemove: () => void;
}

const MACHINE_TYPES = [
  'MILLAC 1052 VII',
  'MILLAC 761 VII',
  '250 : NC旋盤マザック',
  '350 : NC旋盤マザック',
  'スマート250 L : NC旋盤',
  'Mazak REX',
  'Mazatrol M-32',
  '正面盤 : Chubu LF 500',
  '12尺 : 汎用旋盤',
  '汎用旋盤',
  '溶接',
  '該当なし'
];

export default function WorkItem({ item, index, onUpdate, onRemove }: WorkItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">作業 {index}</h3>
        <button
          onClick={onRemove}
          className="px-3 py-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"
        >
          削除
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 客先名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            客先名
          </label>
          <input
            type="text"
            value={item.customerName}
            onChange={(e) => onUpdate({ customerName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 工番（前番） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工番（前番）
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={`workNumberFront-${item.id}`}
                value="5927"
                checked={item.workNumberFront === "5927"}
                onChange={(e) => onUpdate({ workNumberFront: e.target.value })}
                className="mr-2"
              />
              5927（前期）
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={`workNumberFront-${item.id}`}
                value="6028"
                checked={item.workNumberFront === "6028"}
                onChange={(e) => onUpdate({ workNumberFront: e.target.value })}
                className="mr-2"
              />
              6028（当期）
            </label>
          </div>
        </div>

        {/* 工番（後番） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工番（後番）
          </label>
          <input
            type="text"
            value={item.workNumberBack}
            onChange={(e) => onUpdate({ workNumberBack: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            名称
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 作業開始時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業開始時間
          </label>
          <input
            type="time"
            value={item.startTime}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 作業終了時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業終了時間
          </label>
          <input
            type="time"
            value={item.endTime}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 機械種類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            機械種類
          </label>
          <select
            value={item.machineType}
            onChange={(e) => onUpdate({ machineType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">選択してください</option>
            {MACHINE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 備考 */}
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          備考
        </label>
        <textarea
          value={item.remarks}
          onChange={(e) => onUpdate({ remarks: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* 作業時間の表示 */}
      {item.startTime && item.endTime && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-600">
            作業時間: {item.startTime} - {item.endTime}
          </div>
        </div>
      )}
    </div>
  );
} 