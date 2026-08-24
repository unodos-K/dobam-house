import { X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "확인",
  message,
  confirmText = "확인",
  cancelText = "취소"
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white/95 backdrop-blur-xl w-full max-w-[320px] rounded-[24px] p-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
        >
          <X size={20} />
        </button>
        
        <h3 className="text-[17px] font-extrabold text-gray-800 mb-2 mt-1">{title}</h3>
        <p className="text-[14px] font-medium text-gray-600 leading-relaxed whitespace-pre-wrap mb-6">
          {message}
        </p>
        
        <div className="flex gap-2.5">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[14px] font-bold rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 bg-[#748E63]/90 hover:bg-[#748E63] text-white text-[14px] font-bold rounded-xl transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
