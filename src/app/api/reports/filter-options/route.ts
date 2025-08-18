import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          const yearMonth = report.date.toISOString().split('T')[0].substring(0, 7);
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
          category: true,
        },
        distinct: ['category'],
        orderBy: {
          category: 'asc',
        },
      }).then(machines => machines.map(machine => machine.category)),
    ]);

    return NextResponse.json({
      success: true,
      availableMonths,
      uniqueWorkers,
      uniqueCustomerNames,
      uniqueWorkNumbers,
      uniqueMachineTypes,
    });

  } catch (error) {
    console.error('フィルター選択肢取得エラー:', error);
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { 
        success: false, 
        error: 'フィルター選択肢の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
