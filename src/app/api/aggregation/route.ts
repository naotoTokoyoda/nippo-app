import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

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
        const startTime = new Date(item.startTime);
        const endTime = new Date(item.endTime);
        const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
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

    return NextResponse.json({
      items: aggregationItems,
      total: aggregationItems.length,
    });

  } catch (error) {
    console.error('集計一覧取得エラー:', error);
    return NextResponse.json(
      { error: '集計一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
