import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { auth } from '@/lib/auth/auth';
import { Prisma } from '@prisma/client';

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
    const userId = searchParams.get('userId') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    // フィルタ条件を構築
    const whereConditions: Prisma.AuditLogWhereInput = {};

    if (userId) {
      whereConditions.userId = userId;
    }
    if (startDate || endDate) {
      whereConditions.timestamp = {};
      if (startDate) {
        whereConditions.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        // endDateは当日の終わりまで含める
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereConditions.timestamp.lte = end;
      }
    }

    // 監査ログと操作者一覧を並行取得
    const [logs, total, operators] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereConditions,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereConditions }),
      // 操作者一覧（重複なし）
      prisma.auditLog.findMany({
        select: { userId: true, userName: true },
        distinct: ['userId'],
        orderBy: { userName: 'asc' },
      }),
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
      operators: operators.map(op => ({
        userId: op.userId,
        userName: op.userName,
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
