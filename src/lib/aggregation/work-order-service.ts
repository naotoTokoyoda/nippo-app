/**
 * 工番取得・作成・同期サービス
 * 
 * 工番データの取得、Jootoタスクとの同期、顧客管理を担当
 */

import { PrismaClient } from '@prisma/client';
import { getAllAggregationTasks } from '@/lib/jooto-api';
import { logger } from '@/lib/logger';

/**
 * 工番取得に必要なinclude設定
 */
export const WORK_ORDER_INCLUDE = {
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
} as const;

/**
 * Jootoタスクの簡易型定義
 */
interface JootoTaskInfo {
  taskId: number;
  workNumberFront: string;
  workNumberBack: string;
  customerName: string;
  workName: string;
  status: string;
}

/**
 * 工番取得結果の型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WorkOrderWithRelations = any;

/**
 * 通常の工番IDから工番を取得
 */
export async function getWorkOrderById(
  id: string,
  prisma: PrismaClient
): Promise<WorkOrderWithRelations | null> {
  return await prisma.workOrder.findUnique({
    where: { id },
    include: WORK_ORDER_INCLUDE,
  });
}

/**
 * JootoタスクIDから工番を検索（データベースのみ）
 * 
 * @param taskId Jootoタスクid
 * @param prisma Prismaクライアント
 * @returns 工番データ or null
 */
export async function findWorkOrderByJootoTaskId(
  taskId: string,
  prisma: PrismaClient
): Promise<WorkOrderWithRelations | null> {
  logger.info(`Searching database for Jooto task ID: ${taskId}`);
  
  return await prisma.workOrder.findFirst({
    where: {
      OR: [
        { frontNumber: { contains: taskId } },
        { backNumber: { contains: taskId } },
      ],
    },
    include: WORK_ORDER_INCLUDE,
  });
}

/**
 * Jooto APIからタスクを検索
 * 
 * @param taskId タスクID
 * @returns Jootoタスク情報 or null
 */
export async function findJootoTaskById(taskId: string): Promise<JootoTaskInfo | null> {
  // 環境変数の確認
  if (!process.env.JOOTO_API_KEY || !process.env.JOOTO_BOARD_ID || !process.env.JOOTO_DELIVERED_LIST_ID) {
    logger.warn('Jooto API環境変数が未設定', {
      hasApiKey: !!process.env.JOOTO_API_KEY,
      hasBoardId: !!process.env.JOOTO_BOARD_ID,
      hasDeliveredListId: !!process.env.JOOTO_DELIVERED_LIST_ID,
    });
    return null;
  }

  logger.info(`Attempting to fetch Jooto tasks for task ID: ${taskId}`);
  const allTasks = await getAllAggregationTasks();
  logger.info(`Found ${allTasks.length} tasks across all lists`);
  
  // デバッグ: 取得したタスクIDをログ出力
  if (allTasks.length > 0) {
    const taskIds = allTasks.slice(0, 5).map(t => t.taskId);
    logger.info(`Sample task IDs: ${taskIds.join(', ')}`);
  }
  
  const jootoTask = allTasks.find(task => {
    const match = task.taskId.toString() === taskId;
    if (match) {
      logger.info(`Found matching task: ${task.taskId} === ${taskId} (status: ${task.status})`);
    }
    return match;
  });
  
  if (!jootoTask) {
    logger.warn(`Jooto task not found for ID: ${taskId}`, {
      taskId,
      searchedId: taskId,
      totalTaskCount: allTasks.length,
      availableTaskIds: allTasks.map(t => t.taskId.toString())
    });
    return null;
  }
  
  logger.info(`Found Jooto task: ${jootoTask.workNumberFront}-${jootoTask.workNumberBack}`);
  return jootoTask;
}

/**
 * 顧客を検索または作成
 * 
 * @param customerName 顧客名
 * @param prisma Prismaクライアント
 * @returns 顧客データ
 */
async function findOrCreateCustomer(customerName: string, prisma: PrismaClient) {
  let customer = await prisma.customer.findFirst({
    where: { name: customerName },
  });

  if (!customer) {
    // 顧客コードを生成（顧客名の最初の3文字 + ランダム数字）
    const customerCode = customerName.slice(0, 3) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    
    customer = await prisma.customer.create({
      data: { 
        name: customerName,
        code: customerCode,
      },
    });
    logger.info(`Created new customer: ${customerName} (${customerCode})`);
  }

  return customer;
}

/**
 * Jootoタスク情報から工番を作成
 * 
 * @param jootoTask Jootoタスク情報
 * @param prisma Prismaクライアント
 * @returns 作成された工番データ
 */
export async function createWorkOrderFromJootoTask(
  jootoTask: JootoTaskInfo,
  prisma: PrismaClient
): Promise<WorkOrderWithRelations> {
  // 顧客を検索または作成
  const customer = await findOrCreateCustomer(jootoTask.customerName, prisma);

  // 工番データを作成（Jootoのステータスをそのまま使用）
  const workOrder = await prisma.workOrder.create({
    data: {
      frontNumber: jootoTask.workNumberFront,
      backNumber: jootoTask.workNumberBack,
      customerId: customer.id,
      projectName: jootoTask.workName,
      status: jootoTask.status,
    },
    include: WORK_ORDER_INCLUDE,
  });

  logger.info(`Created new work order from Jooto task: ${jootoTask.workNumberFront}-${jootoTask.workNumberBack}`);
  return workOrder;
}

/**
 * 既存の工番とJootoタスクのステータスを同期
 * 
 * @param workOrder 既存の工番データ
 * @param jootoTask Jootoタスク情報
 * @param prisma Prismaクライアント
 * @returns 更新された工番データ or 元の工番データ
 */
export async function syncWorkOrderStatusWithJooto(
  workOrder: WorkOrderWithRelations,
  jootoTask: JootoTaskInfo,
  prisma: PrismaClient
): Promise<WorkOrderWithRelations> {
  // ステータスが異なる場合のみ更新
  if (workOrder.status !== jootoTask.status) {
    logger.info(`Syncing status from Jooto: ${workOrder.status} -> ${jootoTask.status}`);
    
    return await prisma.workOrder.update({
      where: { id: workOrder.id },
      data: { status: jootoTask.status },
      include: WORK_ORDER_INCLUDE,
    });
  }

  return workOrder;
}

/**
 * 工番番号から既存の工番を検索
 * 
 * @param frontNumber 前番号
 * @param backNumber 後番号
 * @param prisma Prismaクライアント
 * @returns 工番データ or null
 */
export async function findWorkOrderByNumber(
  frontNumber: string,
  backNumber: string,
  prisma: PrismaClient
): Promise<WorkOrderWithRelations | null> {
  return await prisma.workOrder.findUnique({
    where: {
      frontNumber_backNumber: {
        frontNumber,
        backNumber,
      },
    },
    include: WORK_ORDER_INCLUDE,
  });
}

/**
 * JootoタスクIDから工番を取得（Jooto API経由で作成・同期を含む）
 * 
 * @param taskId JootoタスクID
 * @param prisma Prismaクライアント
 * @returns 工番データ、エラー情報、または利用可能なタスクIDリスト
 */
export async function getWorkOrderByJootoTaskId(
  taskId: string,
  prisma: PrismaClient
): Promise<{
  workOrder?: WorkOrderWithRelations;
  error?: string;
  details?: string;
  availableTaskIds?: string[];
}> {
  // まずデータベースから検索
  let workOrder = await findWorkOrderByJootoTaskId(taskId, prisma);

  if (workOrder) {
    logger.info(`Found work order in database for Jooto task ID: ${taskId}`, {
      workOrderId: workOrder.id,
      workNumber: `${workOrder.frontNumber}-${workOrder.backNumber}`
    });
    return { workOrder };
  }

  // データベースにない場合は、Jooto APIを試行
  try {
    const jootoTask = await findJootoTaskById(taskId);
    
    if (!jootoTask) {
      // 環境変数未設定の場合
      if (!process.env.JOOTO_API_KEY || !process.env.JOOTO_BOARD_ID) {
        return {
          error: `工番が見つかりません（タスクID: ${taskId}）`,
          details: 'データベースに工番が登録されていません。Jooto APIの設定も確認できません。'
        };
      }
      
      // タスクが見つからない場合
      const allTasks = await getAllAggregationTasks();
      return {
        error: `Jootoタスクが見つかりません（ID: ${taskId}）`,
        details: '納品済み・集計中・Freee納品書登録済みリストに該当するタスクがありません。タスクIDが正しいか確認してください。',
        availableTaskIds: allTasks.slice(0, 10).map(t => t.taskId.toString())
      };
    }

    // 工番番号で既存データを確認
    workOrder = await findWorkOrderByNumber(
      jootoTask.workNumberFront,
      jootoTask.workNumberBack,
      prisma
    );

    if (!workOrder) {
      // 工番データが存在しない場合は作成
      workOrder = await createWorkOrderFromJootoTask(jootoTask, prisma);
    } else {
      // 既存の工番データがある場合、Jootoの最新ステータスで同期
      workOrder = await syncWorkOrderStatusWithJooto(workOrder, jootoTask, prisma);
    }

    return { workOrder };
  } catch (jootoError) {
    const error = jootoError instanceof Error ? jootoError : new Error(String(jootoError));
    logger.error(
      `Jooto API取得エラー（データベース検索も失敗） - taskId: ${taskId}`, 
      error
    );
    return {
      error: `工番が見つかりません。Jooto APIとデータベースの両方で見つかりませんでした。`,
      details: error.message,
    };
  }
}

/**
 * 工番を取得（通常IDまたはJootoタスクID）
 * 
 * @param id 工番IDまたは'jooto-{taskId}'形式のID
 * @param prisma Prismaクライアント
 * @returns 工番データ、またはエラー情報
 */
export async function getWorkOrder(
  id: string,
  prisma: PrismaClient
): Promise<{
  workOrder?: WorkOrderWithRelations;
  error?: string;
  details?: string;
  availableTaskIds?: string[];
  status?: number;
}> {
  // JootoタスクIDの場合
  if (id.startsWith('jooto-')) {
    const taskId = id.replace('jooto-', '');
    logger.info(`Processing Jooto task ID: ${taskId}`);
    
    const result = await getWorkOrderByJootoTaskId(taskId, prisma);
    
    if (result.error) {
      return {
        ...result,
        status: 404,
      };
    }
    
    return result;
  }

  // 通常の工番IDの場合
  const workOrder = await getWorkOrderById(id, prisma);
  
  if (!workOrder) {
    return {
      error: '工番が見つかりません',
      status: 404,
    };
  }

  return { workOrder };
}

