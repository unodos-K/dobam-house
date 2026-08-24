import { useState, useEffect } from 'react';
import { getBudgets } from '../services/api';
import { Budget } from '../types';
import TransactionList from '../components/TransactionList';
import { Check } from 'lucide-react';

export default function TransactionsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger] = useState(0);

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  return (
    <div className="pb-24 bg-gray-50/30">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1 max-w-[480px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-text">수입/지출 내역</h1>
        <p className="text-text-light text-sm mt-1">상세 내역을 조회하고 수정/삭제하세요</p>
      </header>

      <div className="px-4 max-w-[480px] mx-auto w-full space-y-12 pb-10">
        <section>
          <div className="mb-[-20px] ml-1">
            <h2 className="text-[17px] font-extrabold text-red-500">지출 리스트</h2>
          </div>
          <TransactionList 
            isIncome={false} 
            budgets={budgets} 
            refreshTrigger={refreshTrigger} 
            onToast={showToast} 
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
            onToast={showToast} 
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
