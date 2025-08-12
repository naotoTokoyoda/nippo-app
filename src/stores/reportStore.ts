import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DailyReportData, WorkItemData } from '@/types/daily-report'

interface ReportStore {
  // 状態
  reports: DailyReportData[]
  
  // アクション
  addReport: (report: DailyReportData) => void
  deleteReport: (id: string) => void
  updateWorkItem: (reportId: string, workItemId: string, updatedWorkItem: Partial<WorkItemData>) => void
  clearAllData: () => void
}

export const useReportStore = create<ReportStore>()(
  persist(
    (set) => ({
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

      // 作業項目を更新
      updateWorkItem: (reportId: string, workItemId: string, updatedWorkItem: Partial<WorkItemData>) => {
        set((state) => ({
          reports: state.reports.map(report => {
            if (report.id === reportId) {
              return {
                ...report,
                workItems: report.workItems.map(item => 
                  item.id === workItemId ? { ...item, ...updatedWorkItem } : item
                )
              };
            }
            return report;
          })
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