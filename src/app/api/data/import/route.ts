import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { 
  parseCSVData, 
  convertSpreadsheetToDailyReports, 
  validateSpreadsheetData
} from '@/lib/spreadsheet-import';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const csvData = formData.get('csvData') as string;

    if (!file && !csvData) {
      return NextResponse.json(
        { error: 'ファイルまたはCSVデータが必要です' },
        { status: 400 }
      );
    }

    let csvContent: string;

    if (file) {
      // ファイルからCSVデータを読み取り
      csvContent = await file.text();
    } else {
      // 直接CSVデータを使用
      csvContent = csvData;
    }

    // CSVデータをパース
    const rows = parseCSVData(csvContent);
    
    // データ検証
    const validation = validateSpreadsheetData(rows);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'データにエラーがあります',
          details: validation.errors 
        },
        { status: 400 }
      );
    }

    // 日報データに変換
    const dailyReports = convertSpreadsheetToDailyReports(rows);

    // データベースに移行
    const results = await migrateReportsToDatabase(dailyReports);

    return NextResponse.json({
      message: 'データのインポートが完了しました',
      summary: {
        totalReports: dailyReports.length,
        totalWorkItems: dailyReports.reduce((sum, report) => sum + report.workItems.length, 0),
        importedReports: results.importedReports,
        importedWorkItems: results.importedWorkItems,
        skippedItems: results.skippedItems,
        errors: results.errors
      }
    });

  } catch (error) {
    console.error('データインポートエラー:', error);
    return NextResponse.json(
      { error: 'データのインポート中にエラーが発生しました' },
      { status: 500 }
    );
  }
}

async function migrateReportsToDatabase(dailyReports: ReturnType<typeof convertSpreadsheetToDailyReports>) {
  const results = {
    importedReports: 0,
    importedWorkItems: 0,
    skippedItems: 0,
    errors: [] as string[]
  };

  for (const report of dailyReports) {
    try {
      // 作業者を検索または作成
      let worker = await prisma.user.findFirst({
        where: { name: report.workerName }
      });

      if (!worker) {
        // 作業者が存在しない場合は作成
        worker = await prisma.user.create({
          data: { name: report.workerName }
        });
      }

      // 日報を作成
      const createdReport = await prisma.report.create({
        data: {
          date: new Date(report.date),
          workerId: worker.id,
          submittedAt: new Date(report.submittedAt || new Date())
        }
      });

      results.importedReports++;

      // 日報項目を作成
      for (const workItem of report.workItems) {
        try {
          // 客先を検索または作成
          let customer = await prisma.customer.findFirst({
            where: { name: workItem.customerName }
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: { 
                name: workItem.customerName,
                code: `CUST${Date.now()}` // 一時的なコード
              }
            });
          }

          // 工番を検索または作成
          let workOrder = await prisma.workOrder.findFirst({
            where: {
              frontNumber: workItem.workNumberFront,
              backNumber: workItem.workNumberBack
            }
          });

          if (!workOrder) {
            workOrder = await prisma.workOrder.create({
              data: {
                frontNumber: workItem.workNumberFront,
                backNumber: workItem.workNumberBack,
                description: workItem.name,
                customerId: customer.id
              }
            });
          }

          // 機械を検索または作成
          let machine = await prisma.machine.findFirst({
            where: { name: workItem.machineType }
          });

          if (!machine) {
            machine = await prisma.machine.create({
              data: {
                name: workItem.machineType,
                category: 'その他'
              }
            });
          }

          // 開始時刻と終了時刻を組み合わせてDateTimeに変換
          const startDateTime = new Date(`${report.date}T${workItem.startTime}:00`);
          const endDateTime = new Date(`${report.date}T${workItem.endTime}:00`);

          await prisma.reportItem.create({
            data: {
              reportId: createdReport.id,
              customerId: customer.id,
              workOrderId: workOrder.id,
              machineId: machine.id,
              startTime: startDateTime,
              endTime: endDateTime,
              workStatus: workItem.workStatus || 'normal',
              remarks: workItem.remarks || ''
            }
          });

          results.importedWorkItems++;

        } catch (error) {
          results.errors.push(`作業項目 "${workItem.name}" の作成に失敗: ${error}`);
          results.skippedItems++;
        }
      }

    } catch (error) {
      results.errors.push(`日報 "${report.date} - ${report.workerName}" の作成に失敗: ${error}`);
      results.skippedItems++;
    }
  }

  return results;
}

// GET メソッドでサンプルCSVデータを提供
export async function GET() {
  const sampleCSV = `date,workerName,customerName,workNumberFront,workNumberBack,workName,startTime,endTime,machineType,workStatus,remarks
2024-12-01,橋本正朗,㈱TMT,5927,13343,テーパープラグ,08:00,12:00,スマート250 L : NC旋盤,normal,
2024-12-01,橋本正朗,㈱TMT,5927,13278,スリーブ,13:00,17:00,350 : NC旋盤マザック,normal,
2024-12-02,常世田博,㈱天昌電機社,5927,13314,ピン,08:00,14:00,250 : NC旋盤マザック,lunch_overtime,昼残
2024-12-02,常世田博,伊豆山,5927,13339,カップリング,14:00,17:00,MILLAC 1052 VII,normal,`;

  return new NextResponse(sampleCSV, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="sample-import.csv"'
    }
  });
}
