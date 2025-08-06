'use client';

import { useState, useEffect } from 'react';
import { WorkItemData } from './DailyReport';
import { ValidationError } from '@/utils/validation';
import { generateTimeOptions } from '@/utils/timeCalculation';
import { validateWorkItem } from '@/utils/validation';
import ClientNameInput from './ClientNameInput';

interface WorkItemProps {
  item: WorkItemData;
  index: number;
  onUpdate: (updates: Partial<WorkItemData>) => void;
  onRemove: () => void;
  showValidation?: boolean;
}

export default function WorkItem({ item, index, onUpdate, onRemove, showValidation = false }: WorkItemProps) {
  // 現場のメイン稼働時間（8:00-17:00）とその他に分ける
  const mainWorkTimes = generateTimeOptions(8, 17).filter(time => {
    const [hour, minute] = time.split(':').map(Number);
    return hour < 17 || (hour === 17 && minute === 0);
  }); // 8:00-17:00まで
  const otherTimes = [
    ...generateTimeOptions(0, 7),   // 0:00-7:45
    ...generateTimeOptions(17, 17).filter(time => time !== '17:00'), // 17:15, 17:30, 17:45
    ...generateTimeOptions(18, 23)  // 18:00-23:45
  ];

  const [errors, setErrors] = useState<ValidationError[]>([]);

  // バリデーション実行
  useEffect(() => {
    // 開始時間と終了時間の両方が入力されている場合、またはshowValidationがtrueの場合にバリデーションを実行
    if (showValidation || (item.startTime && item.endTime)) {
      const validation = validateWorkItem(item);
      if (!validation.success && validation.errors) {
        setErrors(validation.errors);
      } else {
        setErrors([]);
      }
    } else {
      setErrors([]);
    }
  }, [item, showValidation]);

  // エラーメッセージを取得
  const getErrorMessage = (fieldName: string): string | null => {
    const error = errors.find(err => err.field === fieldName);
    return error ? error.message : null;
  };

  // フィールドにエラークラスを適用
  const getFieldClassName = (fieldName: string, baseClassName: string): string => {
    const hasError = errors.some(err => err.field === fieldName);
    return hasError 
      ? `${baseClassName} border-red-500 focus:ring-red-500` 
      : baseClassName;
  };

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
          <ClientNameInput
            value={item.customerName}
            onChange={(value) => onUpdate({ customerName: value })}
            placeholder="客先名を入力"
            className={getFieldClassName('customerName', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          />
          <p className="text-xs text-gray-500 mt-1">客先名のない作業は「クオール市原」とご記入ください。</p>
          {getErrorMessage('customerName') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('customerName')}</p>
          )}
        </div>

        {/* 工番（前番） */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            工番（前番）
          </label>
          <select
            value={item.workNumberFront}
            onChange={(e) => onUpdate({ workNumberFront: e.target.value })}
            className={getFieldClassName('workNumberFront', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          >
            <option value=""></option>
            <option value="5927">5927（前期）</option>
            <option value="6028">6028（当期）</option>
            <option value="6129">6129（次期）</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">どちらかを選択してください。</p>
          {getErrorMessage('workNumberFront') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('workNumberFront')}</p>
          )}
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
            className={getFieldClassName('workNumberBack', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          />
          <p className="text-xs text-gray-500 mt-1">工番のない作業は「なし」とご記入ください。</p>
          {getErrorMessage('workNumberBack') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('workNumberBack')}</p>
          )}
        </div>

        {/* 作業名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業名称
          </label>
          <input
            type="text"
            value={item.name}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className={getFieldClassName('name', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          />
          <p className="text-xs text-gray-500 mt-1">工番表と同じ名称をご記入ください。</p>
          {getErrorMessage('name') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('name')}</p>
          )}
        </div>

        {/* 作業開始時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業開始時間
          </label>
          <select
            value={item.startTime}
            onChange={(e) => onUpdate({ startTime: e.target.value })}
            className={getFieldClassName('startTime', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          >
            <option value=""></option>
            <optgroup label="メイン稼働時間 (8:00-17:00)">
              {mainWorkTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </optgroup>
            <optgroup label="その他 (0:00-7:45, 17:00-23:45)">
              {otherTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </optgroup>
          </select>
          {getErrorMessage('startTime') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('startTime')}</p>
          )}
        </div>

        {/* 作業終了時間 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業終了時間
          </label>
          <select
            value={item.endTime}
            onChange={(e) => onUpdate({ endTime: e.target.value })}
            className={getFieldClassName('endTime', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          >
            <option value=""></option>
            <optgroup label="メイン稼働時間 (8:00-17:00)">
              {mainWorkTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </optgroup>
            <optgroup label="その他 (0:00-7:45, 17:00-23:45)">
              {otherTimes.map(time => (
                <option key={time} value={time}>{time}</option>
              ))}
            </optgroup>
          </select>
          {getErrorMessage('endTime') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('endTime')}</p>
          )}
        </div>

        {/* 機械種類 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            機械種類
          </label>
          <select
            value={item.machineType}
            onChange={(e) => onUpdate({ machineType: e.target.value })}
            className={getFieldClassName('machineType', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
          >
            <option value=""></option>
            <option value="旋盤">旋盤</option>
            <option value="フライス盤">フライス盤</option>
            <option value="ボール盤">ボール盤</option>
            <option value="研削盤">研削盤</option>
            <option value="その他">その他</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">作業時間を明確にするため、使用した機械の記入を必ずお願いします。</p>
          {getErrorMessage('machineType') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('machineType')}</p>
          )}
        </div>

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            備考
          </label>
          <textarea
            value={item.remarks}
            onChange={(e) => onUpdate({ remarks: e.target.value })}
            rows={1}
            className={getFieldClassName('remarks', "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500")}
            style={{ color: item.remarks ? '#111827' : '#6b7280' }}
          />
          <p className="text-xs text-gray-500 mt-1">
            昼残の場合は「昼残」と記入してください。昼残時間は自動的に差し引かれます。
          </p>
          {getErrorMessage('remarks') && (
            <p className="text-xs text-red-600 mt-1">{getErrorMessage('remarks')}</p>
          )}
        </div>
      </div>

      {/* 作業時間の表示 */}
      {item.startTime && item.endTime && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="text-sm text-gray-600">
            作業時間: {item.startTime} - {item.endTime}
          </div>
          {/* isValidTimeIncrementとisZeroWorkTimeは削除されたため、この部分は削除 */}
        </div>
      )}
    </div>
  );
} 