import { NextResponse } from 'next/server'
import { migrateLocalStorageData } from '@/lib/migration'

export async function POST() {
  try {
    const result = await migrateLocalStorageData()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message,
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('データ移行エラー:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'データ移行に失敗しました',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
