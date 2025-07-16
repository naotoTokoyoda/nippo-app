'use client';

import { getEnvironment } from '@/utils/env';

export default function EnvironmentBadge() {
  const env = getEnvironment();
  
  if (env === 'development') {
    return null; // 開発環境では表示しない
  }
  
  const getBadgeStyle = () => {
    switch (env) {
      case 'staging':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'production':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  
  const getEnvLabel = () => {
    switch (env) {
      case 'staging':
        return 'STAGING';
      case 'production':
        return 'PRODUCTION';
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