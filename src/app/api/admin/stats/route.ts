import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

// 日本時間の今日の日付を取得
function getTodayJST(): Date {
  const now = new Date();
  const jstOffset = 9 * 60; // JST は UTC+9
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const jstMinutes = utcMinutes + jstOffset;
  
  // 日付変更線を跨いだ場合の調整
  const jstDate = new Date(now);
  if (jstMinutes >= 24 * 60) {
    jstDate.setUTCDate(jstDate.getUTCDate() + 1);
  }
  
  // 時刻部分をリセット
  jstDate.setUTCHours(0, 0, 0, 0);
  
  // JST 0:00 を UTC に変換（UTC 15:00 前日）
  jstDate.setUTCHours(jstDate.getUTCHours() - 9);
  
  return jstDate;
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
    const today = getTodayJST();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const { start: monthStart, end: monthEnd, month } = getMonthRangeJST();
    
    // 並列でデータ取得
    const [
      activeMembers,
      todayReports,
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
      
      // 今日の日報を取得（作業日ベース）
      prisma.report.findMany({
        where: {
          date: {
            gte: today,
            lt: tomorrow,
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
    const submittedUserIds = new Set(todayReports.map(r => r.workerId));
    
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
        todayReports: {
          submitted: submittedUsers.length,
          total: activeMembers.length,
          submittedUsers,
          pendingUsers,
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
      todaySubmitted: submittedUsers.length,
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

