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
      createdBy: adj.createdBy,
      createdAt: adj.createdAt.toISOString(),
      updatedAt: adj.updatedAt.toISOString(),
      isDeleted: adj.isDeleted,
      deletedBy: adj.deletedBy,
      deletedAt: adj.deletedAt ? adj.deletedAt.toISOString() : undefined,
      user: {
        id: adj.user.id,
        name: adj.user.name,
        role: adj.user.role,
      },
      deletedUser: adj.deletedUser ? {
        id: adj.deletedUser.id,
        name: adj.deletedUser.name,
        role: adj.deletedUser.role,
      } : undefined,
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
      deliveryDate: workOrder.deliveryDate ? workOrder.deliveryDate.toISOString() : null,
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
      validatedData.finalDecisionAmount === undefined &&
      validatedData.deliveryDate === undefined;

    if (isOnlyStatusChange && validatedData.status) {
      // 軽量：ステータスのみ更新（Prisma API呼び出しを最小化）
      await updateStatusOnly(workOrder.id, workOrder.status, validatedData.status, prisma);
    } else {
      // 通常：トランザクション内で更新処理（タイムアウトを15秒に延長）
      await prisma.$transaction(async (tx) => {
      // 単価調整がある場合
      if (validatedData.billRateAdjustments) {
        // TODO: 本番環境ではセッションから実際のユーザーIDを取得する
        const userId = 'cmh8ils0x0000u5shpsixbzdf'; // 開発用: 常世田直人
        await processRateAdjustments(workOrder.id, validatedData.billRateAdjustments, tx, userId);
      }

      // 経費更新がある場合
      if (validatedData.expenses) {
        // TODO: 本番環境ではセッションから実際のユーザーIDを取得する
        const userId = 'cmh8ils0x0000u5shpsixbzdf'; // 開発用: 常世田直人
        await replaceExpenses(workOrder.id, validatedData.expenses, tx, userId);
      }

      // 見積もり金額・最終決定金額・納品日の更新がある場合
      if (validatedData.estimateAmount !== undefined || validatedData.finalDecisionAmount !== undefined || validatedData.deliveryDate !== undefined) {
        // TODO: 本番環境ではセッションから実際のユーザーIDを取得する
        const userId = 'cmh8ils0x0000u5shpsixbzdf'; // 開発用: 常世田直人
        
        // 変更履歴を記録するため、現在の値を取得
        const oldEstimateAmount = workOrder.estimateAmount;
        const oldFinalDecisionAmount = workOrder.finalDecisionAmount;
        
        const amountUpdateData: Record<string, number | Date | null> = {};
        if (validatedData.estimateAmount !== undefined) {
          amountUpdateData.estimateAmount = validatedData.estimateAmount;
        }
        if (validatedData.finalDecisionAmount !== undefined) {
          amountUpdateData.finalDecisionAmount = validatedData.finalDecisionAmount;
        }
        if (validatedData.deliveryDate !== undefined) {
          amountUpdateData.deliveryDate = validatedData.deliveryDate ? new Date(validatedData.deliveryDate) : null;
        }
        
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: amountUpdateData,
        });
        
        // 見積もり金額の変更履歴を作成
        if (validatedData.estimateAmount !== undefined && validatedData.estimateAmount !== oldEstimateAmount) {
          const difference = (validatedData.estimateAmount ?? 0) - (oldEstimateAmount ?? 0);
          const oldAmountStr = oldEstimateAmount !== null ? `¥${oldEstimateAmount.toLocaleString()}` : '未設定';
          const newAmountStr = validatedData.estimateAmount !== null ? `¥${validatedData.estimateAmount.toLocaleString()}` : '未設定';
          
          await tx.adjustment.create({
            data: {
              workOrderId: workOrder.id,
              type: 'estimate_amount_change',
              amount: difference,
              reason: `見積もり金額変更 (${oldAmountStr} → ${newAmountStr})`,
              memo: null,
              createdBy: userId,
            },
          });
        }
        
        // 最終決定金額の変更履歴を作成
        if (validatedData.finalDecisionAmount !== undefined && validatedData.finalDecisionAmount !== oldFinalDecisionAmount) {
          const difference = (validatedData.finalDecisionAmount ?? 0) - (oldFinalDecisionAmount ?? 0);
          const oldAmountStr = oldFinalDecisionAmount !== null ? `¥${oldFinalDecisionAmount.toLocaleString()}` : '未設定';
          const newAmountStr = validatedData.finalDecisionAmount !== null ? `¥${validatedData.finalDecisionAmount.toLocaleString()}` : '未設定';
          
          await tx.adjustment.create({
            data: {
              workOrderId: workOrder.id,
              type: 'final_decision_amount_change',
              amount: difference,
              reason: `最終決定金額変更 (${oldAmountStr} → ${newAmountStr})`,
              memo: null,
              createdBy: userId,
            },
          });
        }
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
