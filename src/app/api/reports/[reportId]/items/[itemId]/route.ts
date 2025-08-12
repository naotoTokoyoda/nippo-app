import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

    // 時間をDateTimeに変換
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    const startDateTime = new Date(report.date);
    startDateTime.setHours(startHour, startMinute, 0, 0);
    
    const endDateTime = new Date(report.date);
    endDateTime.setHours(endHour, endMinute, 0, 0);

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
        reportDate: updatedItem.report.date.toISOString().split('T')[0],
        workerName: updatedItem.report.worker.name,
        customerName: updatedItem.customer.name,
        workNumberFront: updatedItem.workOrder.frontNumber,
        workNumberBack: updatedItem.workOrder.backNumber,
        name: updatedItem.workOrder.description || '未入力',
        startTime: updatedItem.startTime.toTimeString().slice(0, 5),
        endTime: updatedItem.endTime.toTimeString().slice(0, 5),
        machineType: updatedItem.machine.category,
        remarks: updatedItem.remarks || '',
        workStatus: updatedItem.workStatus || 'completed',
      },
    });

  } catch (error) {
    console.error('作業項目更新エラー:', error);
    return NextResponse.json(
      { success: false, error: '作業項目の更新に失敗しました' },
      { status: 500 }
    );
  }
}
