import { prisma } from '@/lib/prisma';
import { PaginationInfo } from '@/types/api';
import { formatDateToISO, getJSTTimestamp, createJSTDateTime, formatUTCToJSTTime } from '@/utils/timeCalculation';

// =========================================
// 型定義
// =========================================

export interface ReportFilters {
  month?: string | null;
  date?: string | null;
  workerName?: string | null;
  customerName?: string | null;
  workNumberFront?: string | null;
  workNumberBack?: string | null;
  machineType?: string | null;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface FormattedReportItem {
  id: string;
  reportId: string;
  reportDate: string;
  workerName: string;
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  remarks: string;
  workStatus: string;
}

export interface GetReportsResult {
  filteredItems: FormattedReportItem[];
  totalCount: number;
  totalReports: number;
  pagination: PaginationInfo;
}

export interface WorkItemInput {
  customerName: string;
  workNumberFront: string;
  workNumberBack: string;
  name: string;
  startTime: string;
  endTime: string;
  machineType: string;
  workStatus?: string;
  remarks?: string;
}

export interface CreateReportInput {
  date: string;
  workerName: string;
  workItems: WorkItemInput[];
}

export interface CreateReportResult {
  reportId: string;
  isNew: boolean;
}

// =========================================
// フィルター構築
// =========================================

type ReportFilterType = {
  report?: {
    date?: { gte: Date; lte: Date } | Date;
    worker?: { name: string };
  };
};

function buildReportFilter(filters: ReportFilters): ReportFilterType {
  const { month, date, workerName } = filters;
  
  if (!month && !date && !workerName) {
    return {};
  }

  const reportFilter: ReportFilterType = { report: {} };

  // 日付フィルター（日単位で範囲検索）
  if (date) {
    // 特定日の0:00〜23:59:59をカバー
    const startOfDay = new Date(date + 'T00:00:00.000Z');
    const endOfDay = new Date(date + 'T23:59:59.999Z');
    reportFilter.report!.date = { gte: startOfDay, lte: endOfDay };
  } else if (month) {
    const [year, monthNum] = month.split('-');
    // 月の1日 0:00 〜 月末 23:59:59をカバー
    const startDate = new Date(`${year}-${monthNum}-01T00:00:00.000Z`);
    const lastDay = new Date(parseInt(year), parseInt(monthNum), 0).getDate();
    const endDate = new Date(`${year}-${monthNum}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`);
    reportFilter.report!.date = { gte: startDate, lte: endDate };
  }

  // 作業者フィルター
  if (workerName) {
    reportFilter.report!.worker = { name: workerName };
  }

  return reportFilter;
}

function buildWhereClause(filters: ReportFilters) {
  const reportFilter = buildReportFilter(filters);
  const { customerName, workNumberFront, workNumberBack, machineType } = filters;

  // 工番フィルター（前番・後番を1つのオブジェクトにまとめる）
  const workOrderFilter: { frontNumber?: string; backNumber?: string } = {};
  if (workNumberFront) {
    workOrderFilter.frontNumber = workNumberFront;
  }
  if (workNumberBack) {
    workOrderFilter.backNumber = workNumberBack;
  }

  return {
    ...reportFilter,
    ...(customerName && {
      customer: {
        name: { contains: customerName, mode: 'insensitive' as const },
      },
    }),
    ...(Object.keys(workOrderFilter).length > 0 && {
      workOrder: workOrderFilter,
    }),
    ...(machineType && {
      machine: { name: machineType },
    }),
  };
}

// =========================================
// GET: レポート一覧取得
// =========================================

export async function getReports(
  filters: ReportFilters,
  pagination: PaginationParams
): Promise<GetReportsResult> {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const whereClause = buildWhereClause(filters);

  // 総件数取得
  const totalCount = await prisma.reportItem.count({ where: whereClause });

  // データ取得
  const reportItems = await prisma.reportItem.findMany({
    where: whereClause,
    select: {
      id: true,
      reportId: true,
      startTime: true,
      endTime: true,
      workStatus: true,
      workDescription: true,
      remarks: true,
      report: {
        select: {
          date: true,
          worker: { select: { name: true } },
        },
      },
      customer: { select: { name: true } },
      workOrder: {
        select: {
          frontNumber: true,
          backNumber: true,
          description: true,
        },
      },
      machine: { select: { name: true } },
    },
    orderBy: { report: { date: 'desc' } },
    skip,
    take: limit,
  });

  // フォーマット変換
  const formattedItems: FormattedReportItem[] = reportItems.map((item) => ({
    id: item.id,
    reportId: item.reportId,
    reportDate: formatDateToISO(item.report.date),
    workerName: item.report.worker.name,
    customerName: item.customer.name,
    workNumberFront: item.workOrder.frontNumber,
    workNumberBack: item.workOrder.backNumber,
    name: item.workDescription || item.workOrder.description || '未入力',
    startTime: formatUTCToJSTTime(item.startTime),
    endTime: formatUTCToJSTTime(item.endTime),
    machineType: item.machine.name,
    remarks: item.remarks || '',
    workStatus: item.workStatus || 'completed',
  }));

  // ユニークレポート数
  const uniqueReportIds = [...new Set(reportItems.map((item) => item.reportId))];

  const paginationInfo: PaginationInfo = {
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit),
    hasNextPage: page * limit < totalCount,
    hasPrevPage: page > 1,
  };

  return {
    filteredItems: formattedItems,
    totalCount,
    totalReports: uniqueReportIds.length,
    pagination: paginationInfo,
  };
}

// =========================================
// POST: レポート作成
// =========================================

async function getOrCreateWorker(workerName: string) {
  let worker = await prisma.user.findFirst({ where: { name: workerName } });
  if (!worker) {
    worker = await prisma.user.create({ data: { name: workerName } });
  }
  return worker;
}

async function getOrCreateCustomer(customerName: string) {
  let customer = await prisma.customer.findFirst({ where: { name: customerName } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        name: customerName,
        code: customerName.substring(0, 20),
      },
    });
  }
  return customer;
}

async function getOrCreateWorkOrder(
  frontNumber: string,
  backNumber: string,
  description: string,
  customerId: string
) {
  let workOrder = await prisma.workOrder.findFirst({
    where: { frontNumber, backNumber },
  });
  if (!workOrder) {
    workOrder = await prisma.workOrder.create({
      data: { frontNumber, backNumber, description, customerId },
    });
  }
  return workOrder;
}

async function getOrCreateMachine(machineName: string) {
  let machine = await prisma.machine.findFirst({ where: { name: machineName } });
  if (!machine) {
    machine = await prisma.machine.create({
      data: { name: machineName, isActive: true },
    });
  }
  return machine;
}

export async function createReport(input: CreateReportInput): Promise<CreateReportResult> {
  const { date, workerName, workItems } = input;

  // 作業者を取得または作成
  const worker = await getOrCreateWorker(workerName);

  // 既存レポートをチェック
  const reportDate = new Date(date + 'T12:00:00.000Z');
  let report = await prisma.report.findFirst({
    where: { date: reportDate, workerId: worker.id },
  });

  const isNew = !report;

  if (!report) {
    report = await prisma.report.create({
      data: {
        date: reportDate,
        workerId: worker.id,
        submittedAt: new Date(getJSTTimestamp()),
      },
    });
  }

  // 作業項目を処理
  for (const workItem of workItems) {
    const customer = await getOrCreateCustomer(workItem.customerName);
    const workOrder = await getOrCreateWorkOrder(
      workItem.workNumberFront,
      workItem.workNumberBack,
      workItem.name,
      customer.id
    );
    const machine = await getOrCreateMachine(workItem.machineType);

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
        workDescription: workItem.name,
        remarks: workItem.remarks,
      },
    });
  }

  return { reportId: report.id, isNew };
}

