interface LoadingSpinnerProps {
  text?: string;
  overlay?: boolean;
}

export default function LoadingSpinner({ text = '로딩 중...', overlay = false }: LoadingSpinnerProps) {
  const content = (
    <div className="flex flex-col items-center justify-center bg-white/90 backdrop-blur-md rounded-[28px] shadow-xl border border-white/50 w-48 h-48 mx-auto">
      <div className="relative flex flex-col items-center justify-center h-24 w-24 mb-3">
        <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <style>
            {`
              @keyframes scribble {
                0% { transform: translate(0px, 0px) rotate(0deg); }
                15% { transform: translate(12px, -4px) rotate(10deg); }
                30% { transform: translate(4px, 6px) rotate(-8deg); }
                45% { transform: translate(18px, -2px) rotate(15deg); }
                60% { transform: translate(8px, 8px) rotate(-5deg); }
                75% { transform: translate(15px, 2px) rotate(8deg); }
                100% { transform: translate(0px, 0px) rotate(0deg); }
              }
              .pencil-anim {
                animation: scribble 1.8s infinite cubic-bezier(0.4, 0, 0.2, 1);
                transform-origin: 50px 70px; /* Origin near the pencil tip */
              }
            `}
          </style>
          
          {/* Diary Base */}
          <g transform="translate(15, 25)">
            {/* Left Page (Pastel Blue) */}
            <rect x="0" y="0" width="35" height="50" rx="4" fill="#f0f9ff" stroke="#bae6fd" strokeWidth="2"/>
            <line x1="8" y1="12" x2="27" y2="12" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="22" x2="27" y2="22" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="32" x2="27" y2="32" stroke="#e0f2fe" strokeWidth="2" strokeLinecap="round"/>
            
            {/* Right Page (Pastel Pink) */}
            <rect x="35" y="0" width="35" height="50" rx="4" fill="#fff1f2" stroke="#fecdd3" strokeWidth="2"/>
            <line x1="43" y1="12" x2="62" y2="12" stroke="#ffe4e6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="43" y1="22" x2="62" y2="22" stroke="#ffe4e6" strokeWidth="2" strokeLinecap="round"/>
            <line x1="43" y1="32" x2="62" y2="32" stroke="#ffe4e6" strokeWidth="2" strokeLinecap="round"/>
            
            {/* Binder / Center Ring */}
            <line x1="35" y1="0" x2="35" y2="50" stroke="#cbd5e1" strokeWidth="1.5"/>
            <circle cx="35" cy="10" r="1.5" fill="#94a3b8"/>
            <circle cx="35" cy="25" r="1.5" fill="#94a3b8"/>
            <circle cx="35" cy="40" r="1.5" fill="#94a3b8"/>
          </g>

          {/* Pencil (Gold/Brown) */}
          <g className="pencil-anim">
            {/* Translate to position tip near the right page */}
            <g transform="translate(48, 60) rotate(-35) translate(0, -45)">
              {/* Eraser */}
              <rect x="-4" y="0" width="8" height="6" rx="2" fill="#fbcfe8" stroke="#f472b6" strokeWidth="1"/>
              {/* Metal band */}
              <rect x="-4" y="6" width="8" height="4" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="0.5"/>
              {/* Wood body (Gold) */}
              <rect x="-4" y="10" width="8" height="25" fill="#fcd34d" stroke="#fbbf24" strokeWidth="1"/>
              {/* Wood tip */}
              <polygon points="-4,35 4,35 0,45" fill="#fef3c7" stroke="#fde68a" strokeWidth="0.5"/>
              {/* Lead tip (Brown) */}
              <polygon points="-1,42.5 1,42.5 0,45" fill="#78350f"/>
            </g>
          </g>
        </svg>
      </div>
      <p className="text-[14px] font-bold text-[#748E63]/90 tracking-wide animate-pulse mt-2">
        {text}
      </p>
    </div>
  );

  if (overlay) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-900/10 backdrop-blur-sm">
        {content}
      </div>
    );
  }

  return <div className="flex justify-center my-10">{content}</div>;
}
