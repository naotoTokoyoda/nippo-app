import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { ApiSuccessResponse, ApiErrorResponse } from '@/types/api';
import {
  getReports,
  createReport,
  type ReportFilters,
  type GetReportsResult,
} from '@/lib/reports/reports-service';

// =========================================
// GET: レポート一覧取得
// =========================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // フィルターパラメータを抽出
    const filters: ReportFilters = {
      month: searchParams.get('month'),
      date: searchParams.get('date'),
      workerName: searchParams.get('workerName'),
      customerName: searchParams.get('customerName'),
      workNumberFront: searchParams.get('workNumberFront'),
      workNumberBack: searchParams.get('workNumberBack'),
      machineType: searchParams.get('machineType'),
    };
    
    // ページネーションパラメータ
    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50'),
    };

    // サービス層でデータ取得
    const result = await getReports(filters, pagination);

    return NextResponse.json<ApiSuccessResponse<GetReportsResult>>({
      success: true,
      data: result,
    });

  } catch (error) {
    logger.apiError('/api/reports', error instanceof Error ? error : new Error('Unknown error'), {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json<ApiErrorResponse>(
      { 
        success: false, 
        error: '日報データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// =========================================
// POST: レポート作成
// =========================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, workerName, workItems } = body;

    // サービス層でレポート作成
    const result = await createReport({ date, workerName, workItems });

    type SaveReportData = {
      reportId: string;
    };

    return NextResponse.json<ApiSuccessResponse<SaveReportData>>({
      success: true,
      message: result.isNew 
        ? '日報が正常に保存されました' 
        : '既存の日報に作業項目が追加されました',
      data: {
        reportId: result.reportId,
      }
    });

  } catch (error) {
    logger.apiError('/api/reports [POST]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json<ApiErrorResponse>(
      { success: false, error: '日報の保存に失敗しました' },
      { status: 500 }
    );
  }
}
