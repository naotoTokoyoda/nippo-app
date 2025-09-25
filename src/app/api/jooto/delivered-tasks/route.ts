/**
 * Jooto 納品済みタスク一覧取得エンドポイント
 * GET /api/jooto/delivered-tasks
 */

import { getDeliveredTasks } from '@/lib/jooto-api';
import { prisma } from '@/lib/prisma';

/**
 * 納品済みタスク一覧を取得し、日報データと紐付けて集計情報を返す
 */
export async function GET() {
  try {
    let deliveredTasks = [];

    // Jooto APIから納品済みタスクを取得（フォールバック機能付き）
    try {
      deliveredTasks = await getDeliveredTasks();
    } catch (jootoError) {
      console.warn('Jooto API取得エラー（データベースから集計対象を取得）:', jootoError);
      
      // Jooto APIが利用できない場合は、データベースから集計対象工番を取得
      const workOrders = await prisma.workOrder.findMany({
        where: {
          status: 'aggregating'
        },
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

      // データベースの工番をJootoタスク形式に変換
      deliveredTasks = workOrders.map(workOrder => ({
        taskId: workOrder.id,
        workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
        workNumberFront: workOrder.frontNumber,
        workNumberBack: workOrder.backNumber,
        customerName: workOrder.customer.name,
        workName: workOrder.projectName || workOrder.description || '未設定',
      }));
    }

    // 各タスクの累計時間を計算
    const aggregationItems = await Promise.all(
      deliveredTasks.map(async (task) => {
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
            const startTime = new Date(item.startTime);
            const endTime = new Date(item.endTime);
            const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
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
          totalHours: Math.round(totalHours * 10) / 10, // 小数点第1位まで
          lastUpdated: lastUpdated.getTime() > 0 ? lastUpdated.toISOString().split('T')[0] : null,
          status: 'delivered' as const, // 納品済みステータス
          term: null, // Jootoタスクからは期区分を取得しない
          taskId: task.taskId, // JootoタスクID
        };
      })
    );

    // 全てのタスクを表示（日報データがない場合は累計時間0h）
    return Response.json({
      success: true,
      items: aggregationItems,
      total: aggregationItems.length,
    });

  } catch (error) {
    console.error('Delivered tasks API error:', error);
    
    return Response.json(
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
  return Response.json({ error: 'Method not allowed' }, { status: 405 });
}
