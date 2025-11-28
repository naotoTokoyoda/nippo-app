import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

/**
 * GET: 有効なユーザー一覧を取得
 * 日報入力の作業者名ドロップダウンで使用
 */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: users,
    });
  } catch (error) {
    logger.apiError('/api/users [GET]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ユーザー一覧の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}

