declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_ENV: 'development' | 'staging' | 'production';
      NODE_ENV: 'development' | 'production';
      DATABASE_URL: string;
      RESEND_API_KEY?: string;
      RESEND_FROM_EMAIL?: string;
      FEEDBACK_RECIPIENT_EMAIL?: string;
      LOG_LEVEL?: string;
      JOOTO_API_KEY?: string;
      JOOTO_BOARD_ID?: string;
      // NextAuth.js
      AUTH_SECRET?: string;
      AUTH_URL?: string;
      // 旧認証（非推奨）
      BASIC_AUTH_USER?: string;
      BASIC_AUTH_PASSWORD?: string;
      AGGREGATION_PASSWORD?: string;
    }
  }
}

export {}; 