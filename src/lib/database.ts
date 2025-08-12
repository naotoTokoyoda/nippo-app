import { prisma } from './prisma'

// データベース接続の確認
export async function checkDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return { success: true, message: 'データベース接続成功' }
  } catch (error) {
    console.error('データベース接続エラー:', error)
    return { success: false, message: 'データベース接続失敗', error }
  }
}

// 環境情報の取得
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? '設定済み' : '未設定',
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
  }
}

// データベース統計情報の取得
export async function getDatabaseStats() {
  try {
    const [userCount, customerCount, machineCount, workOrderCount, reportCount] = await Promise.all([
      prisma.user.count(),
      prisma.customer.count(),
      prisma.machine.count(),
      prisma.workOrder.count(),
      prisma.report.count(),
    ])

    return {
      users: userCount,
      customers: customerCount,
      machines: machineCount,
      workOrders: workOrderCount,
      reports: reportCount,
    }
  } catch (error) {
    console.error('データベース統計取得エラー:', error)
    return null
  }
}
