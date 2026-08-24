import { DashboardData } from '../types';

interface BalanceWidgetProps {
  dashboardData: DashboardData | null;
  month: string;
  hideMonth?: boolean;
}

export default function BalanceWidget({ dashboardData, month, hideMonth }: BalanceWidgetProps) {
  if (!dashboardData) return null;
  
  const allData = dashboardData['all'] || {};
  const monthData = dashboardData[month] || {};
  
  const getCumulativeBalance = (cat: string) => allData[cat]?.balance || 0;
  const getMonthBalance = (cat: string) => monthData[cat]?.balance || 0;

  const categories = [
    { name: '생활비', icon: '💰' },
    { name: '교통비', icon: '🚌' },
    { name: '예비비', icon: '🛡️' }
  ];

  return (
    <div className="flex justify-between items-center gap-2 mb-4">
      {categories.map(c => {
        const cumBal = getCumulativeBalance(c.name);
        const mBal = getMonthBalance(c.name);
        return (
          <div key={c.name} className="flex-1 bg-white border border-gray-100 rounded-[14px] p-2.5 shadow-sm flex flex-col items-center justify-center gap-1.5 relative overflow-hidden">
            <div className="flex flex-col items-center gap-0.5 z-10 w-full">
              <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">{c.icon} {c.name} (누적)</span>
              <span className={`text-[14px] font-extrabold tracking-tight ${cumBal < 0 ? 'text-red-500' : 'text-[#748E63]'}`}>
                {cumBal.toLocaleString()}원
              </span>
            </div>
            
            {!hideMonth && (
              <div className="w-full bg-gray-50 rounded-lg p-1.5 flex flex-col items-center justify-center mt-0.5">
                <span className="text-[9px] font-bold text-gray-400 mb-0.5">이번 달 ({month}월) 잔액</span>
                <span className={`text-[11px] font-bold ${mBal < 0 ? 'text-red-400' : mBal > 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                  {mBal > 0 ? '+' : ''}{mBal.toLocaleString()}원
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
