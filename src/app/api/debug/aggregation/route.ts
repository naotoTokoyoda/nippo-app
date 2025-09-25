/**
 * 集計一覧デバッグ用エンドポイント
 * GET /api/debug/aggregation
 */

import { getDeliveredTasks } from '@/lib/jooto-api';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        JOOTO_API_KEY: process.env.JOOTO_API_KEY ? '***設定済み***' : '未設定',
        JOOTO_BOARD_ID: process.env.JOOTO_BOARD_ID || '未設定',
        JOOTO_DELIVERED_LIST_ID: process.env.JOOTO_DELIVERED_LIST_ID || '未設定',
        JOOTO_AGGREGATING_LIST_ID: process.env.JOOTO_AGGREGATING_LIST_ID || '未設定',
        DATABASE_URL: process.env.DATABASE_URL ? '***設定済み***' : '未設定',
      },
      tests: {}
    };

    // 1. Jooto APIテスト
    try {
      const deliveredTasks = await getDeliveredTasks();
      debugInfo.tests.jootoAPI = {
        success: true,
        count: deliveredTasks.length,
        data: deliveredTasks.slice(0, 3) // 最初の3件のみ表示
      };
    } catch (error) {
      debugInfo.tests.jootoAPI = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 2. データベーステスト
    try {
      const workOrderCount = await prisma.workOrder.count();
      const reportItemCount = await prisma.reportItem.count();
      
      debugInfo.tests.database = {
        success: true,
        workOrderCount,
        reportItemCount
      };
    } catch (error) {
      debugInfo.tests.database = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // 3. 集計一覧APIテスト
    try {
      const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/aggregation`);
      const data = await response.json();
      
      debugInfo.tests.aggregationAPI = {
        success: response.ok,
        status: response.status,
        data: data
      };
    } catch (error) {
      debugInfo.tests.aggregationAPI = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return Response.json(debugInfo);

  } catch (error) {
    return Response.json(
      { 
        error: 'デバッグ情報の取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
