export const getEnvironment = () => {
  // 環境変数の優先順位
  if (process.env.NEXT_PUBLIC_ENV_DEVELOPMENT) {
    return process.env.NEXT_PUBLIC_ENV_DEVELOPMENT;
  }
  if (process.env.NEXT_PUBLIC_ENV_STAGING) {
    return process.env.NEXT_PUBLIC_ENV_STAGING;
  }
  if (process.env.NEXT_PUBLIC_ENV_PRODUCTION) {
    return process.env.NEXT_PUBLIC_ENV_PRODUCTION;
  }
  return 'development';
};

export const isDevelopment = () => {
  return getEnvironment() === 'development';
};

export const isStaging = () => {
  return getEnvironment() === 'staging';
};

export const isProduction = () => {
  return getEnvironment() === 'production';
};

export const getApiUrl = () => {
  const env = getEnvironment();
  
  switch (env) {
    case 'development':
      return 'http://localhost:3000/api';
    case 'staging':
      return 'https://nippo-app-stg.vercel.app/api';
    case 'production':
      return 'https://nippo-app.vercel.app/api';
    default:
      return 'http://localhost:3000/api';
  }
};

export const getAppUrl = () => {
  const env = getEnvironment();
  
  switch (env) {
    case 'development':
      return 'http://localhost:3000';
    case 'staging':
      return 'https://nippo-app-stg.vercel.app';
    case 'production':
      return 'https://nippo-app.vercel.app';
    default:
      return 'http://localhost:3000';
  }
}; 