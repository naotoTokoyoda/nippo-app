import { useState, useEffect } from 'react';
import { getEnvironment } from '@/utils/env';

export function useEnvironment() {
  const [isDevelopment, setIsDevelopment] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [environment, setEnvironment] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
    const env = getEnvironment();
    setEnvironment(env);
    setIsDevelopment(env === 'development' || env === 'local');
  }, []);

  return {
    isDevelopment,
    isClient,
    environment,
  };
}
