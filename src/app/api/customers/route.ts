import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    return NextResponse.json(customers);

  } catch (error) {
    console.error('顧客一覧取得エラー:', error);
    return NextResponse.json(
      { error: '顧客一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
