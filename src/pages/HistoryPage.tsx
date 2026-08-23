import { useEffect, useState } from 'react';
import { getDashboard } from '../services/api';
import { DashboardData, DashboardCategory } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

type ViewMode = 'month' | 'cumulative' | 'matrix';

export default function HistoryPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentMonth = (new Date().getMonth() + 1).toString();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [expandedMonths, setExpandedMonths] = useState<string[]>([]);
  const [expandedSubCats, setExpandedSubCats] = useState<string[]>([]);
  
  const toggleMonth = (m: string) => {
    setExpandedMonths(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const toggleSubCat = (m: string, cat: string) => {
    const key = `${m}-${cat}`;
    setExpandedSubCats(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await getDashboard();
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner text="내역 데이터를 불러오는 중..." />;
  }

  if (!data || Object.keys(data).length === 0) {
    return <div className="p-4 pt-8 text-center text-text-light">표시할 데이터가 없습니다.</div>;
  }

  // 1. 누적 데이터 계산 (1월부터 현재 선택된 월까지 합산)
  const getCumulativeData = (): Record<string, DashboardCategory> => {
    const result: Record<string, DashboardCategory> = {};
    const maxMonth = Number(currentMonth);
    
    for (let m = 1; m <= maxMonth; m++) {
      const monthStr = m.toString();
      const monthData = data[monthStr];
      if (!monthData) continue;
      
      for (const catName of Object.keys(monthData)) {
        if (!result[catName]) {
          result[catName] = { totalIncome: 0, totalExpense: 0, balance: 0, items: [] };
        }
        
        const cat = monthData[catName];
        result[catName].totalIncome += cat.totalIncome;
        result[catName].totalExpense += cat.totalExpense;
        result[catName].balance += cat.balance;
        
        cat.items.forEach(item => {
          const existingItem = result[catName].items.find(i => i.name === item.name);
          if (existingItem) {
            existingItem.income += item.income;
            existingItem.expense += item.expense;
            existingItem.balance += item.balance;
          } else {
            result[catName].items.push({ ...item });
          }
        });
      }
    }
    return result;
  };

  // 렌더링에 사용할 데이터 (이번 달 vs 누적)
  const displayData = viewMode === 'cumulative' ? getCumulativeData() : (data[currentMonth] || {});
  const categoriesList = ['교통비', '생활비', '예비비'];

  // 카드 렌더러 (이번달 / 누적 뷰용)
  const renderCardsView = () => (
    <div className="space-y-5">
      {categoriesList.map((category) => {
        const catData = displayData[category];
        if (!catData) return null;

        return (
          <div key={category} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* 요약 헤더 구역 */}
            <div className="p-4 border-b border-gray-100 bg-gray-50/40">
              <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2 mb-3">
                {category === '교통비' && '🚗'}
                {category === '생활비' && '🛒'}
                {category === '예비비' && '💡'}
                {category}
              </h2>
              
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <p className="text-[10px] text-gray-500 font-semibold mb-1">수입/예산</p>
                  <p className="text-[13px] font-bold text-blue-500 truncate">{catData.totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-gray-100 text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
                  <p className="text-[10px] text-gray-500 font-semibold mb-1">지출</p>
                  <p className="text-[13px] font-bold text-red-500 truncate">{catData.totalExpense.toLocaleString()}</p>
                </div>
                <div className={`p-2.5 rounded-xl border text-center shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${catData.balance >= 0 ? 'bg-green-50/50 border-green-100' : 'bg-red-50/50 border-red-100'}`}>
                  <p className="text-[10px] text-gray-600 font-semibold mb-1">잔액</p>
                  <p className={`text-[13px] font-bold truncate ${catData.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {catData.balance.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* 세부 내역 표 */}
            <div className="p-4 space-y-0.5">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold mb-2 px-1">
                <span className="w-20">항목</span>
                <div className="flex gap-4 flex-1 justify-end text-right">
                  <span className="w-14">수입</span>
                  <span className="w-14">지출</span>
                  <span className="w-14">잔액</span>
                </div>
              </div>
              
              {catData.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs py-1.5 px-1 rounded hover:bg-gray-50 transition-colors">
                  <span className="font-medium text-gray-700 w-20 truncate">{item.name.trim()}</span>
                  <div className="flex gap-4 flex-1 justify-end text-right font-medium">
                    <span className="text-blue-500 w-14 truncate">{item.income === 0 ? '-' : item.income.toLocaleString()}</span>
                    <span className="text-red-500 w-14 truncate">{item.expense === 0 ? '-' : item.expense.toLocaleString()}</span>
                    <span className={`w-14 truncate ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {item.balance === 0 ? '-' : item.balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  // 월별 요약 뷰 렌더러
  const renderMonthlySummaryView = () => {
    const months = Array.from({length: 12}, (_, i) => (i + 1).toString());
    
    return (
      <div className="space-y-3">
        {months.map(m => {
          let totalIncome = 0;
          let totalExpense = 0;
          const monthData = data?.[m];
          
          if (monthData) {
            Object.values(monthData).forEach((cat: any) => {
              totalIncome += cat.totalIncome;
              totalExpense += cat.totalExpense;
            });
          }
          
          const balance = totalIncome - totalExpense;
          const isSurplus = balance >= 0;
          const hasData = totalIncome > 0 || totalExpense > 0;
          const isMonthExpanded = expandedMonths.includes(m);

          return (
            <div key={m} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div 
                className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => hasData && toggleMonth(m)}
              >
                <div className="flex items-center gap-3">
                  {/* 흑자/적자 시각적 마커 */}
                  <div className="relative flex h-3 w-3 shrink-0">
                    {hasData && (
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-40 ${isSurplus ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-3 w-3 ${
                      !hasData ? 'bg-gray-200' : (isSurplus ? 'bg-green-500' : 'bg-red-500')
                    }`}></span>
                  </div>
                  <span className="font-bold text-gray-800 text-[15px]">{m}월</span>
                </div>
                
                <div className="flex flex-col text-right gap-1 min-w-[120px]">
                  <div className="text-[12px] font-medium text-gray-500 flex justify-between gap-4">
                    <span>수입</span>
                    <span className="text-blue-500">{totalIncome === 0 ? '-' : totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="text-[12px] font-medium text-gray-500 flex justify-between gap-4">
                    <span>지출</span>
                    <span className="text-red-500">{totalExpense === 0 ? '-' : totalExpense.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-gray-100 my-0.5"></div>
                  <div className={`text-[13px] font-bold flex justify-between gap-4 ${!hasData ? 'text-gray-400' : (isSurplus ? 'text-green-600' : 'text-red-600')}`}>
                    <span className={!hasData ? 'text-gray-400' : 'text-gray-600'}>합계</span>
                    <span>{hasData && isSurplus ? '+' : ''}{balance === 0 ? '-' : balance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* 1단계 아코디언 (대분류) */}
              {isMonthExpanded && monthData && (
                <div className="border-t border-gray-100 bg-gray-50/40">
                  {categoriesList.map(category => {
                    const catData = monthData[category];
                    if (!catData || (catData.totalIncome === 0 && catData.totalExpense === 0)) return null;
                    
                    const isSubExpanded = expandedSubCats.includes(`${m}-${category}`);
                    const catBalance = catData.balance;
                    
                    return (
                      <div key={category} className="border-b border-gray-100 last:border-0">
                        {/* 대분류 헤더 (클릭 시 세부 항목 토글) */}
                        <div 
                          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                          onClick={() => toggleSubCat(m, category)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-bold text-gray-700">
                              {category === '교통비' && '🚗 '}
                              {category === '생활비' && '🛒 '}
                              {category === '예비비' && '💡 '}
                              {category}
                            </span>
                          </div>
                          <div className="flex gap-4 text-[12px] font-medium text-right">
                            <span className="w-14 text-blue-500">{catData.totalIncome === 0 ? '-' : catData.totalIncome.toLocaleString()}</span>
                            <span className="w-14 text-red-500">{catData.totalExpense === 0 ? '-' : catData.totalExpense.toLocaleString()}</span>
                            <span className={`w-16 font-bold ${catBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {catBalance === 0 ? '-' : catBalance.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* 2단계 아코디언 (세부 항목 내역) */}
                        {isSubExpanded && (
                          <div className="px-4 pb-3 pt-1 bg-white">
                            <div className="flex justify-between items-center text-[10px] text-gray-400 font-semibold mb-1 px-1">
                              <span className="w-20">세부 항목</span>
                              <div className="flex gap-4 flex-1 justify-end text-right">
                                <span className="w-14">수입</span>
                                <span className="w-14">지출</span>
                                <span className="w-14">잔액</span>
                              </div>
                            </div>
                            <div className="space-y-0.5">
                              {catData.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center text-[11px] py-1 px-1 rounded hover:bg-gray-50 transition-colors">
                                  <span className="font-medium text-gray-600 w-20 truncate">
                                    <span className="text-gray-300 mr-1">└</span>
                                    {item.name.trim()}
                                  </span>
                                  <div className="flex gap-4 flex-1 justify-end text-right">
                                    <span className="text-blue-500/80 w-14 truncate">{item.income === 0 ? '-' : item.income.toLocaleString()}</span>
                                    <span className="text-red-500/80 w-14 truncate">{item.expense === 0 ? '-' : item.expense.toLocaleString()}</span>
                                    <span className={`w-14 truncate ${item.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.balance === 0 ? '-' : item.balance.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="pb-24 bg-gray-50/30">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 flex flex-col gap-4 shadow-sm">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-text">내역 조회</h1>
            <p className="text-text-light text-sm mt-1">
              {viewMode === 'month' ? `${currentMonth}월 전체 요약` : viewMode === 'cumulative' ? `1월~${currentMonth}월 누적 결산` : '연간 월별 지출 흐름'}
            </p>
          </div>
        </div>

        {/* 뷰 모드 전환 탭 */}
        <div className="flex p-1 bg-gray-100 rounded-xl w-full">
          {(['month', 'cumulative', 'matrix'] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all duration-200 ${
                viewMode === mode 
                  ? 'bg-white text-gray-800 shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {mode === 'month' ? '이번 달' : mode === 'cumulative' ? '누적' : '월별 지출'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4">
        {/* 뷰 렌더링 분기 */}
        {viewMode === 'matrix' ? renderMonthlySummaryView() : renderCardsView()}
      </div>
    </div>
  );
}
