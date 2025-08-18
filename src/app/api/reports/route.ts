import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを取得
    const month = searchParams.get('month');
    const workerName = searchParams.get('workerName');
    const customerName = searchParams.get('customerName');
    const workNumberFront = searchParams.get('workNumberFront');
    const workNumberBack = searchParams.get('workNumberBack');
    const machineType = searchParams.get('machineType');
    
    // ページネーションパラメータ
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // 日付フィルターの設定
    let dateFilter = {};
    if (month) {
      const [year, monthNum] = month.split('-');
      const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 23, 59, 59, 999);
      
      console.log('日付フィルター:', {
        month,
        year,
        monthNum,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      });
      
      dateFilter = {
        report: {
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      };
    }

    // 作業者フィルターの設定
    let workerFilter = {};
    if (workerName) {
      workerFilter = {
        report: {
          worker: {
            name: workerName,
          },
        },
      };
    }

    // 総件数を取得
    const totalCount = await prisma.reportItem.count({
      where: {
        ...dateFilter,
        ...workerFilter,
        ...(customerName && {
          customer: {
            name: {
              contains: customerName,
              mode: 'insensitive',
            },
          },
        }),
        ...(workNumberFront && {
          workOrder: {
            frontNumber: workNumberFront,
          },
        }),
        ...(workNumberBack && {
          workOrder: {
            backNumber: {
              contains: workNumberBack,
              mode: 'insensitive',
            },
          },
        }),
        ...(machineType && {
          machine: {
            category: machineType,
          },
        }),
      },
    });

    // 単一の最適化されたクエリでデータを取得（ページネーション付き）
    const reportItems = await prisma.reportItem.findMany({
      where: {
        ...dateFilter,
        ...workerFilter,
        ...(customerName && {
          customer: {
            name: {
              contains: customerName,
              mode: 'insensitive',
            },
          },
        }),
        ...(workNumberFront && {
          workOrder: {
            frontNumber: workNumberFront,
          },
        }),
        ...(workNumberBack && {
          workOrder: {
            backNumber: {
              contains: workNumberBack,
              mode: 'insensitive',
            },
          },
        }),
        ...(machineType && {
          machine: {
            category: machineType,
          },
        }),
      },
      select: {
        id: true,
        reportId: true,
        startTime: true,
        endTime: true,
        workStatus: true,
        remarks: true,
        report: {
          select: {
            date: true,
            worker: {
              select: {
                name: true,
              },
            },
          },
        },
        customer: {
          select: {
            name: true,
          },
        },
        workOrder: {
          select: {
            frontNumber: true,
            backNumber: true,
            description: true,
          },
        },
        machine: {
          select: {
            category: true,
          },
        },
      },
      orderBy: {
        report: {
          date: 'asc', // 昇順に変更（1日から月末まで）
        },
      },
      skip,
      take: limit,
    });

    // フロントエンドで使用しやすい形式に変換
    const formattedItems = reportItems.map((item) => ({
      id: item.id,
      reportId: item.reportId,
      reportDate: item.report.date.toISOString().split('T')[0],
      workerName: item.report.worker.name,
      customerName: item.customer.name,
      workNumberFront: item.workOrder.frontNumber,
      workNumberBack: item.workOrder.backNumber,
      name: item.workOrder.description || '未入力',
      startTime: item.startTime.toTimeString().slice(0, 5),
      endTime: item.endTime.toTimeString().slice(0, 5),
      machineType: item.machine.category,
      remarks: item.remarks || '',
      workStatus: item.workStatus || 'completed',
    }));

    // ユニークなレポートIDを取得してレポート数を計算
    const uniqueReportIds = [...new Set(reportItems.map(item => item.reportId))];

    return NextResponse.json({
      success: true,
      data: [], // フロントエンドでは使用しないため空配列
      filteredItems: formattedItems,
      totalCount,
      totalReports: uniqueReportIds.length,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPrevPage: page > 1,
      },
    });

  } catch (error) {
    console.error('日報データ取得エラー:', error);
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    });
    return NextResponse.json(
      { 
        success: false, 
        error: '日報データの取得に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, workerName, workItems } = body;

    // 作業者を取得または作成
    let worker = await prisma.user.findFirst({
      where: { name: workerName }
    });

    if (!worker) {
      worker = await prisma.user.create({
        data: { name: workerName }
      });
    }

    // レポートを作成
    const report = await prisma.report.create({
      data: {
        date: new Date(date),
        workerId: worker.id,
        submittedAt: new Date(),
      },
    });

    // 作業項目を処理
    for (const workItem of workItems) {
      // 客先を取得または作成
      let customer = await prisma.customer.findFirst({
        where: { name: workItem.customerName }
      });

      if (!customer) {
        customer = await prisma.customer.create({
          data: {
            name: workItem.customerName,
            code: workItem.customerName.substring(0, 20), // 簡易的なコード生成
          }
        });
      }

      // 工番を取得または作成
      let workOrder = await prisma.workOrder.findFirst({
        where: {
          frontNumber: workItem.workNumberFront,
          backNumber: workItem.workNumberBack,
        }
      });

      if (!workOrder) {
        workOrder = await prisma.workOrder.create({
          data: {
            frontNumber: workItem.workNumberFront,
            backNumber: workItem.workNumberBack,
            description: workItem.name,
            customerId: customer.id,
          }
        });
      }

      // 機械を取得または作成
      let machine = await prisma.machine.findFirst({
        where: { category: workItem.machineType }
      });

      if (!machine) {
        machine = await prisma.machine.create({
          data: {
            name: workItem.machineType,
            category: workItem.machineType,
          }
        });
      }

      // レポートアイテムを作成
      const [startHour, startMinute] = workItem.startTime.split(':').map(Number);
      const [endHour, endMinute] = workItem.endTime.split(':').map(Number);
      
      const startDateTime = new Date(date);
      startDateTime.setHours(startHour, startMinute, 0, 0);
      
      const endDateTime = new Date(date);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      await prisma.reportItem.create({
        data: {
          reportId: report.id,
          customerId: customer.id,
          workOrderId: workOrder.id,
          machineId: machine.id,
          startTime: startDateTime,
          endTime: endDateTime,
          workStatus: workItem.workStatus || 'completed',
          remarks: workItem.remarks,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: '日報が正常に保存されました',
      reportId: report.id,
    });

  } catch (error) {
    console.error('日報保存エラー:', error);
    return NextResponse.json(
      { success: false, error: '日報の保存に失敗しました' },
      { status: 500 }
    );
  }
}
