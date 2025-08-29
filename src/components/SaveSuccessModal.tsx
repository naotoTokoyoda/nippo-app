'use client';

interface SaveSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export default function SaveSuccessModal({ 
  isOpen, 
  onClose, 
  message = "変更が保存されました" 
}: SaveSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6 text-center">
          {/* 成功アイコン */}
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
            <svg 
              className="h-6 w-6 text-green-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="2" 
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            保存完了
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {message}
          </p>
          
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
