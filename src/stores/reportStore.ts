import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DailyReportData } from '@/components/DailyReport'
import { getEnvironment } from '@/utils/env'
import { SAMPLE_REPORTS } from '@/data/testData'

interface ReportStore {
  // 状態
  reports: DailyReportData[]
  isTestDataLoaded: boolean
  
  // アクション
  addReport: (report: DailyReportData) => void
  deleteReport: (id: string) => void
  loadTestData: () => void
  clearAllData: () => void
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      reports: [],
      isTestDataLoaded: false,

      // レポートを追加
      addReport: (report: DailyReportData) => {
        const newReport = {
          ...report,
          id: report.id || Date.now().toString(),
          submittedAt: report.submittedAt || new Date().toISOString()
        };
        set((state) => ({
          reports: [newReport, ...state.reports]
        }));
      },

      // レポートを削除
      deleteReport: (id: string) => {
        set((state) => ({
          reports: state.reports.filter(report => report.id !== id)
        }));
      },

      // テストデータを読み込み（develop環境でのみ有効）
      loadTestData: () => {
        const env = getEnvironment();
        if (env === 'development' || env === 'local') {
          set({
            reports: SAMPLE_REPORTS,
            isTestDataLoaded: true
          });
        } else {
          console.log('テストデータは開発環境でのみ利用可能です');
        }
      },

      // 全データをクリア
      clearAllData: () => {
        set({
          reports: [],
          isTestDataLoaded: false
        });
      },
    }),
    {
      name: 'daily-reports', // ローカルストレージのキー名
      // 必要に応じて部分的な永続化も可能
      // partialize: (state) => ({ reports: state.reports }),
    }
  )
) 