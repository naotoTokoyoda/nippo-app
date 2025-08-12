'use client'

import { useState, useEffect } from 'react'
import EnvironmentBadge from './EnvironmentBadge'

interface DatabaseHealth {
  success: boolean
  timestamp: string
  environment: {
    nodeEnv: string
    databaseUrl: string
    isDevelopment: boolean
    isProduction: boolean
  }
  database: {
    connection: {
      success: boolean
      message: string
    }
    stats: {
      users: number
      customers: number
      machines: number
      workOrders: number
      reports: number
    } | null
  }
}

interface MigrationResult {
  success: boolean
  message: string
  timestamp: string
}

export default function DatabaseManager() {
  const [health, setHealth] = useState<DatabaseHealth | null>(null)
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)

  const checkHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/database/health')
      const data = await response.json()
      setHealth(data)
    } catch (error) {
      console.error('ヘルスチェックエラー:', error)
      setHealth({
        success: false,
        timestamp: new Date().toISOString(),
        environment: {
          nodeEnv: 'unknown',
          databaseUrl: 'error',
          isDevelopment: false,
          isProduction: false
        },
        database: {
          connection: {
            success: false,
            message: '接続エラー'
          },
          stats: null
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const migrateData = async () => {
    setMigrating(true)
    try {
      const response = await fetch('/api/database/migrate', {
        method: 'POST'
      })
      const data = await response.json()
      setMigrationResult(data)
      
      // 移行後にヘルスチェックを更新
      if (data.success) {
        setTimeout(checkHealth, 1000)
      }
    } catch (error) {
      console.error('移行エラー:', error)
      setMigrationResult({
        success: false,
        message: '移行に失敗しました',
        timestamp: new Date().toISOString()
      })
    } finally {
      setMigrating(false)
    }
  }

  useEffect(() => {
    checkHealth()
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">データベース管理</h1>
        <EnvironmentBadge />
      </div>

      {/* ヘルスチェック */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">データベース状態</h2>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '確認中...' : '更新'}
          </button>
        </div>

        {health && (
          <div className="space-y-4">
            {/* 環境情報 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">環境</div>
                <div className="font-medium">{health.environment.nodeEnv}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">DB接続</div>
                <div className="font-medium">{health.environment.databaseUrl}</div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">接続状態</div>
                <div className={`font-medium ${health.database.connection.success ? 'text-green-600' : 'text-red-600'}`}>
                  {health.database.connection.success ? '接続中' : '接続エラー'}
                </div>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <div className="text-sm text-gray-600">最終更新</div>
                <div className="font-medium text-sm">
                  {new Date(health.timestamp).toLocaleString('ja-JP')}
                </div>
              </div>
            </div>

            {/* 統計情報 */}
            {health.database.stats && (
              <div className="bg-gray-50 p-4 rounded">
                <h3 className="font-medium mb-3">データ統計</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{health.database.stats.users}</div>
                    <div className="text-sm text-gray-600">作業者</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{health.database.stats.customers}</div>
                    <div className="text-sm text-gray-600">客先</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{health.database.stats.machines}</div>
                    <div className="text-sm text-gray-600">機械</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{health.database.stats.workOrders}</div>
                    <div className="text-sm text-gray-600">工番</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{health.database.stats.reports}</div>
                    <div className="text-sm text-gray-600">日報</div>
                  </div>
                </div>
              </div>
            )}

            {/* 接続メッセージ */}
            <div className={`p-3 rounded ${health.database.connection.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {health.database.connection.message}
            </div>
          </div>
        )}
      </div>

      {/* データ移行 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">データ移行</h2>
          <button
            onClick={migrateData}
            disabled={migrating || !health?.database.connection.success}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            {migrating ? '移行中...' : 'ローカルストレージから移行'}
          </button>
        </div>

        {migrationResult && (
          <div className={`p-3 rounded ${migrationResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            <div className="font-medium">{migrationResult.message}</div>
            <div className="text-sm mt-1">
              {new Date(migrationResult.timestamp).toLocaleString('ja-JP')}
            </div>
          </div>
        )}

        <div className="text-sm text-gray-600 mt-2">
          ローカルストレージに保存されている日報データをデータベースに移行します。
        </div>
      </div>

      {/* 操作ガイド */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">操作ガイド</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• データベース接続を確認してから移行を実行してください</li>
          <li>• 移行は既存のデータを上書きしません</li>
          <li>• エラーが発生した場合は環境変数を確認してください</li>
        </ul>
      </div>
    </div>
  )
}
