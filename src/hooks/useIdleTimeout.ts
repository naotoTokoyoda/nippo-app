/**
 * 無操作タイムアウト用カスタムフック
 */
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface UseIdleTimeoutOptions {
  /** タイムアウト時間（ミリ秒） */
  timeout: number;
  /** タイムアウト時のコールバック */
  onTimeout?: () => void;
  /** タイムアウト時のリダイレクト先 */
  redirectTo?: string;
  /** 有効/無効 */
  enabled?: boolean;
}

export function useIdleTimeout({
  timeout,
  onTimeout,
  redirectTo = '/',
  enabled = true,
}: UseIdleTimeoutOptions): void {
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    // 既存のタイマーをクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // 新しいタイマーを設定
    timerRef.current = setTimeout(() => {
      if (onTimeout) {
        onTimeout();
      }
      router.push(redirectTo);
    }, timeout);
  }, [enabled, timeout, onTimeout, redirectTo, router]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // 監視するイベント
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // イベントリスナーを追加
    events.forEach((event) => {
      document.addEventListener(event, resetTimer, { passive: true });
    });

    // 初期タイマーを開始
    resetTimer();

    // クリーンアップ
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach((event) => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, resetTimer]);
}

