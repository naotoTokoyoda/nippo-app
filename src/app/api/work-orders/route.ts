import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';
import { z } from 'zod';

// 期区分を自動判定する関数
function determineTerm(frontNumber: string, backNumber: string): string {
  if (frontNumber === '5927') {
    if (backNumber.includes('J')) {
      return '59期-JFE';
    }
    return '59期';
  }
  if (frontNumber === '6028') {
    return '60期';
  }
  // その他のパターンも追加可能
  return `${frontNumber}期`;
}

// 工番登録用のスキーマ
const createWorkOrderSchema = z.object({
  frontNumber: z.string().min(4).max(4).regex(/^\d{4}$/, '工番（前番）は4桁の数字で入力してください'),
  backNumber: z.string().min(1, '工番（後番）は必須です'),
  customerId: z.string().min(1, '顧客は必須です'),
  projectName: z.string().min(1, '作業名称は必須です'),
  handling: z.string().optional(),
  quantity: z.number().optional(),
});

// 工番を作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createWorkOrderSchema.parse(body);

    // 重複チェック
    const existingWorkOrder = await prisma.workOrder.findUnique({
      where: {
        frontNumber_backNumber: {
          frontNumber: validatedData.frontNumber,
          backNumber: validatedData.backNumber,
        },
      },
    });

    if (existingWorkOrder) {
      return NextResponse.json(
        { error: 'この工番は既に登録されています' },
        { status: 409 }
      );
    }

    // 顧客の存在確認
    const customer = await prisma.customer.findUnique({
      where: { id: validatedData.customerId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: '指定された顧客が見つかりません' },
        { status: 404 }
      );
    }

    // 期区分を自動判定
    const term = determineTerm(validatedData.frontNumber, validatedData.backNumber);

    // 工番を作成
    const workOrder = await prisma.workOrder.create({
      data: {
        frontNumber: validatedData.frontNumber,
        backNumber: validatedData.backNumber,
        customerId: validatedData.customerId,
        projectName: validatedData.projectName,
        handling: validatedData.handling,
        quantity: validatedData.quantity,
        term,
        status: 'aggregating',
      },
      include: {
        customer: true,
      },
    });

    return NextResponse.json({
      id: workOrder.id,
      workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
      customerName: workOrder.customer.name,
      projectName: workOrder.projectName,
      term: workOrder.term,
      status: workOrder.status,
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      logger.validationError('work-order-api', error.issues);
      return NextResponse.json(
        { error: 'リクエストデータが無効です', details: error.issues },
        { status: 400 }
      );
    }
    logger.apiError('/api/work-orders', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: '工番の登録に失敗しました' },
      { status: 500 }
    );
  }
}

// 工番一覧を取得（集計対象外も含む）
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeAll = searchParams.get('includeAll') === 'true';

    const whereCondition = includeAll ? {} : { status: 'aggregating' };

    const workOrders = await prisma.workOrder.findMany({
      where: whereCondition,
      include: {
        customer: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = workOrders.map(workOrder => ({
      id: workOrder.id,
      workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`,
      customerName: workOrder.customer.name,
      projectName: workOrder.projectName,
      term: workOrder.term,
      status: workOrder.status,
      createdAt: workOrder.createdAt.toISOString(),
    }));

    return NextResponse.json(result);

  } catch (error) {
    logger.apiError('/api/work-orders', error instanceof Error ? error : new Error('Unknown error'));
    return NextResponse.json(
      { error: '工番一覧の取得に失敗しました' },
      { status: 500 }
    );
  }
}
