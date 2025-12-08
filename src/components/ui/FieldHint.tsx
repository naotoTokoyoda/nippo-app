'use client';

import { useState, ReactNode } from 'react';

interface FieldHintProps {
  hint: string;
  children: ReactNode;
}

/**
 * フォーカス時にヒントを表示するラッパーコンポーネント
 * 子要素にフォーカスが当たると、ヒントテキストがフェードイン表示される
 */
export function FieldHint({ hint, children }: FieldHintProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
    >
      {children}
      <p
        className={`text-xs text-gray-500 mt-1 transition-all duration-200 ${
          isFocused 
            ? 'opacity-100 max-h-20' 
            : 'opacity-0 max-h-0 overflow-hidden'
        }`}
      >
        {hint}
      </p>
    </div>
  );
}

