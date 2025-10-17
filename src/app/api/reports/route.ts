import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { formatDateToISO, getJSTTimestamp, createJSTDateTime, formatUTCToJSTTime } from '@/utils/timeCalculation';

// Prismaの戻り値の型を定義
type ReportItemWithRelations = {
  id: string;
  reportId: string;
  startTime: Date;
  endTime: Date;
  remarks: string | null;
  workStatus: string | null;
  workDescription: string | null; // workDescriptionフィールドを追加
  report: {
    date: Date;
    worker: {
      name: string;
    };
  };
  customer: {
    name: string;
  };
  workOrder: {
    frontNumber: string;
    backNumber: string;
    description: string | null;
  };
  machine: {
    name: string;
  };
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // クエリパラメータを取得
    const month = searchParams.get('month');
    const date = searchParams.get('date'); // 特定の日付フィルター (YYYY-MM-DD)
    const workerName = searchParams.get('workerName');
    const customerName = searchParams.get('customerName');
    const workNumberFront = searchParams.get('workNumberFront');
    const workNumberBack = searchParams.get('workNumberBack');
    const machineType = searchParams.get('machineType');
    
    // ページネーションパラメータ
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;


    
    // レポートフィルターの設定
    let reportFilter: {
      report?: {
        date?: { gte: Date; lte: Date } | Date;
        worker?: { name: string };
      };
    } = {};
    if (month || date || workerName) {
      reportFilter = {
        report: {}
      };
      
      // 日付フィルターの設定
      if (date) {
        // 特定の日付でフィルタリング (YYYY-MM-DD)
        const targetDate = new Date(date + 'T12:00:00.000Z');
        reportFilter.report!.date = targetDate;
      } else if (month) {
        // 月でフィルタリング (YYYY-MM)
        const [year, monthNum] = month.split('-');
        
        // 指定された月の最初の日と最後の日を計算（UTCの正午基準）
        const startDate = new Date(parseInt(year), parseInt(monthNum) - 1, 1, 12, 0, 0, 0);
        const endDate = new Date(parseInt(year), parseInt(monthNum), 0, 12, 0, 0, 0);
        
        reportFilter.report!.date = {
          gte: startDate,
          lte: endDate,
        };
      }

      // 作業者フィルターの設定
      if (workerName) {
        reportFilter.report!.worker = {
          name: workerName,
        };
      }
    }

    // 総件数を取得
    const totalCount = await prisma.reportItem.count({
      where: {
        ...reportFilter,
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
            name: machineType,
          },
        }),
      },
    });

    // 単一の最適化されたクエリでデータを取得（ページネーション付き）
    const reportItems = await prisma.reportItem.findMany({
      where: {
        ...reportFilter,
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
            name: machineType,
          },
        }),
      },
      select: {
        id: true,
        reportId: true,
        startTime: true,
        endTime: true,
        workStatus: true,
        workDescription: true, // workDescriptionを取得
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
            name: true,
          },
        },
      },
      orderBy: {
        report: {
          date: 'desc', // 降順に変更（最新日付が上に表示）
        },
      },
      skip,
      take: limit,
    });

    // フロントエンドで使用しやすい形式に変換
    const formattedItems = reportItems.map((item: ReportItemWithRelations) => ({
      id: item.id,
      reportId: item.reportId,
      reportDate: formatDateToISO(item.report.date),
      workerName: item.report.worker.name,
      customerName: item.customer.name,
      workNumberFront: item.workOrder.frontNumber,
      workNumberBack: item.workOrder.backNumber,
      name: item.workDescription || item.workOrder.description || '未入力', // workDescriptionを優先、フォールバック付き
      startTime: formatUTCToJSTTime(item.startTime),
      endTime: formatUTCToJSTTime(item.endTime),
      machineType: item.machine.name,
      remarks: item.remarks || '',
      workStatus: item.workStatus || 'completed',
    }));

    // ユニークなレポートIDを取得してレポート数を計算
    const uniqueReportIds = [...new Set(reportItems.map((item: ReportItemWithRelations) => item.reportId))];

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

    // 既存のレポートをチェック
    let report = await prisma.report.findFirst({
      where: {
        date: new Date(date + 'T12:00:00.000Z'),
        workerId: worker.id,
      },
    });

    if (!report) {
      // 新規レポートを作成（日本時間の日付をUTCの正午として保存）
      report = await prisma.report.create({
        data: {
          date: new Date(date + 'T12:00:00.000Z'), // UTCの正午として保存（タイムゾーンの影響を回避）
          workerId: worker.id,
          submittedAt: new Date(getJSTTimestamp()),
        },
      });
    }

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
      const startDateTime = createJSTDateTime(date, workItem.startTime);
      const endDateTime = createJSTDateTime(date, workItem.endTime);

      await prisma.reportItem.create({
        data: {
          reportId: report.id,
          customerId: customer.id,
          workOrderId: workOrder.id,
          machineId: machine.id,
          startTime: startDateTime,
          endTime: endDateTime,
          workStatus: workItem.workStatus || 'completed',
          workDescription: workItem.name, // 作業内容をworkDescriptionに保存
          remarks: workItem.remarks,
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: report.submittedAt.getTime() === report.createdAt.getTime() 
        ? '日報が正常に保存されました' 
        : '既存の日報に作業項目が追加されました',
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
