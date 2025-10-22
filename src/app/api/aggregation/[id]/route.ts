import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { getDeliveredTasks, moveJootoTask } from '@/lib/jooto-api';
import { determineActivity } from '@/lib/aggregation/activity-utils';
import { 
  calculateActivitiesForWorkOrder,
  calculateSummary 
} from '@/lib/aggregation/calculation-service';
import { updateAggregationSchema } from '@/lib/aggregation/schemas';
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let workOrder: any;

    // JootoタスクIDの場合の処理（フォールバック機能付き）
    if (id.startsWith('jooto-')) {
      const taskId = id.replace('jooto-', '');
      logger.info(`Processing Jooto task ID: ${taskId}`);
      
      // まずデータベースから工番を検索（Jooto APIに依存しない）
      logger.info(`Searching database for task ID: ${taskId}`);
      workOrder = await prisma.workOrder.findFirst({
        where: {
          OR: [
            { frontNumber: { contains: taskId } },
            { backNumber: { contains: taskId } },
          ]
        },
        include: {
          customer: true,
          reportItems: {
            include: {
              report: {
                include: {
                  worker: true,
                },
              },
              machine: true,
            },
          },
          adjustments: {
            include: {
              user: true,
            },
          },
          materials: true,
        },
      });

      // データベースに工番データがある場合は、それを返す
      if (workOrder) {
        logger.info(`Found work order in database for Jooto task ID: ${taskId}`, {
          workOrderId: workOrder.id,
          workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`
        });
      } else {
        // データベースにない場合は、Jooto APIを試行
        try {
          // 環境変数の確認
          if (!process.env.JOOTO_API_KEY || !process.env.JOOTO_BOARD_ID || !process.env.JOOTO_DELIVERED_LIST_ID) {
            logger.warn('Jooto API環境変数が未設定', {
              hasApiKey: !!process.env.JOOTO_API_KEY,
              hasBoardId: !!process.env.JOOTO_BOARD_ID,
              hasDeliveredListId: !!process.env.JOOTO_DELIVERED_LIST_ID,
            });
            return Response.json(
              { 
                error: `工番が見つかりません（タスクID: ${taskId}）`,
                details: 'データベースに工番が登録されていません。Jooto APIの設定も確認できません。'
              },
              { status: 404 }
            );
          }

          logger.info(`Attempting to fetch Jooto tasks for task ID: ${taskId}`);
          const deliveredTasks = await getDeliveredTasks();
          logger.info(`Found ${deliveredTasks.length} delivered tasks`);
          
          // デバッグ: 取得したタスクIDをログ出力
          if (deliveredTasks.length > 0) {
            const taskIds = deliveredTasks.slice(0, 5).map(t => t.taskId);
            logger.info(`Sample task IDs: ${taskIds.join(', ')}`);
          }
          
          const jootoTask = deliveredTasks.find(task => {
            const match = task.taskId.toString() === taskId;
            if (match) {
              logger.info(`Found matching task: ${task.taskId} === ${taskId}`);
            }
            return match;
          });
          
          if (!jootoTask) {
            logger.warn(`Jooto task not found for ID: ${taskId}`, {
              taskId,
              searchedId: taskId,
              deliveredTaskCount: deliveredTasks.length,
              availableTaskIds: deliveredTasks.map(t => t.taskId)
            });
            return Response.json(
              { 
                error: `Jootoタスクが見つかりません（ID: ${taskId}）`,
                details: '納品済みリストに該当するタスクがありません。タスクIDが正しいか、またはタスクが既に移動されていないか確認してください。',
                availableTaskIds: deliveredTasks.slice(0, 10).map(t => t.taskId)
              },
              { status: 404 }
            );
          }
          
          logger.info(`Found Jooto task: ${jootoTask.workNumberFront}-${jootoTask.workNumberBack}`);

          // 既存の工番データを確認
          workOrder = await prisma.workOrder.findUnique({
            where: {
              frontNumber_backNumber: {
                frontNumber: jootoTask.workNumberFront,
                backNumber: jootoTask.workNumberBack,
              },
            },
            include: {
              customer: true,
              reportItems: {
                include: {
                  report: {
                    include: {
                      worker: true,
                    },
                  },
                  machine: true,
                },
              },
              adjustments: {
                include: {
                  user: true,
                },
              },
              materials: true,
            },
          });

          // 工番データが存在しない場合は作成
          if (!workOrder) {
            // 顧客を検索または作成
            let customer = await prisma.customer.findFirst({
              where: { name: jootoTask.customerName },
            });

            if (!customer) {
              // 顧客コードを生成（顧客名の最初の3文字 + ランダム数字）
              const customerCode = jootoTask.customerName.slice(0, 3) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
              
              customer = await prisma.customer.create({
                data: { 
                  name: jootoTask.customerName,
                  code: customerCode,
                },
              });
            }

            // 工番データを作成
            workOrder = await prisma.workOrder.create({
              data: {
                frontNumber: jootoTask.workNumberFront,
                backNumber: jootoTask.workNumberBack,
                customerId: customer.id,
                projectName: jootoTask.workName,
                status: 'aggregating',
              },
              include: {
                customer: true,
                reportItems: {
                  include: {
                    report: {
                      include: {
                        worker: true,
                      },
                    },
                    machine: true,
                  },
                },
                adjustments: {
                  include: {
                    user: true,
                  },
                },
                materials: true,
              },
            });
          } else if (workOrder.status !== 'aggregating') {
            // ステータスを集計中に更新
            workOrder = await prisma.workOrder.update({
              where: { id: workOrder.id },
              data: { status: 'aggregating' },
              include: {
                customer: true,
                reportItems: {
                  include: {
                    report: {
                      include: {
                        worker: true,
                      },
                    },
                    machine: true,
                  },
                },
                adjustments: {
                  include: {
                    user: true,
                  },
                },
                materials: true,
              },
            });
          }
        } catch (jootoError) {
          const error = jootoError instanceof Error ? jootoError : new Error(String(jootoError));
          logger.error(
            `Jooto API取得エラー（データベース検索も失敗） - taskId: ${taskId}`, 
            error
          );
          return Response.json(
            { 
              error: `工番が見つかりません。Jooto APIとデータベースの両方で見つかりませんでした。`,
              details: error.message,
              taskId: taskId
            },
            { status: 404 }
          );
        }
      }
    } else {
      // 通常の工番IDの場合
      workOrder = await prisma.workOrder.findUnique({
        where: { id },
        include: {
          customer: true,
          reportItems: {
            include: {
              report: {
                include: {
                  worker: true,
                },
              },
              machine: true,
            },
          },
          adjustments: {
            include: {
              user: true,
            },
          },
          materials: true,
        },
      });
    }

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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let workOrder: any;

    // JootoタスクIDの場合の処理
    if (id.startsWith('jooto-')) {
      const taskId = id.replace('jooto-', '');
      
      // まずデータベースから工番を検索
      workOrder = await prisma.workOrder.findFirst({
        where: {
          OR: [
            { frontNumber: { contains: taskId } },
            { backNumber: { contains: taskId } },
          ]
        },
        include: {
          customer: true,
        },
      });

      if (!workOrder) {
        // データベースにない場合は、Jooto APIを試行
        try {
          const deliveredTasks = await getDeliveredTasks();
          const jootoTask = deliveredTasks.find(task => task.taskId.toString() === taskId);
          
          if (!jootoTask) {
            return Response.json(
              { error: 'Jootoタスクが見つかりません' },
              { status: 404 }
            );
          }

          // 既存の工番データを確認
          workOrder = await prisma.workOrder.findUnique({
            where: {
              frontNumber_backNumber: {
                frontNumber: jootoTask.workNumberFront,
                backNumber: jootoTask.workNumberBack,
              },
            },
            include: {
              customer: true,
            },
          });

          if (!workOrder) {
            return Response.json(
              { error: '工番が見つかりません' },
              { status: 404 }
            );
          }
        } catch (jootoError) {
          const errorMessage = jootoError instanceof Error ? jootoError.message : 'Unknown error';
          logger.warn('Jooto API取得エラー', {
            error: errorMessage
          });
          return Response.json(
            { error: `Jooto APIが利用できません: ${errorMessage}` },
            { status: 500 }
          );
        }
      }
    } else {
      // 通常の工番IDの場合
      workOrder = await prisma.workOrder.findUnique({
        where: { id },
        include: {
          customer: true,
        },
      });

      if (!workOrder) {
        return NextResponse.json(
          { error: '工番が見つかりません' },
          { status: 404 }
        );
      }
    }

    // 集計済みの場合は編集を禁止
    if (workOrder.status === 'aggregated') {
      return NextResponse.json(
        { error: '集計済みの工番は編集できません' },
        { status: 400 }
      );
    }


    // トランザクション内で更新処理
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
    });

    // Jootoタスクの移動（トランザクション外で実行）
    if (validatedData.status === 'aggregated' && id.startsWith('jooto-')) {
      try {
        const taskId = id.replace('jooto-', '');
        const aggregatingListId = process.env.JOOTO_AGGREGATING_LIST_ID;
        
        if (aggregatingListId) {
          await moveJootoTask(taskId, aggregatingListId);
          logger.info(`Moved Jooto task ${taskId} from 納品済み to 集計中`);
        } else {
          logger.warn('JOOTO_AGGREGATING_LIST_ID environment variable is not set');
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
