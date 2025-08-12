import { prisma } from './prisma'
import { DailyReportData } from '@/types/daily-report'
import { WORKER_DATA, CUSTOMER_DATA, MACHINE_DATA, WORK_ORDER_DATA } from '@/data/testData'

// 作業者名からIDを取得
export function getWorkerId(name: string): string | null {
  const worker = WORKER_DATA.find(w => w.name === name)
  return worker?.id || null
}

// 客先名からIDを取得
export function getCustomerId(name: string): string | null {
  const customer = CUSTOMER_DATA.find(c => c.name === name)
  return customer?.id || null
}

// 機械種類名からIDを取得
export function getMachineId(name: string): string | null {
  const machine = MACHINE_DATA.find(m => m.name === name)
  return machine?.id || null
}

// 工番から工番IDを取得
export function getWorkOrderId(frontNumber: string, backNumber: string): string | null {
  const workOrder = WORK_ORDER_DATA.find(w => 
    w.frontNumber === frontNumber && w.backNumber === backNumber
  )
  return workOrder?.id || null
}

// 日報データをデータベース形式に変換
export function convertToDatabaseFormat(report: DailyReportData) {
  const workerId = getWorkerId(report.workerName)
  if (!workerId) {
    throw new Error(`作業者が見つかりません: ${report.workerName}`)
  }

  return {
    date: new Date(report.date),
    workerId,
    submittedAt: report.submittedAt ? new Date(report.submittedAt) : new Date(),
    reportItems: report.workItems.map(item => {
      const customerId = getCustomerId(item.customerName)
      const workOrderId = getWorkOrderId(item.workNumberFront, item.workNumberBack)
      const machineId = getMachineId(item.machineType)

      if (!customerId) {
        throw new Error(`客先が見つかりません: ${item.customerName}`)
      }
      if (!workOrderId) {
        throw new Error(`工番が見つかりません: ${item.workNumberFront}-${item.workNumberBack}`)
      }
      if (!machineId) {
        throw new Error(`機械種類が見つかりません: ${item.machineType}`)
      }

      // 時刻文字列をDateTimeに変換
      const startTime = new Date(`2000-01-01T${item.startTime}:00`)
      const endTime = new Date(`2000-01-01T${item.endTime}:00`)

      return {
        customerId,
        workOrderId,
        machineId,
        startTime,
        endTime,
        workStatus: item.workStatus || null,
        remarks: item.remarks || null,
      }
    })
  }
}

// ローカルストレージから日報データを取得してデータベースに移行
export async function migrateLocalStorageData() {
  try {
    // ローカルストレージからデータを取得（実際の実装では適切な方法で取得）
    const localStorageData = localStorage.getItem('dailyReports')
    if (!localStorageData) {
      console.log('移行するデータが見つかりません')
      return { success: false, message: '移行するデータが見つかりません' }
    }

    const reports: DailyReportData[] = JSON.parse(localStorageData)
    console.log(`${reports.length}件の日報データを移行します`)

    for (const report of reports) {
      const dbFormat = convertToDatabaseFormat(report)
      
      // 既存の日報をチェック
      const existingReport = await prisma.report.findUnique({
        where: {
          date_workerId: {
            date: dbFormat.date,
            workerId: dbFormat.workerId,
          }
        }
      })

      if (existingReport) {
        console.log(`既存の日報が見つかりました: ${report.date} - ${report.workerName}`)
        continue
      }

      // 新しい日報を作成
      await prisma.report.create({
        data: {
          date: dbFormat.date,
          workerId: dbFormat.workerId,
          submittedAt: dbFormat.submittedAt,
          reportItems: {
            create: dbFormat.reportItems
          }
        }
      })

      console.log(`日報を移行しました: ${report.date} - ${report.workerName}`)
    }

    return { success: true, message: `${reports.length}件の日報データを移行しました` }
  } catch (error) {
    console.error('データ移行エラー:', error)
    return { success: false, message: 'データ移行に失敗しました', error }
  }
}
