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
    }
  }
}

export {}; 