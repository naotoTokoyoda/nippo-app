'use client';

import { useState, useEffect, useRef } from 'react';
import { WorkNumberSearchResult } from '@/types/jooto';

interface WorkNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onWorkInfoSelect?: (customerName: string, workName: string) => void;
  className?: string;
  placeholder?: string;
}

export default function WorkNumberInput({
  value,
  onChange,
  onWorkInfoSelect,
  className = '',
  placeholder = '工番を入力'
}: WorkNumberInputProps) {
  const [suggestions, setSuggestions] = useState<WorkNumberSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // 工番検索の実行
  const searchWorkNumber = async (workNumber: string) => {
    if (!workNumber.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/jooto/search?workNumber=${encodeURIComponent(workNumber)}`);
      const result = await response.json();

      if (result.success && result.data) {
        setSuggestions(result.data);
        setShowSuggestions(result.data.length > 0);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('工番検索エラー:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 入力値変更時の処理
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // 既存のタイマーをクリア
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // デバウンス処理（500ms後に検索実行）
    const timeout = setTimeout(() => {
      searchWorkNumber(newValue);
    }, 500);

    setSearchTimeout(timeout);
  };

  // 候補選択時の処理
  const handleSuggestionSelect = (suggestion: WorkNumberSearchResult) => {
    onChange(suggestion.workNumber);
    setShowSuggestions(false);
    
    // 親コンポーネントに客先名・作業名称を通知
    if (onWorkInfoSelect) {
      onWorkInfoSelect(suggestion.customerName, suggestion.workName);
    }
  };

  // 外部クリック時に候補を非表示
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current && 
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // コンポーネントのクリーンアップ
  useEffect(() => {
    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchTimeout]);

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          className={className}
          placeholder={placeholder}
        />
        
        {/* ローディングインジケーター */}
        {isLoading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <svg 
              className="animate-spin h-4 w-4 text-blue-600" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* 候補リスト */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.taskId}-${index}`}
              type="button"
              onClick={() => handleSuggestionSelect(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-blue-50 focus:bg-blue-50 focus:outline-none border-b border-gray-100 last:border-b-0"
            >
              <div className="flex flex-col">
                <div className="font-medium text-gray-900">
                  {suggestion.workNumber}
                </div>
                {suggestion.customerName && (
                  <div className="text-sm text-blue-600">
                    客先: {suggestion.customerName}
                  </div>
                )}
                {suggestion.workName && (
                  <div className="text-sm text-gray-600">
                    作業: {suggestion.workName}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 検索結果なしのメッセージ */}
      {showSuggestions && suggestions.length === 0 && !isLoading && value.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          <div className="px-3 py-2 text-sm text-gray-500">
            「{value}」に一致する工番が見つかりませんでした
          </div>
        </div>
      )}
    </div>
  );
}
