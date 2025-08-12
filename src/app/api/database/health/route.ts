import { NextResponse } from 'next/server'
import { checkDatabaseConnection, getEnvironmentInfo, getDatabaseStats } from '@/lib/database'

export async function GET() {
  try {
    const [connection, envInfo, stats] = await Promise.all([
      checkDatabaseConnection(),
      Promise.resolve(getEnvironmentInfo()),
      getDatabaseStats()
    ])

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: envInfo,
      database: {
        connection,
        stats
      }
    })
  } catch (error) {
    console.error('データベースヘルスチェックエラー:', error)
    return NextResponse.json(
      {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'データベースヘルスチェックに失敗しました'
      },
      { status: 500 }
    )
  }
}
