import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Tailwind CSS クラス名を結合・整理するユーティリティ関数
 * clsx と tailwind-merge を組み合わせて使用
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 条件付きクラス名を生成するヘルパー関数
 */
export function conditionalClass(
  baseClass: string,
  condition: boolean,
  trueClass?: string,
  falseClass?: string
): string {
  return cn(baseClass, condition ? trueClass : falseClass);
}

/**
 * 複数の条件付きクラス名を生成するヘルパー関数
 */
export function conditionalClasses(
  baseClass: string,
  conditions: Record<string, boolean>
): string {
  const conditionalClassNames = Object.entries(conditions)
    .filter(([, condition]) => condition)
    .map(([className]) => className);
  
  return cn(baseClass, ...conditionalClassNames);
}
