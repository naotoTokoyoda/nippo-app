import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { calculateActivitiesForWorkOrder } from '@/lib/aggregation/calculation-service';
import { updateAggregationSchema } from '@/lib/aggregation/schemas';
import { getWorkOrder } from '@/lib/aggregation/work-order-service';
import { processRateAdjustments } from '@/lib/aggregation/adjustment-service';
import { replaceExpenses } from '@/lib/aggregation/expense-service';
import { createAggregationSummary } from '@/lib/aggregation/summary-service';
import { updateWorkOrderStatus, updateStatusOnly, moveJootoTaskByStatus } from '@/lib/aggregation/status-management-service';
import { z } from 'zod';

// 集計詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 工番を取得（通常IDまたはJootoタスクID）
    const result = await getWorkOrder(id, prisma);

    // エラーチェック
    if (result.error) {
      return Response.json(
        {
          error: result.error,
          details: result.details,
          availableTaskIds: result.availableTaskIds,
        },
        { status: result.status || 404 }
      );
    }

    const workOrder = result.workOrder;
    if (!workOrder) {
      return Response.json(
        { error: '工番が見つかりません' },
        { status: 404 }
      );
    }

    // Activity別の単価・金額を計算
    const activities = await calculateActivitiesForWorkOrder(workOrder.id, prisma);

    // 調整履歴を整形
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adjustments = workOrder.adjustments.map((adj: any) => ({
      id: adj.id,
      type: adj.type,
      amount: adj.amount,
      reason: adj.reason,
      memo: adj.memo,
      createdBy: adj.user.name,
      createdAt: adj.createdAt.toISOString(),
    }));

    // 材料費を整形
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const expenses = workOrder.materials.map((material: any) => ({
      id: material.id,
      category: material.category,
      costUnitPrice: material.costUnitPrice,
      costQuantity: material.costQuantity,
      costTotal: material.costTotal,
      billUnitPrice: material.billUnitPrice,
      billQuantity: material.billQuantity,
      billTotal: material.billTotal,
      fileEstimate: material.fileEstimate,
      memo: material.memo || undefined,
    }));

    // 総時間を計算
    const totalHours = activities.reduce((sum, activity) => sum + activity.hours, 0);

    const responseData = {
      id: workOrder.id,
      workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
      customerName: workOrder.customer.name,
      projectName: workOrder.projectName || workOrder.description || '未設定',
      term: workOrder.term,
      status: workOrder.status,
      totalHours: totalHours,
      activities,
      adjustments,
      expenses,
      estimateAmount: workOrder.estimateAmount,
      finalDecisionAmount: workOrder.finalDecisionAmount,
    };

    return NextResponse.json(responseData);

  } catch (error) {
    logger.apiError('/api/aggregation/[id]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: '集計詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateAggregationSchema.parse(body);

    // 工番を取得（簡易版 - customerのみinclude）
    const result = await getWorkOrder(id, prisma);

    // エラーチェック
    if (result.error || !result.workOrder) {
      return Response.json(
        {
          error: result.error || '工番が見つかりません',
          details: result.details,
        },
        { status: result.status || 404 }
      );
    }

    const workOrder = result.workOrder;

    // ステータスのみの変更かチェック（軽量化のため）
    const isOnlyStatusChange = validatedData.status && 
      !validatedData.billRateAdjustments && 
      !validatedData.expenses &&
      validatedData.estimateAmount === undefined &&
      validatedData.finalDecisionAmount === undefined;

    if (isOnlyStatusChange && validatedData.status) {
      // 軽量：ステータスのみ更新（Prisma API呼び出しを最小化）
      await updateStatusOnly(workOrder.id, workOrder.status, validatedData.status, prisma);
    } else {
      // 通常：トランザクション内で更新処理（タイムアウトを15秒に延長）
      await prisma.$transaction(async (tx) => {
      // 単価調整がある場合
      if (validatedData.billRateAdjustments) {
        await processRateAdjustments(workOrder.id, validatedData.billRateAdjustments, tx);
      }

      // 経費更新がある場合
      if (validatedData.expenses) {
        await replaceExpenses(workOrder.id, validatedData.expenses, tx);
      }

      // 見積もり金額・最終決定金額の更新がある場合
      if (validatedData.estimateAmount !== undefined || validatedData.finalDecisionAmount !== undefined) {
        const amountUpdateData: Record<string, number | null> = {};
        if (validatedData.estimateAmount !== undefined) {
          amountUpdateData.estimateAmount = validatedData.estimateAmount;
        }
        if (validatedData.finalDecisionAmount !== undefined) {
          amountUpdateData.finalDecisionAmount = validatedData.finalDecisionAmount;
        }
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: amountUpdateData,
        });
      }

      // 集計完了時にAggregationSummaryを作成
      if (validatedData.status === 'aggregated') {
        await createAggregationSummary(workOrder, tx);
      }

      // ステータス更新
      if (validatedData.status) {
        await updateWorkOrderStatus(workOrder.id, validatedData.status, tx);
      }
      }, {
        timeout: 15000, // タイムアウトを15秒に延長
      });
    }

    // Jootoタスクの移動（トランザクション外で実行）
    if (validatedData.status) {
      await moveJootoTaskByStatus(id, workOrder.status, validatedData.status);
    }

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      logger.validationError('aggregation-update-api', error.issues);
      return NextResponse.json(
        { error: 'リクエストデータが無効です', details: error.issues },
        { status: 400 }
      );
    }
    logger.apiError('/api/aggregation/[id] [PATCH]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: '集計詳細の更新に失敗しました' },
      { status: 500 }
    );
  }
}
