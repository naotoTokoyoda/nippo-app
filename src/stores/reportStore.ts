import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DailyReportData } from '@/components/DailyReport'

interface ReportStore {
  // 状態
  reports: DailyReportData[]
  
  // アクション
  addReport: (report: DailyReportData) => void
  deleteReport: (id: string) => void
  clearAllData: () => void
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set, get) => ({
      // 初期状態
      reports: [],

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

      // 全データをクリア
      clearAllData: () => {
        set({
          reports: []
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