import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { getDeliveredTasks } from '@/lib/jooto-api';

// 型定義
interface ReportItem {
  id: string;
  startTime: Date;
  endTime: Date;
  workDescription: string | null;
  machine: {
    name: string;
  };
  report: {
    worker: {
      name: string;
    };
  };
}

interface ActivityGroup {
  activity: string;
  hours: number;
  items: ReportItem[];
}

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

// 集計詳細を取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let workOrder;

    // JootoタスクIDの場合の処理
    if (id.startsWith('jooto-')) {
      const taskId = id.replace('jooto-', '');
      
      // Jooto APIからタスク情報を取得
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
            orderBy: {
              createdAt: 'desc',
            },
          },
          materials: {
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      // 工番データが存在しない場合は作成
      if (!workOrder) {
        // 顧客を検索または作成
        let customer = await prisma.customer.findFirst({
          where: { name: jootoTask.customerName },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: { name: jootoTask.customerName },
          });
        }

        // 工番データを作成
        workOrder = await prisma.workOrder.create({
          data: {
            frontNumber: jootoTask.workNumberFront,
            backNumber: jootoTask.workNumberBack,
            customerId: customer.id,
            projectName: jootoTask.workName,
            status: 'aggregating', // 詳細画面を開いた時点で集計中に設定
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
              orderBy: {
                createdAt: 'desc',
              },
            },
            materials: {
              orderBy: {
                createdAt: 'asc',
              },
            },
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
              orderBy: {
                createdAt: 'desc',
              },
            },
            materials: {
              orderBy: {
                createdAt: 'asc',
              },
            },
          },
        });
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
            orderBy: {
              createdAt: 'desc',
            },
          },
          materials: {
            orderBy: {
              createdAt: 'asc',
            },
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
    workOrder.reportItems.forEach(item => {
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
    const adjustments = workOrder.adjustments.map(adj => ({
      id: adj.id,
      type: adj.type,
      amount: adj.amount,
      reason: adj.reason,
      memo: adj.memo,
      createdBy: adj.user.name,
      createdAt: adj.createdAt.toISOString(),
    }));

    // 材料費を整形
    const materials = workOrder.materials.map(material => ({
      id: material.id,
      name: material.name,
      unitPrice: material.unitPrice,
      quantity: material.quantity,
      totalAmount: material.totalAmount,
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
      materials,
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

    // 工番の存在確認
    const workOrder = await prisma.workOrder.findUnique({
      where: { id },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: '工番が見つかりません' },
        { status: 404 }
      );
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
                    workOrderId: id,
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
                    workOrderId: id,
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

      // ステータス更新
      if (validatedData.status) {
        await tx.workOrder.update({
          where: { id },
          data: { status: validatedData.status },
        });
      }
    });

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
