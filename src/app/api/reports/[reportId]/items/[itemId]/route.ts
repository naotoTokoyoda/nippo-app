import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { formatDateToISO, createJSTDateTime, formatUTCToJSTTime } from '@/utils/timeCalculation';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string; itemId: string }> }
) {
  try {
    const { reportId, itemId } = await params;
    const body = await request.json();
    const { customerName, workNumberFront, workNumberBack, name, startTime, endTime, machineType, remarks, workStatus } = body;

    // 客先を取得または作成
    let customer = await prisma.customer.findFirst({
      where: { name: customerName }
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          code: customerName.substring(0, 20), // 簡易的なコード生成
        }
      });
    }

    // 工番を取得または作成
    let workOrder = await prisma.workOrder.findFirst({
      where: {
        frontNumber: workNumberFront,
        backNumber: workNumberBack,
      }
    });

    if (!workOrder) {
      workOrder = await prisma.workOrder.create({
        data: {
          frontNumber: workNumberFront,
          backNumber: workNumberBack,
          description: name,
          customerId: customer.id,
        }
      });
    }

    // 機械を取得または作成
    let machine = await prisma.machine.findFirst({
      where: { category: machineType }
    });

    if (!machine) {
      machine = await prisma.machine.create({
        data: {
          name: machineType,
          category: machineType,
        }
      });
    }

    // レポートの日付を取得
    const report = await prisma.report.findUnique({
      where: { id: reportId }
    });

    if (!report) {
      return NextResponse.json(
        { success: false, error: 'レポートが見つかりません' },
        { status: 404 }
      );
    }

    // 時間をDateTimeに変換（JST基準でUTC時間として保存）
    const reportDate = formatDateToISO(report.date);
    const startDateTime = createJSTDateTime(reportDate, startTime);
    const endDateTime = createJSTDateTime(reportDate, endTime);

    // レポートアイテムを更新
    const updatedItem = await prisma.reportItem.update({
      where: { id: itemId },
      data: {
        customerId: customer.id,
        workOrderId: workOrder.id,
        machineId: machine.id,
        startTime: startDateTime,
        endTime: endDateTime,
        workStatus: workStatus || 'completed',
        workDescription: name, // 作業内容をworkDescriptionに保存
        remarks: remarks,
      },
      include: {
        customer: true,
        workOrder: true,
        machine: true,
        report: {
          include: {
            worker: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: '作業項目が正常に更新されました',
      data: {
        id: updatedItem.id,
        reportId: updatedItem.reportId,
        reportDate: formatDateToISO(updatedItem.report.date),
        workerName: updatedItem.report.worker.name,
        customerName: updatedItem.customer.name,
        workNumberFront: updatedItem.workOrder.frontNumber,
        workNumberBack: updatedItem.workOrder.backNumber,
        name: updatedItem.workDescription || updatedItem.workOrder.description || '未入力', // workDescriptionを優先
        startTime: formatUTCToJSTTime(updatedItem.startTime),
        endTime: formatUTCToJSTTime(updatedItem.endTime),
        machineType: updatedItem.machine.category,
        remarks: updatedItem.remarks || '',
        workStatus: updatedItem.workStatus || 'completed',
      },
    });

  } catch (error) {
    logger.apiError('/api/reports/[reportId]/items/[itemId]', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { success: false, error: '作業項目の更新に失敗しました' },
      { status: 500 }
    );
  }
}
