/**
 * Jooto 集計タスク一覧取得エンドポイント
 * GET /api/jooto/delivered-tasks
 * 3つのリスト（納品済み、集計中、Freee納品書登録済み）すべてのタスクを取得
 */

import { NextResponse } from 'next/server';
import { getAllAggregationTasks } from '@/lib/jooto-api';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { ListResponse, ApiErrorResponse } from '@/types/api';
import { calculateWorkTime, formatUTCToJSTTime } from '@/utils/timeCalculation';

/**
 * 集計タスク一覧を取得し、日報データと紐付けて集計情報を返す
 */
export async function GET() {
  try {

    // Jooto APIから3つのリストすべてのタスクを取得
    const allTasks = await getAllAggregationTasks();

    // 各タスクの累計時間を計算
    const aggregationItems = await Promise.all(
      allTasks.map(async (task) => {
        // 工番で既存の日報データを検索
        const workOrders = await prisma.workOrder.findMany({
          where: {
            frontNumber: task.workNumberFront,
            backNumber: task.workNumberBack,
          },
          include: {
            customer: true,
            reportItems: {
              include: {
                report: true,
              },
            },
          },
        });

        // 累計時間を計算
        let totalHours = 0;
        let lastUpdated = new Date(0); // デフォルトは1970年

        for (const workOrder of workOrders) {
          for (const item of workOrder.reportItems) {
            // 勤務状況を考慮した時間計算を適用
            const hours = calculateWorkTime(
              formatUTCToJSTTime(item.startTime), 
              formatUTCToJSTTime(item.endTime), 
              item.workStatus || undefined
            );
            totalHours += hours;

            // 最終更新日を更新
            if (item.report.submittedAt > lastUpdated) {
              lastUpdated = item.report.submittedAt;
            }
          }
        }

        return {
          id: `jooto-${task.taskId}`, // 一意なIDを生成
          workNumber: task.workNumber,
          customerName: task.customerName,
          projectName: task.workName,
          totalHours: totalHours,
          lastUpdated: lastUpdated.getTime() > 0 ? lastUpdated.toISOString().split('T')[0] : null,
          status: task.status, // Jootoリストに応じたステータス
          term: null, // Jootoタスクからは期区分を取得しない
          taskId: task.taskId, // JootoタスクID
        };
      })
    );

    type AggregationItem = typeof aggregationItems[number];

    // 全てのタスクを表示（日報データがない場合は累計時間0h）
    return NextResponse.json<ListResponse<AggregationItem>>({
      success: true,
      items: aggregationItems,
      total: aggregationItems.length,
    });

  } catch (error) {
    logger.apiError('/api/jooto/delivered-tasks', error instanceof Error ? error : new Error('Unknown error'));
    
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
