import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types/api';
import dayjs from 'dayjs';

export async function GET() {
  try {
    // 並行して各フィルター選択肢を取得
    const [
      availableMonths,
      uniqueWorkers,
      uniqueCustomerNames,
      uniqueWorkNumbers,
      uniqueMachineTypes,
    ] = await Promise.all([
      // 利用可能な年月を取得（重複除去）
      prisma.report.findMany({
        select: {
          date: true,
        },
        distinct: ['date'],
        orderBy: {
          date: 'asc', // 昇順に変更
        },
      }).then(reports => {
        const months = new Set<string>();
        reports.forEach(report => {
          const yearMonth = dayjs(report.date).format('YYYY-MM');
          months.add(yearMonth);
        });
        return Array.from(months).sort(); // 昇順でソート
      }),

      // ユニークな作業者名を取得
      prisma.user.findMany({
        select: {
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }).then(users => users.map(user => user.name)),

      // ユニークな客先名を取得
      prisma.customer.findMany({
        select: {
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }).then(customers => customers.map(customer => customer.name)),

      // ユニークな工番（前番）を取得
      prisma.workOrder.findMany({
        select: {
          frontNumber: true,
        },
        distinct: ['frontNumber'],
        orderBy: {
          frontNumber: 'asc',
        },
      }).then(workOrders => workOrders.map(wo => wo.frontNumber)),

      // ユニークな機械種類を取得
      prisma.machine.findMany({
        select: {
          name: true,
        },
        distinct: ['name'],
        where: {
          isActive: true,
        },
        orderBy: {
          name: 'asc',
        },
      }).then(machines => machines.map(machine => machine.name)),
    ]);

    type FilterOptions = {
      availableMonths: string[];
      uniqueWorkers: string[];
      uniqueCustomerNames: string[];
      uniqueWorkNumbers: string[];
      uniqueMachineTypes: string[];
    };

    return NextResponse.json<ApiSuccessResponse<FilterOptions>>({
      success: true,
      data: {
        availableMonths,
        uniqueWorkers,
        uniqueCustomerNames,
        uniqueWorkNumbers,
        uniqueMachineTypes,
      }
    });

  } catch (error) {
    logger.apiError('/api/reports/filter-options', error instanceof Error ? error : new Error('Unknown error'), {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json<ApiErrorResponse>(
      { 
        success: false, 
        error: 'フィルター選択肢の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
