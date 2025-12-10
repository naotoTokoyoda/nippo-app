/**
 * NextAuth.js 型定義の拡張
 */
import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    name: string;
    email: string | null;
    role: string;
  }

  interface Session {
    user: {
      id: string;
      name: string;
      email: string | null;
      role: string;
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: string;
  }
}

