'use client';

import { useState } from 'react';

interface HelpTooltipProps {
  content: string;
  className?: string;
}

/**
 * ヘルプアイコン付きツールチップコンポーネント
 * ホバーまたはクリックで説明を表示
 */
export function HelpTooltip({ content, className = '' }: HelpTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <span className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        className="ml-1 text-gray-400 hover:text-blue-500 focus:outline-none transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
        aria-label="ヘルプ"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {isVisible && (
        <div className="absolute z-50 left-6 top-0 w-64 p-2 text-xs text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg">
          {content}
          <div className="absolute -left-1.5 top-2 w-3 h-3 bg-white border-l border-t border-gray-200 transform rotate-[-45deg]" />
        </div>
      )}
    </span>
  );
}

