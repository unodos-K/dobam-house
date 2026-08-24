import { DashboardData } from '../types';

interface BalanceWidgetProps {
  dashboardData: DashboardData | null;
  month: string;
}

export default function BalanceWidget({ dashboardData, month }: BalanceWidgetProps) {
  if (!dashboardData) return null;
  
  const monthData = dashboardData[month] || {};
  const getBalance = (cat: string) => monthData[cat]?.balance || 0;

  const categories = [
    { name: '생활비', icon: '💰' },
    { name: '교통비', icon: '🚌' },
    { name: '예비비', icon: '🛡️' }
  ];

  return (
    <div className="flex justify-between items-center gap-2 mb-4">
      {categories.map(c => {
        const bal = getBalance(c.name);
        return (
          <div key={c.name} className="flex-1 bg-white border border-gray-100 rounded-[14px] p-2.5 shadow-sm flex flex-col items-center justify-center gap-1">
            <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">{c.icon} {c.name}</span>
            <span className={`text-[13px] font-extrabold tracking-tight ${bal < 0 ? 'text-red-500' : 'text-[#748E63]'}`}>
              {bal.toLocaleString()}원
            </span>
          </div>
        );
      })}
    </div>
  );
}
