import { useState, useEffect } from 'react';
import { getBudgets, getTransactions } from '../services/api';
import { Budget, Transaction, DashboardData } from '../types';
import TransactionList from '../components/TransactionList';
import BalanceWidget from '../components/BalanceWidget';
import { Check } from 'lucide-react';

export default function TransactionsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [filterDate, setFilterDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

  useEffect(() => {
    getTransactions().then(setTransactions).catch(console.error);
  }, [refreshTrigger]);

  useEffect(() => {
    if (transactions.length === 0) return;

    const dashboard: DashboardData = { 'all': {} };
    
    transactions.forEach(t => {
      // 선택된 날짜 이후 데이터는 무시
      if (t.date > filterDate) return;

      if (!dashboard['all'][t.category]) {
        dashboard['all'][t.category] = {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          items: []
        };
      }

      const catData = dashboard['all'][t.category];
      if (t.type === '수입') {
        catData.totalIncome += t.amount;
      } else {
        catData.totalExpense += t.amount;
      }
      catData.balance = catData.totalIncome - catData.totalExpense;
    });

    setDashboardData(dashboard);
  }, [transactions, filterDate]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="pb-24 bg-gray-50/30 min-h-screen">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1 max-w-[480px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-text">수입/지출 내역</h1>
        <p className="text-text-light text-sm mt-1">상세 내역을 조회하고 수정/삭제하세요</p>
      </header>

      <div className="px-4 max-w-[480px] mx-auto w-full space-y-8 pb-10">
        
        {/* 날짜 선택 및 잔액 위젯 섹션 */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
              <span>📅</span> 누적 잔액 조회
            </h2>
            <div className="flex items-center gap-2 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-200">
              <span className="text-[12px] font-bold text-gray-500">기준일</span>
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-[13px] font-bold text-gray-800 focus:outline-none"
              />
            </div>
          </div>
          
          <BalanceWidget dashboardData={dashboardData} month="all" hideMonth={true} />
        </section>

        <section>
          <div className="mb-[-20px] ml-1">
            <h2 className="text-[17px] font-extrabold text-red-500">지출 리스트</h2>
          </div>
          <TransactionList 
            isIncome={false} 
            budgets={budgets} 
            refreshTrigger={refreshTrigger} 
            onToast={(msg) => { showToast(msg); handleRefresh(); }} 
            filterDate={filterDate}
          />
        </section>

        <section>
          <div className="mb-[-20px] ml-1">
            <h2 className="text-[17px] font-extrabold text-blue-500">수입 리스트</h2>
          </div>
          <TransactionList 
            isIncome={true} 
            budgets={budgets} 
            refreshTrigger={refreshTrigger} 
            onToast={(msg) => { showToast(msg); handleRefresh(); }} 
            filterDate={filterDate}
          />
        </section>
      </div>

      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
