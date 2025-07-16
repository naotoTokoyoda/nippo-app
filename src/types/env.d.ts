declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_ENV: 'development' | 'staging' | 'production';
      NODE_ENV: 'development' | 'production';
    }
  }
}

export {}; 