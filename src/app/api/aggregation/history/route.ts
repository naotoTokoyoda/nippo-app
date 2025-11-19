/**
 * 集計完了一覧取得エンドポイント
 * GET /api/aggregation/history
 * status='aggregated'の案件を取得（ページネーション対応）
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApiErrorResponse } from '@/types/api';
import { calculateWorkTime, formatUTCToJSTTime } from '@/utils/timeCalculation';
import { Prisma } from '@prisma/client';
import { aggregationHistoryQuerySchema } from '@/lib/validation/aggregation';

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
 * 期間フィルタの日付範囲を計算
 */
function calculateDateRange(periodType?: string, startDate?: string, endDate?: string): { start?: Date; end?: Date } | null {
  if (!periodType) return null;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  switch (periodType) {
    case 'month': {
      // 今月（1日〜月末）
      const start = new Date(currentYear, currentMonth, 1);
      const end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);
      return { start, end };
    }
    case 'year': {
      // 今年度（4月1日〜3月31日）
      const fiscalYear = currentMonth >= 3 ? currentYear : currentYear - 1;
      const start = new Date(fiscalYear, 3, 1); // 4月1日
      const end = new Date(fiscalYear + 1, 2, 31, 23, 59, 59, 999); // 3月31日
      return { start, end };
    }
    case 'all':
      // 全期間（フィルタなし）
      return null;
    case 'custom': {
      // カスタム範囲
      if (!startDate || !endDate) return null;
      
      const [startYear, startMonth] = startDate.split('-').map(Number);
      const [endYear, endMonth] = endDate.split('-').map(Number);
      
      const start = new Date(startYear, startMonth - 1, 1);
      const end = new Date(endYear, endMonth, 0, 23, 59, 59, 999);
      
      return { start, end };
    }
    default:
      return null;
  }
}

/**
 * 集計完了一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータのバリデーション
    const params = aggregationHistoryQuerySchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '50',
      search: searchParams.get('search') || undefined,
      customerName: searchParams.get('customerName') || undefined,
      periodType: searchParams.get('periodType') || undefined,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sortBy: searchParams.get('sortBy') || undefined,
      sortOrder: searchParams.get('sortOrder') || 'desc',
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

    // 顧客名検索
    if (params.customerName) {
      whereCondition.customer = {
        name: {
          contains: params.customerName.trim(),
          mode: 'insensitive',
        },
      };
    }

    // 期間フィルタ
    const dateRange = calculateDateRange(params.periodType, params.startDate, params.endDate);
    if (dateRange) {
      whereCondition.updatedAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    // 総件数を取得
    const totalItems = await prisma.workOrder.count({
      where: whereCondition,
    });

    // ページネーション計算
    const totalPages = Math.ceil(totalItems / params.limit);
    const skip = (params.page - 1) * params.limit;

    // ソート条件を構築
    let orderBy: Prisma.WorkOrderOrderByWithRelationInput | Prisma.WorkOrderOrderByWithRelationInput[] = {
      updatedAt: 'desc', // デフォルト: 完了日時の新しい順
    };

    if (params.sortBy === 'workNumber') {
      orderBy = [
        { frontNumber: params.sortOrder },
        { backNumber: params.sortOrder },
      ];
    } else if (params.sortBy === 'completedAt') {
      orderBy = { updatedAt: params.sortOrder };
    }
    // totalHoursはDB上のフィールドではないので、取得後にソート

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
      orderBy,
      skip,
      take: params.limit,
    });

    // レスポンス用にデータを整形
    const items: AggregatedWorkOrder[] = workOrders.map((workOrder) => {
      // 累計時間を計算
      let totalHours = 0;
      for (const item of workOrder.reportItems) {
        const startTime = formatUTCToJSTTime(item.startTime);
        const endTime = formatUTCToJSTTime(item.endTime);
        const workHours = calculateWorkTime(
          startTime,
          endTime,
          item.workStatus || 'normal'
        );
        totalHours += workHours;
      }

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

    // 累計時間でソートする場合はここで実施
    if (params.sortBy === 'totalHours') {
      items.sort((a, b) => {
        const diff = a.totalHours - b.totalHours;
        return params.sortOrder === 'asc' ? diff : -diff;
      });
    }

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

