import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 日本時間の昨日の日付を取得
function getYesterdayJST(): { start: Date; end: Date; month: number; day: number } {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒で
  const jstNow = new Date(now.getTime() + jstOffset);
  
  // 昨日の日付を計算
  const yesterday = new Date(jstNow);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  
  const year = yesterday.getUTCFullYear();
  const month = yesterday.getUTCMonth(); // 0-indexed
  const day = yesterday.getUTCDate();
  
  // 昨日の0:00（JST）
  const startJST = new Date(Date.UTC(year, month, day));
  // 今日の0:00（JST）
  const endJST = new Date(Date.UTC(year, month, day + 1));
  
  // UTC に変換
  const start = new Date(startJST.getTime() - jstOffset);
  const end = new Date(endJST.getTime() - jstOffset);
  
  return { start, end, month: month + 1, day }; // 月は1-indexed で返す
}

// 今月の開始日と終了日を取得（JST）
function getMonthRangeJST(): { start: Date; end: Date; month: number } {
  const now = new Date();
  const jstOffset = 9 * 60 * 60 * 1000; // 9時間をミリ秒で
  const jstNow = new Date(now.getTime() + jstOffset);
  
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth(); // 0-indexed
  
  // 月初（JST）
  const startJST = new Date(Date.UTC(year, month, 1));
  // 月末（JST）- 翌月1日
  const endJST = new Date(Date.UTC(year, month + 1, 1));
  
  // UTC に変換（JST 0:00 = UTC 前日 15:00）
  const start = new Date(startJST.getTime() - jstOffset);
  const end = new Date(endJST.getTime() - jstOffset);
  
  return { start, end, month: month + 1 }; // 月は1-indexed で返す
}

// GET: ダッシュボード統計情報取得
export async function GET() {
  try {
    const { start: yesterdayStart, end: yesterdayEnd, month: targetMonth, day: targetDay } = getYesterdayJST();
    const { start: monthStart, end: monthEnd, month } = getMonthRangeJST();
    
    // 並列でデータ取得
    const [
      activeMembers,
      yesterdayReports,
      monthlyReportCount,
      aggregatingWorkOrderCount,
    ] = await Promise.all([
      // アクティブなメンバー（作業者）を取得
      prisma.user.findMany({
        where: {
          role: 'member',
          isActive: true,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          name: 'asc',
        },
      }),
      
      // 昨日の日報を取得（作業日ベース）
      prisma.report.findMany({
        where: {
          date: {
            gte: yesterdayStart,
            lt: yesterdayEnd,
          },
        },
        select: {
          workerId: true,
          worker: {
            select: {
              name: true,
            },
          },
        },
      }),
      
      // 今月の日報件数
      prisma.report.count({
        where: {
          date: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      }),
      
      // 集計中の工番数
      prisma.workOrder.count({
        where: {
          status: 'aggregating',
        },
      }),
    ]);
    
    // 提出済みユーザーIDのセット
    const submittedUserIds = new Set(yesterdayReports.map(r => r.workerId));
    
    // 提出済み・未提出ユーザーを分類
    const submittedUsers: string[] = [];
    const pendingUsers: string[] = [];
    
    for (const member of activeMembers) {
      if (submittedUserIds.has(member.id)) {
        submittedUsers.push(member.name);
      } else {
        pendingUsers.push(member.name);
      }
    }
    
    const response = {
      success: true,
      data: {
        reportStatus: {
          submitted: submittedUsers.length,
          total: activeMembers.length,
          submittedUsers,
          pendingUsers,
          targetMonth,
          targetDay,
        },
        monthlyReports: {
          count: monthlyReportCount,
          month,
        },
        aggregatingWorkOrders: {
          count: aggregatingWorkOrderCount,
        },
      },
    };
    
    logger.info('Admin stats fetched successfully', {
      targetDate: `${targetMonth}/${targetDay}`,
      submitted: submittedUsers.length,
      totalMembers: activeMembers.length,
      monthlyReports: monthlyReportCount,
      aggregatingWorkOrders: aggregatingWorkOrderCount,
    });
    
    return NextResponse.json(response);
  } catch (error) {
    logger.apiError('/api/admin/stats [GET]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      {
        success: false,
        error: 'ダッシュボード統計情報の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
