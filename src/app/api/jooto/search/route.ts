/**
 * Jooto API工番検索エンドポイント
 * GET /api/jooto/search?workNumber=工番
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchWorkNumberInfo } from '@/lib/jooto-api';
import { logger } from '@/lib/logger';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types/api';
import { searchParamsSchema } from '@/lib/validation/jooto';

/**
 * 工番検索API
 */
export async function GET(request: NextRequest) {
  try {
    // クエリパラメータを取得
    const { searchParams } = new URL(request.url);
    const workNumber = searchParams.get('workNumber');

    logger.info(`Jooto search request: workNumber=${workNumber}`);

    // バリデーション
    const validation = searchParamsSchema.safeParse({ workNumber });
    if (!validation.success) {
      logger.warn(`Jooto search validation failed: ${validation.error.issues[0].message}`);
      return NextResponse.json<ApiErrorResponse>(
        { 
          success: false, 
          error: validation.error.issues[0].message 
        },
        { status: 400 }
      );
    }

    // 環境変数の確認
    const hasApiKey = !!process.env.JOOTO_API_KEY;
    const hasBoardId = !!process.env.JOOTO_BOARD_ID;
    logger.info(`Jooto API config: hasApiKey=${hasApiKey}, hasBoardId=${hasBoardId}`);

    // Jooto APIで検索実行
    const results = await searchWorkNumberInfo(validation.data.workNumber);
    logger.info(`Jooto search results: count=${results.length}`);

    type SearchResult = {
      data: typeof results;
      count: number;
    };

    return NextResponse.json<ApiSuccessResponse<SearchResult>>({
      success: true,
      data: {
        data: results,
        count: results.length
      }
    });

  } catch (error) {
    logger.apiError('/api/jooto/search', error instanceof Error ? error : new Error('Unknown error'));
    
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
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method not allowed' },
    { status: 405 }
  );
}
