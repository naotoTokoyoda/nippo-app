import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getDeliveredTasks, moveJootoTask } from '@/lib/jooto-api';
import { Prisma } from '@prisma/client';

// 型定義
type ReportItem = Prisma.ReportItemGetPayload<{
  include: {
    machine: true;
    report: {
      include: {
        worker: true;
      };
    };
  };
}>;

interface ActivityGroup {
  activity: string;
  hours: number;
  items: ReportItem[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type WorkOrderWithIncludes = Prisma.WorkOrderGetPayload<{
  include: {
    customer: true;
    reportItems: {
      include: {
        report: {
          include: {
            worker: true;
          };
        };
        machine: true;
      };
    };
    adjustments: {
      include: {
        user: true;
      };
    };
    materials: true;
  };
}>;

// 通貨フォーマット関数
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
  }).format(amount);
}

// Activity判定ロジック
function determineActivity(reportItem: ReportItem): string {
  // 1. 実習生判定（作業者名がカタカナ）
  const workerName = reportItem.report.worker.name;
  if (/^[\u30A0-\u30FF\s]+$/.test(workerName)) {
    return 'TRAINEE1';
  }

  // 2. 検品判定（作業内容に「検品」が含まれる）
  const workDescription = reportItem.workDescription || '';
  if (workDescription.includes('検品')) {
    return 'INSPECTION';
  }

  // 3. 機械種類による判定
  const machineName = reportItem.machine.name;
  if (machineName === 'MILLAC 1052 VII') {
    return 'M_1052';
  }
  if (machineName === '正面盤 : Chubu LF 500') {
    return 'M_SHOMEN';
  }
  if (machineName === '12尺 : 汎用旋盤') {
    return 'M_12SHAKU';
  }

  // 4. デフォルトは通常作業
  return 'NORMAL';
}

// Activity名を取得
function getActivityName(activity: string): string {
  const names: Record<string, string> = {
    'NORMAL': '通常',
    'TRAINEE1': '1号実習生', 
    'INSPECTION': '検品',
    'M_1052': '1052',
    'M_SHOMEN': '正面盤',
    'M_12SHAKU': '12尺',
  };
  return names[activity] || activity;
}

// WorkOrderのActivity別集計を計算する関数
async function calculateActivitiesForWorkOrder(workOrderId: string, tx: Prisma.TransactionClient): Promise<Array<{
  activity: string;
  activityName: string;
  hours: number;
  costRate: number;
  billRate: number;
  costAmount: number;
  billAmount: number;
  adjustment: number;
}>> {
  // WorkOrderとreportItemsを取得
  const workOrder = await tx.workOrder.findUnique({
    where: { id: workOrderId },
    include: {
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
    },
  });

  if (!workOrder) {
    throw new Error('WorkOrder not found');
  }

  // Activity別に集計
  const activityMap = new Map<string, ActivityGroup>();

  // 各レポートアイテムのActivityを判定し、時間を集計
  workOrder.reportItems.forEach((item) => {
    const activity = determineActivity(item);
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);
    const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    if (!activityMap.has(activity)) {
      activityMap.set(activity, {
        activity,
        hours: 0,
        items: [],
      });
    }

    const activityData = activityMap.get(activity)!;
    activityData.hours += hours;
    activityData.items.push(item);
  });

  // 各Activity別の単価・金額を計算
  const activities = await Promise.all(
    Array.from(activityMap.values()).map(async (activityData) => {
      // 現在有効な単価を取得
      const rate = await tx.rate.findFirst({
        where: {
          activity: activityData.activity,
          effectiveFrom: {
            lte: new Date(),
          },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: {
          effectiveFrom: 'desc',
        },
      });

      // 最初（デフォルト）の単価を取得
      const originalRate = await tx.rate.findFirst({
        where: {
          activity: activityData.activity,
        },
        orderBy: {
          effectiveFrom: 'asc',
        },
      });

      const costRate = rate?.costRate || 11000; // デフォルト単価
      const billRate = rate?.billRate || 11000;
      const originalBillRate = originalRate?.billRate || 11000;
      const hours = Math.round(activityData.hours * 10) / 10;
      const costAmount = Math.round(hours * costRate);
      const billAmount = Math.round(hours * billRate);
      
      // 調整額 = 現在の請求額 - 元の請求額
      const originalBillAmount = Math.round(hours * originalBillRate);
      const adjustment = billAmount - originalBillAmount;

      return {
        activity: activityData.activity,
        activityName: getActivityName(activityData.activity),
        hours,
        costRate,
        billRate,
        costAmount,
        billAmount,
        adjustment,
      };
    })
  );

  return activities;
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
      
      // まずデータベースから工番を検索（Jooto APIに依存しない）
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
        console.log(`Found work order in database for Jooto task ID: ${taskId}`);
      } else {
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
          console.warn('Jooto API取得エラー（データベース検索も失敗）:', jootoError);
          return Response.json(
            { error: 'Jooto APIが利用できず、該当する工番データも見つかりませんでした。' },
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

    // Activity別に集計
    const activityMap = new Map<string, ActivityGroup>();

    // 各レポートアイテムのActivityを判定し、時間を集計
    workOrder.reportItems.forEach((item: ReportItem) => {
      const activity = determineActivity(item);
      const startTime = new Date(item.startTime);
      const endTime = new Date(item.endTime);
      const hours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

      if (!activityMap.has(activity)) {
        activityMap.set(activity, {
          activity,
          hours: 0,
          items: [],
        });
      }

      const activityData = activityMap.get(activity)!;
      activityData.hours += hours;
      activityData.items.push(item);
    });

    // 各Activity別の単価・金額を計算
    const activities = await Promise.all(
      Array.from(activityMap.values()).map(async (activityData) => {
        // 現在有効な単価を取得
        const rate = await prisma.rate.findFirst({
          where: {
            activity: activityData.activity,
            effectiveFrom: {
              lte: new Date(),
            },
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: new Date() } },
            ],
          },
          orderBy: {
            effectiveFrom: 'desc',
          },
        });

        // 最初（デフォルト）の単価を取得
        const originalRate = await prisma.rate.findFirst({
          where: {
            activity: activityData.activity,
          },
          orderBy: {
            effectiveFrom: 'asc',
          },
        });

        const costRate = rate?.costRate || 11000; // デフォルト単価
        const billRate = rate?.billRate || 11000;
        const originalBillRate = originalRate?.billRate || 11000;
        const hours = Math.round(activityData.hours * 10) / 10;
        const costAmount = Math.round(hours * costRate);
        const billAmount = Math.round(hours * billRate);
        
        // 調整額 = 現在の請求額 - 元の請求額
        const originalBillAmount = Math.round(hours * originalBillRate);
        const adjustment = billAmount - originalBillAmount;

        return {
          activity: activityData.activity,
          activityName: getActivityName(activityData.activity),
          hours,
          costRate,
          billRate,
          costAmount,
          billAmount,
          adjustment,
        };
      })
    );

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
      totalHours: Math.round(totalHours * 10) / 10,
      activities,
      adjustments,
      expenses,
    };

    return NextResponse.json(result);

  } catch (error) {
    console.error('集計詳細取得エラー:', error);
    return NextResponse.json(
      { error: '集計詳細の取得に失敗しました' },
      { status: 500 }
    );
  }
}

// 集計詳細を更新（単価調整など）
const updateSchema = z.object({
  billRateAdjustments: z.record(z.string(), z.object({
    billRate: z.number(),
    memo: z.string().optional(),
  })).optional(),
  expenses: z.array(z.object({
    id: z.string().optional(),
    category: z.string(),
    costUnitPrice: z.number(),
    costQuantity: z.number(),
    costTotal: z.number(),
    billUnitPrice: z.number().optional(),
    billQuantity: z.number().optional(),
    billTotal: z.number().optional(),
    fileEstimate: z.number().nullable().optional(),
  })).optional(),
  status: z.enum(['aggregating', 'aggregated']).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateSchema.parse(body);

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
          console.warn('Jooto API取得エラー:', jootoError);
          return Response.json(
            { error: 'Jooto APIが利用できず、該当する工番データも見つかりませんでした。' },
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
            },
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
        const totalHours = currentActivities.reduce((sum, activity) => sum + activity.hours, 0);
        const costTotal = currentActivities.reduce((sum, activity) => sum + activity.costAmount, 0);
        const billTotal = currentActivities.reduce((sum, activity) => sum + activity.billAmount, 0);
        const expenseBillTotal = currentExpenses.reduce((sum, expense) => sum + expense.billTotal, 0);
        const adjustmentTotal = currentActivities.reduce((sum, activity) => sum + activity.adjustment, 0);
        const finalAmount = billTotal + expenseBillTotal;

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
          console.log(`Moved Jooto task ${taskId} from 納品済み to 集計中`);
        } else {
          console.warn('JOOTO_AGGREGATING_LIST_ID environment variable is not set');
        }
      } catch (jootoError) {
        // Jootoの移動が失敗してもデータベースの更新は成功として扱う
        console.error('Jooto task move failed, but database update succeeded:', jootoError);
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('集計詳細更新エラー:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'リクエストデータが無効です', details: error.issues },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: '集計詳細の更新に失敗しました' },
      { status: 500 }
    );
  }
}
