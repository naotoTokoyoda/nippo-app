import { useState, useEffect } from 'react';

interface UseCountdownOptions {
  initialCount?: number;
  onComplete?: () => void;
  interval?: number;
}

export function useCountdown({
  initialCount = 3,
  onComplete,
  interval = 1000,
}: UseCountdownOptions = {}) {
  const [count, setCount] = useState(initialCount);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive && count > 0) {
      timer = setTimeout(() => {
        setCount(prev => prev - 1);
      }, interval);
    } else if (isActive && count === 0) {
      setIsActive(false);
      onComplete?.();
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [isActive, count, interval, onComplete]);

  const start = () => {
    setCount(initialCount);
    setIsActive(true);
  };

  const stop = () => {
    setIsActive(false);
  };

  const reset = () => {
    setCount(initialCount);
    setIsActive(false);
  };

  return {
    count,
    isActive,
    start,
    stop,
    reset,
  };
}
