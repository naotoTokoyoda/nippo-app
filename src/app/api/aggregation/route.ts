import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ListResponse, ApiErrorResponse } from '@/types/api';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { calculateWorkTime, formatUTCToJSTTime } from '@/utils/timeCalculation';

// Prismaが生成する型を使用

// 集計一覧用のクエリパラメータスキーマ
const aggregationListQuerySchema = z.object({
  term: z.string().optional(),
  customer: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['aggregating', 'aggregated']).optional().default('aggregating'),
});

// 集計一覧を取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = {
      term: searchParams.get('term') || undefined,
      customer: searchParams.get('customer') || undefined,
      search: searchParams.get('search') || undefined,
      status: searchParams.get('status') || 'aggregating',
    };

    const validatedParams = aggregationListQuerySchema.parse(queryParams);

    // フィルタ条件を構築
    const whereConditions: Prisma.WorkOrderWhereInput = {
      status: validatedParams.status,
    };

    if (validatedParams.term) {
      whereConditions.term = validatedParams.term;
    }

    if (validatedParams.customer) {
      whereConditions.customer = {
        name: {
          contains: validatedParams.customer,
          mode: 'insensitive',
        },
      };
    }

    if (validatedParams.search) {
      whereConditions.OR = [
        {
          frontNumber: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
        {
          backNumber: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
        {
          projectName: {
            contains: validatedParams.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    // 集計対象の工番を取得
    const workOrders = await prisma.workOrder.findMany({
      where: whereConditions,
      include: {
        customer: true,
        reportItems: {
          include: {
            report: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // 各工番の累計時間を計算
    const aggregationItems = workOrders.map(workOrder => {
      const totalHours = workOrder.reportItems.reduce((total, item) => {
        // 勤務状況を考慮した時間計算を適用
        const hours = calculateWorkTime(
          formatUTCToJSTTime(item.startTime), 
          formatUTCToJSTTime(item.endTime), 
          item.workStatus || undefined
        );
        return total + hours;
      }, 0);

      const lastUpdated = workOrder.reportItems.length > 0
        ? workOrder.reportItems.reduce((latest, item) => {
            return item.report.submittedAt > latest ? item.report.submittedAt : latest;
          }, workOrder.reportItems[0].report.submittedAt)
        : workOrder.updatedAt;

      return {
        id: workOrder.id,
        workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
        customerName: workOrder.customer.name,
        projectName: workOrder.projectName || workOrder.description || '未設定',
        totalHours: Math.round(totalHours * 10) / 10, // 小数点第1位まで
        lastUpdated: lastUpdated.toISOString().split('T')[0], // YYYY-MM-DD形式
        status: workOrder.status,
        term: workOrder.term,
      };
    });

    type AggregationItem = typeof aggregationItems[number];

    return NextResponse.json<ListResponse<AggregationItem>>({
      success: true,
      items: aggregationItems,
      total: aggregationItems.length,
    });

  } catch (error) {
    logger.apiError('/api/aggregation', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json<ApiErrorResponse>(
      { 
        success: false,
        error: '集計一覧の取得に失敗しました' 
      },
      { status: 500 }
    );
  }
}
