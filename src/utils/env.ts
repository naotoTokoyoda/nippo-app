export const getEnvironment = () => {
  return process.env.NEXT_PUBLIC_ENV || 'development';
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
      return 'https://nippo-app-staging.vercel.app/api';
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
      return 'https://nippo-app-staging.vercel.app';
    case 'production':
      return 'https://nippo-app.vercel.app';
    default:
      return 'http://localhost:3000';
  }
}; 