/**
 * 集計完了一覧取得エンドポイント
 * GET /api/aggregation/history
 * status='aggregated'の案件を取得（ページネーション対応）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApiErrorResponse } from '@/types/api';
import { z } from 'zod';
import { calculateWorkTime, formatUTCToJSTTime } from '@/utils/timeCalculation';
import { Prisma } from '@prisma/client';

// クエリパラメータのバリデーションスキーマ
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(50),
  search: z.string().optional(),
});

// レスポンスの型定義
interface AggregatedWorkOrder {
  id: string;
  workNumber: string;
  customerName: string;
  projectName: string;
  totalHours: number;
  completedAt: string;
  term: string | null;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

interface HistoryResponse {
  success: boolean;
  items: AggregatedWorkOrder[];
  pagination: PaginationInfo;
}

/**
 * 集計完了一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータのバリデーション
    const params = querySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
      search: searchParams.get('search') || undefined,
    });

    // フィルタ条件を構築
    const whereCondition: Prisma.WorkOrderWhereInput = {
      status: 'aggregated',
    };

    // 工番検索（前番-後番）
    if (params.search) {
      const searchTerm = params.search.trim();
      whereCondition.OR = [
        {
          frontNumber: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        {
          backNumber: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
      ];
    }

    // 総件数を取得
    const totalItems = await prisma.workOrder.count({
      where: whereCondition,
    });

    // ページネーション計算
    const totalPages = Math.ceil(totalItems / params.limit);
    const skip = (params.page - 1) * params.limit;

    // 集計完了案件を取得
    const workOrders = await prisma.workOrder.findMany({
      where: whereCondition,
      include: {
        customer: {
          select: {
            name: true,
          },
        },
        reportItems: {
          select: {
            startTime: true,
            endTime: true,
            workStatus: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // 完了日時の新しい順
      },
      skip,
      take: params.limit,
    });

    // レスポンス用にデータを整形
    const items: AggregatedWorkOrder[] = workOrders.map((workOrder) => {
      // 累計時間を計算
      let totalMinutes = 0;
      for (const item of workOrder.reportItems) {
        const startTime = formatUTCToJSTTime(item.startTime);
        const endTime = formatUTCToJSTTime(item.endTime);
        const workMinutes = calculateWorkTime(
          startTime,
          endTime,
          item.workStatus || 'normal'
        );
        totalMinutes += workMinutes;
      }
      const totalHours = totalMinutes / 60;

      return {
        id: workOrder.id,
        workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
        customerName: workOrder.customer.name,
        projectName: workOrder.projectName || '-',
        totalHours,
        completedAt: workOrder.updatedAt.toISOString(),
        term: workOrder.term,
      };
    });

    const response: HistoryResponse = {
      success: true,
      items,
      pagination: {
        currentPage: params.page,
        totalPages,
        totalItems,
        itemsPerPage: params.limit,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.apiError('/api/aggregation/history', error instanceof Error ? error : new Error('Unknown error'));
    
    return NextResponse.json<ApiErrorResponse>(
      { 
        success: false, 
        error: 'サーバーエラーが発生しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * 許可されていないメソッドの処理
 */
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

