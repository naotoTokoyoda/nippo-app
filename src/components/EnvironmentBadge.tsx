'use client';

import { useState, useEffect } from 'react';
import { getEnvironment } from '@/utils/env';

export default function EnvironmentBadge() {
  const [env, setEnv] = useState<string>('development');
  
  useEffect(() => {
    setEnv(getEnvironment());
  }, []);
  
  // 本番環境ではバッジを表示しない
  if (env === 'production') {
    return null;
  }
  
  const getBadgeStyle = () => {
    switch (env) {
      case 'local':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'development':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getEnvLabel = () => {
    switch (env) {
      case 'local':
        return 'LOCAL';
      case 'staging':
        return 'STAGING';
      case 'development':
        return 'DEVELOPMENT';
      default:
        return 'UNKNOWN';
    }
  };
  
  return (
    <div className={`fixed top-4 right-4 z-50 px-3 py-1 text-xs font-bold rounded-full border ${getBadgeStyle()}`}>
      {getEnvLabel()}
    </div>
  );
} 