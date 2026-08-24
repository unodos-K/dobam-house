interface LoadingSpinnerProps {
  text?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ text = '데이터를 불러오는 중...', overlay = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center p-8 bg-white/90 backdrop-blur-xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] border border-gray-100/80">
      <div className="relative flex flex-col items-center justify-center h-20 w-20 mb-2">
        {/* Bouncing Coin */}
        <div 
          className="absolute z-10 text-[42px] leading-none drop-shadow-md animate-bounce"
        >
          🪙
        </div>
        {/* Soft shadow that pulses opposite to the bounce */}
        <div 
          className="absolute bottom-1 w-10 h-2 bg-black/10 rounded-[50%] blur-[2px] animate-pulse"
        ></div>
      </div>
      <p className="text-[14px] font-extrabold text-[#748E63]/90 tracking-wide animate-pulse">
        {text}
      </p>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50/40 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto">
        {content}
      </div>
    </div>
  );
}
