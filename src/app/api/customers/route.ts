import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApiErrorResponse } from '@/types/api';

type Customer = {
  id: string;
  name: string;
  code: string;
};

// 顧客一覧を取得
export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json<Customer[]>(customers);

  } catch (error) {
    logger.apiError('/api/customers', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json<ApiErrorResponse>(
      { 
        success: false,
        error: '顧客一覧の取得に失敗しました' 
      },
      { status: 500 }
    );
  }
}
