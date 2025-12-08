'use client';

import { useState } from 'react';
import WorkItem from '@/components/WorkItem';
import WorkerHistory from '@/components/WorkerHistory';
import WorkNumberSearchModal from '@/components/WorkNumberSearchModal';
import { useDailyReportForm } from '@/hooks/useDailyReportForm';
import { WorkItemData } from '@/types/daily-report';

export default function DailyReport() {
  const [isWorkNumberModalOpen, setIsWorkNumberModalOpen] = useState(false);
  
  const {
    reportData,
    isSubmitting,
    showValidation,
    basicInfoErrors,
    users,
    loadingUsers,
    hasErrors,
    updateDate,
    updateWorkerName,
    updateWorkItem,
    removeWorkItem,
    applyWorkNumberSearch,
    handleSubmit,
  } = useDailyReportForm();

  return (
    <div className="space-y-8">
      {/* 基本情報 */}
      <BasicInfoSection
        date={reportData.date}
        workerName={reportData.workerName}
        users={users}
        loadingUsers={loadingUsers}
        basicInfoErrors={basicInfoErrors}
        onDateChange={updateDate}
        onWorkerNameChange={updateWorkerName}
      />

      {/* 作業者履歴表示 */}
      {reportData.workerName && (
        <div className="bg-blue-50 rounded-lg shadow-sm border border-blue-200">
          <WorkerHistory 
            workerName={reportData.workerName} 
            currentDate={reportData.date}
          />
        </div>
      )}

      {/* 作業項目 */}
      <WorkItemsSection
        workItems={reportData.workItems}
        showValidation={showValidation}
        workerName={reportData.workerName}
        currentDate={reportData.date}
        onUpdate={updateWorkItem}
        onRemove={removeWorkItem}
        onOpenSearchModal={() => setIsWorkNumberModalOpen(true)}
      />

      {/* 送信ボタン */}
      <SubmitButton
        isSubmitting={isSubmitting}
        hasErrors={hasErrors}
        onSubmit={handleSubmit}
      />

      {/* 工番検索モーダル */}
      <WorkNumberSearchModal
        isOpen={isWorkNumberModalOpen}
        onClose={() => setIsWorkNumberModalOpen(false)}
        onWorkItemAdd={applyWorkNumberSearch}
      />
    </div>
  );
}

// =========================================
// サブコンポーネント
// =========================================

interface BasicInfoSectionProps {
  date: string;
  workerName: string;
  users: { id: string; name: string }[];
  loadingUsers: boolean;
  basicInfoErrors: { field: string; message: string }[];
  onDateChange: (date: string) => void;
  onWorkerNameChange: (name: string) => void;
}

function BasicInfoSection({
  date,
  workerName,
  users,
  loadingUsers,
  basicInfoErrors,
  onDateChange,
  onWorkerNameChange,
}: BasicInfoSectionProps) {
  const hasDateError = basicInfoErrors.some(err => err.field === 'date');
  const hasWorkerError = basicInfoErrors.some(err => err.field === 'workerName');
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
        <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        基本情報
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            日付
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => onDateChange(e.target.value)}
            data-field="date"
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 ${
              hasDateError ? 'border-red-500 focus:ring-red-500' : ''
            }`}
          />
          {hasDateError && (
            <p className="text-xs text-red-600 mt-1">
              {basicInfoErrors.find(err => err.field === 'date')?.message}
            </p>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            作業者名
          </label>
          <select
            value={workerName}
            onChange={(e) => onWorkerNameChange(e.target.value)}
            data-field="workerName"
            disabled={loadingUsers}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 ${
              hasWorkerError ? 'border-red-500 focus:ring-red-500' : ''
            } ${loadingUsers ? 'bg-gray-100 cursor-not-allowed' : ''}`}
          >
            <option value="">
              {loadingUsers ? '読み込み中...' : ''}
            </option>
            {users.map(user => (
              <option key={user.id} value={user.name}>{user.name}</option>
            ))}
          </select>
          {hasWorkerError && (
            <p className="text-xs text-red-600 mt-1">
              {basicInfoErrors.find(err => err.field === 'workerName')?.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

interface WorkItemsSectionProps {
  workItems: WorkItemData[];
  showValidation: boolean;
  workerName: string;
  currentDate: string;
  onUpdate: (id: string, updates: Partial<WorkItemData>) => void;
  onRemove: (id: string) => void;
  onOpenSearchModal: () => void;
}

function WorkItemsSection({
  workItems,
  showValidation,
  workerName,
  currentDate,
  onUpdate,
  onRemove,
  onOpenSearchModal,
}: WorkItemsSectionProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* 工番検索誘導バナー */}
      <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">
                💡 まず「工番情報検索」をお試しください
              </p>
              <p className="text-xs text-blue-600 mt-0.5">
                客先名・工番・作業名称が自動で入力されます
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSearchModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            工番情報検索
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center">
          <svg className="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          作業項目
        </h2>
      </div>
      
      <div className="space-y-6">
        {workItems.map((item, index) => (
          <WorkItem
            key={item.id}
            item={item}
            index={index + 1}
            onUpdate={(updates) => onUpdate(item.id, updates)}
            onRemove={() => onRemove(item.id)}
            showValidation={showValidation}
            workerName={workerName}
            currentDate={currentDate}
            hideControls={true}
          />
        ))}
      </div>
    </div>
  );
}

interface SubmitButtonProps {
  isSubmitting: boolean;
  hasErrors: boolean;
  onSubmit: () => void;
}

function SubmitButton({ isSubmitting, hasErrors, onSubmit }: SubmitButtonProps) {
  return (
    <div className="">
      <div className="text-center">
        <button
          onClick={onSubmit}
          disabled={isSubmitting || hasErrors}
          className={`px-8 py-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold shadow-sm flex items-center justify-center mx-auto ${
            hasErrors
              ? 'bg-gray-400 text-white cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isSubmitting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              送信中...
            </>
          ) : hasErrors ? (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              エラーを修正してください
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              日報を送信
            </>
          )}
        </button>
      </div>
    </div>
  );
}
