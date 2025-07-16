'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { DailyReportData } from '@/components/DailyReport';
import { SAMPLE_REPORTS } from '@/data/testData';

interface ReportContextType {
  reports: DailyReportData[];
  addReport: (report: DailyReportData) => void;
  deleteReport: (id: string) => void;
  loadTestData: () => void;
  clearAllData: () => void;
  isTestDataLoaded: boolean;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState<DailyReportData[]>([]);
  const [isTestDataLoaded, setIsTestDataLoaded] = useState(false);

  // ローカルストレージからデータを読み込み
  useEffect(() => {
    const savedReports = localStorage.getItem('dailyReports');
    if (savedReports) {
      try {
        const parsedReports = JSON.parse(savedReports);
        setReports(parsedReports);
      } catch (error) {
        console.error('Failed to parse saved reports:', error);
      }
    }
  }, []);

  // データをローカルストレージに保存
  useEffect(() => {
    localStorage.setItem('dailyReports', JSON.stringify(reports));
  }, [reports]);

  const addReport = (report: DailyReportData) => {
    const newReport = {
      ...report,
      id: report.id || Date.now().toString(),
      submittedAt: report.submittedAt || new Date().toISOString()
    };
    setReports(prev => [newReport, ...prev]);
  };

  const deleteReport = (id: string) => {
    setReports(prev => prev.filter(report => report.id !== id));
  };

  const loadTestData = () => {
    setReports(SAMPLE_REPORTS);
    setIsTestDataLoaded(true);
  };

  const clearAllData = () => {
    setReports([]);
    setIsTestDataLoaded(false);
    localStorage.removeItem('dailyReports');
  };

  return (
    <ReportContext.Provider value={{ 
      reports, 
      addReport, 
      deleteReport, 
      loadTestData, 
      clearAllData,
      isTestDataLoaded 
    }}>
      {children}
    </ReportContext.Provider>
  );
}

export function useReports() {
  const context = useContext(ReportContext);
  if (context === undefined) {
    throw new Error('useReports must be used within a ReportProvider');
  }
  return context;
} 