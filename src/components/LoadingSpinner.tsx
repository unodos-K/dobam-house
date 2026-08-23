import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ text = '데이터를 불러오는 중...', overlay = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-6 bg-white/80 backdrop-blur-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100/50">
      <div className="relative flex items-center justify-center">
        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping scale-150"></div>
        <Loader2 className="animate-spin text-primary relative z-10" size={40} strokeWidth={2.5} />
      </div>
      <p className="mt-5 text-[13px] font-bold text-gray-700 animate-pulse">{text}</p>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/50 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="w-full h-[60vh] flex items-center justify-center">
      {content}
    </div>
  );
}
