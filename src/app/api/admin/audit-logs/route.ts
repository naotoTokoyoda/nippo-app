import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth/auth';

// 監査ログ一覧を取得
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth();
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;

    // フィルタ条件を構築
    const whereConditions: {
      action?: string;
      resourceType?: string;
    } = {};

    if (action) {
      whereConditions.action = action;
    }
    if (resourceType) {
      whereConditions.resourceType = resourceType;
    }

    // 監査ログを取得
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereConditions }),
    ]);

    return NextResponse.json({
      success: true,
      items: logs.map(log => ({
        id: log.id,
        timestamp: log.timestamp.toISOString(),
        userId: log.userId,
        userName: log.userName,
        action: log.action,
        resourceType: log.resourceType,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    logger.apiError('/api/admin/audit-logs', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: '監査ログの取得に失敗しました' },
      { status: 500 }
    );
  }
}
