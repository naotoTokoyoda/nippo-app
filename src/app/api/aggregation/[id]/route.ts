import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { moveJootoTask } from '@/lib/jooto-api';
import { determineActivity } from '@/lib/aggregation/activity-utils';
import { 
  calculateActivitiesForWorkOrder,
  calculateSummary 
} from '@/lib/aggregation/calculation-service';
import { updateAggregationSchema } from '@/lib/aggregation/schemas';
import { getWorkOrder } from '@/lib/aggregation/work-order-service';
import { z } from 'zod';

/**
 * 通貨フォーマット関数
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

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

    const result = {
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
    };

    return NextResponse.json(result);

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
      !validatedData.expenses;

    if (isOnlyStatusChange) {
      // 軽量：ステータスのみ更新（Prisma API呼び出しを最小化）
      await prisma.workOrder.update({
        where: { id: workOrder.id },
        data: { status: validatedData.status },
      });
      logger.info(`Status only update: ${workOrder.status} -> ${validatedData.status}`);
    } else {
      // 通常：トランザクション内で更新処理（タイムアウトを15秒に延長）
      await prisma.$transaction(async (tx) => {
      // 単価調整がある場合
      if (validatedData.billRateAdjustments) {
        for (const [activity, adjustment] of Object.entries(validatedData.billRateAdjustments)) {
          // 既存の単価を取得
          const currentRate = await tx.rate.findFirst({
            where: {
              activity,
              effectiveFrom: { lte: new Date() },
              OR: [
                { effectiveTo: null },
                { effectiveTo: { gte: new Date() } },
              ],
            },
            orderBy: { effectiveFrom: 'desc' },
          });

          // 工番ごとのActivityメモを保存/更新
          if (adjustment.memo !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (tx as any).workOrderActivityMemo.upsert({
              where: {
                workOrderId_activity: {
                  workOrderId: workOrder.id,
                  activity,
                },
              },
              update: {
                memo: adjustment.memo || null,
              },
              create: {
                workOrderId: workOrder.id,
                activity,
                memo: adjustment.memo || null,
              },
            });
          }

          if (currentRate && currentRate.billRate !== adjustment.billRate) {
            // 現在の単価の有効期限を今日までに設定
            await tx.rate.update({
              where: { id: currentRate.id },
              data: { effectiveTo: new Date() },
            });

            // 新しい単価を作成
            await tx.rate.create({
              data: {
                activity,
                effectiveFrom: new Date(),
                effectiveTo: null,
                costRate: currentRate.costRate,
                billRate: adjustment.billRate,
                // memo: currentRate.memo, // Rateテーブルのメモは変更しない
              },
            });

            // 金額差を計算
            const oldBillRate = currentRate.billRate;
            const newBillRate = adjustment.billRate;
            const rateDifference = newBillRate - oldBillRate;
            
            // 単価が変更された場合のみ調整履歴を記録
            if (rateDifference !== 0) {
              // 実在するユーザーIDを取得（暫定的に最初のユーザーを使用）
              const firstUser = await tx.user.findFirst();
              if (firstUser) {
                // この工番のこのactivityの総時間を取得
                const reportItems = await tx.reportItem.findMany({
                  where: {
                    workOrderId: workOrder.id,
                  },
                  include: {
                    report: {
                      include: {
                        worker: true,
                      },
                    },
                    machine: true,
                  },
                });
                
                // activityが一致するreportItemsのみを集計
                const filteredItems = reportItems.filter(item => determineActivity(item) === activity);
                const totalHours = filteredItems.reduce((sum, item) => {
                  const hours = (item.endTime.getTime() - item.startTime.getTime()) / (1000 * 60 * 60);
                  return sum + hours;
                }, 0);
                const totalAdjustment = Math.round(totalHours * rateDifference);

                await tx.adjustment.create({
                  data: {
                    workOrderId: workOrder.id,
                    type: 'rate_adjustment',
                    amount: totalAdjustment,
                    reason: `${activity}単価調整 (${formatCurrency(oldBillRate)} → ${formatCurrency(newBillRate)})`,
                    memo: adjustment.memo || null, // 備考は任意（空の場合はnull）
                    createdBy: firstUser.id,
                  },
                });
              }
          } else if (adjustment.memo !== undefined) {
            // メモのみが変更された場合の調整履歴を記録
            const firstUser = await tx.user.findFirst();
            if (firstUser) {
              await tx.adjustment.create({
                data: {
                  workOrderId: workOrder.id,
                  type: 'memo_update',
                  amount: 0,
                  reason: `${activity}メモ更新`,
                  memo: adjustment.memo || null,
                  createdBy: firstUser.id,
                },
              });
            }
          }
          }
        }
      }

      // 経費更新がある場合
      if (validatedData.expenses) {
        // 既存の経費をすべて削除
        await tx.material.deleteMany({
          where: { workOrderId: workOrder.id },
        });

        // 新しい経費を作成
        for (const expense of validatedData.expenses) {
          const category = expense.category.trim();
          if (!category) {
            continue;
          }

          const safeCostUnitPrice = Number.isFinite(expense.costUnitPrice) ? Math.max(0, expense.costUnitPrice) : 0;
          const safeCostQuantity = Number.isFinite(expense.costQuantity) ? Math.max(1, expense.costQuantity) : 1;
          const computedCostTotal = safeCostUnitPrice * safeCostQuantity;
          const costTotal = Number.isFinite(expense.costTotal) && expense.costTotal > 0 ? expense.costTotal : computedCostTotal;

          const shouldAutoMarkup = ['materials', 'outsourcing', 'shipping'].includes(category);

          let billQuantity = Number.isFinite(expense.billQuantity) && (expense.billQuantity ?? 0) > 0
            ? Number(expense.billQuantity)
            : safeCostQuantity;

          if (billQuantity <= 0) {
            billQuantity = safeCostQuantity;
          }

          let billTotal: number;
          if (typeof expense.billTotal === 'number' && expense.billTotal >= 0) {
            billTotal = expense.billTotal;
          } else if (shouldAutoMarkup) {
            billTotal = Math.ceil(costTotal * 1.2);
          } else {
            const fallbackUnitPrice = Number.isFinite(expense.billUnitPrice ?? 0) ? Math.max(0, expense.billUnitPrice ?? 0) : 0;
            billTotal = fallbackUnitPrice * billQuantity;
          }

          const billUnitPrice = billQuantity > 0 ? Math.ceil(billTotal / billQuantity) : billTotal;

          await tx.material.create({
            data: {
              workOrderId: workOrder.id,
              category,
              costUnitPrice: safeCostUnitPrice,
              costQuantity: safeCostQuantity,
              costTotal,
              billUnitPrice,
              billQuantity,
              billTotal,
              fileEstimate: typeof expense.fileEstimate === 'number' ? expense.fileEstimate : null,
              memo: expense.memo || null,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
          });
        }
      }

      // 集計完了時にAggregationSummaryを作成
      if (validatedData.status === 'aggregated') {
        // 現在の集計結果を計算
        const currentActivities = await calculateActivitiesForWorkOrder(workOrder.id, tx);
        const currentExpenses = await tx.material.findMany({
          where: { workOrderId: workOrder.id },
        });

        // 合計値を計算
        const summary = calculateSummary(currentActivities, currentExpenses);
        const { totalHours, costTotal, billTotal, expenseBillTotal, adjustmentTotal, finalAmount } = summary;

        // Activity別詳細をJSON形式で準備
        const activityBreakdown = currentActivities.map(activity => ({
          activity: activity.activity,
          activityName: activity.activityName,
          hours: activity.hours,
          costRate: activity.costRate,
          billRate: activity.billRate,
          costAmount: activity.costAmount,
          billAmount: activity.billAmount,
          adjustment: activity.adjustment,
        }));

        // 経費詳細をJSON形式で準備
        const materialBreakdown = currentExpenses.map(expense => ({
          category: expense.category,
          costUnitPrice: expense.costUnitPrice,
          costQuantity: expense.costQuantity,
          costTotal: expense.costTotal,
          billUnitPrice: expense.billUnitPrice,
          billQuantity: expense.billQuantity,
          billTotal: expense.billTotal,
          fileEstimate: expense.fileEstimate,
        }));

        // AggregationSummaryレコードを作成
        // 実際のユーザーIDを取得（存在しない場合はシステムユーザーを作成）
        let systemUserId: string;
        const existingUser = await tx.user.findFirst({
          where: { name: 'システム' }
        });
        
        if (existingUser) {
          systemUserId = existingUser.id;
        } else {
          // システムユーザーを作成
          const systemUser = await tx.user.create({
            data: {
              name: 'システム',
            },
          });
          systemUserId = systemUser.id;
        }

        await tx.aggregationSummary.create({
          data: {
            workOrderId: workOrder.id,
            workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
            customerName: workOrder.customer.name,
            projectName: workOrder.projectName || workOrder.description || '未設定',
            totalHours: totalHours,
            costTotal: costTotal,
            billTotal: billTotal,
            materialTotal: expenseBillTotal,
            adjustmentTotal: adjustmentTotal,
            finalAmount: finalAmount,
            activityBreakdown: activityBreakdown,
            materialBreakdown: materialBreakdown,
            aggregatedAt: new Date(),
            aggregatedBy: systemUserId,
            memo: '集計完了',
          },
        });
      }

      // ステータス更新
      if (validatedData.status) {
        await tx.workOrder.update({
          where: { id: workOrder.id },
          data: { status: validatedData.status },
        });
      }
      }, {
        timeout: 15000, // タイムアウトを15秒に延長
      });
    }

    // Jootoタスクの移動（トランザクション外で実行）
    if (validatedData.status && id.startsWith('jooto-')) {
      try {
        const taskId = id.replace('jooto-', '');
        const currentStatus = workOrder.status;
        const newStatus = validatedData.status;
        
        let targetListId: string | undefined;
        let moveDescription: string = '';

        // ステータス遷移に応じた移動先を決定
        if (currentStatus === 'delivered' && newStatus === 'aggregating') {
          // 納品済み → 集計中
          targetListId = process.env.JOOTO_AGGREGATING_LIST_ID;
          moveDescription = '納品済み → 集計中';
        } else if (currentStatus === 'aggregating' && newStatus === 'delivered') {
          // 集計中 → 納品済み（差し戻し）
          targetListId = process.env.JOOTO_DELIVERED_LIST_ID;
          moveDescription = '集計中 → 納品済み';
        } else if (currentStatus === 'aggregating' && newStatus === 'aggregated') {
          // 集計中 → 完了（Freee納品書登録済み）
          targetListId = process.env.JOOTO_FREEE_INVOICE_REGISTERED_LIST_ID;
          moveDescription = '集計中 → Freee納品書登録済み';
        } else if (currentStatus === 'aggregated' && newStatus === 'aggregating') {
          // 完了 → 集計中（差し戻し）
          targetListId = process.env.JOOTO_AGGREGATING_LIST_ID;
          moveDescription = 'Freee納品書登録済み → 集計中';
        } else if (currentStatus === 'aggregated' && newStatus === 'delivered') {
          // 完了 → 納品済み（直接差し戻し）
          targetListId = process.env.JOOTO_DELIVERED_LIST_ID;
          moveDescription = 'Freee納品書登録済み → 納品済み';
        }
        
        if (targetListId) {
          await moveJootoTask(taskId, targetListId);
          logger.info(`Moved Jooto task ${taskId}: ${moveDescription}`);
        } else {
          logger.warn(`Target list ID not found for status change: ${currentStatus} → ${newStatus}`);
        }
      } catch (jootoError) {
        // Jootoの移動が失敗してもデータベースの更新は成功として扱う
        logger.error('Jooto task move failed, but database update succeeded', jootoError instanceof Error ? jootoError : new Error('Unknown error'));
      }
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
