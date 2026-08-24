import { useState, useEffect } from 'react';
import { getBudgets } from '../services/api';
import { Budget } from '../types';
import TransactionList from '../components/TransactionList';
import { Check, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function TransactionsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger] = useState(0);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const runMigration = async () => {
    setIsMigrating(true);
    try {
      const gasUrl = import.meta.env.VITE_GAS_WEB_APP_URL;
      if (!gasUrl) throw new Error("GAS URL이 없습니다. (.env 파일 확인 필요)");
      
      // 1. Get Budgets
      const bRes = await fetch(`${gasUrl}?action=getBudgets`);
      if (!bRes.ok) throw new Error('Budgets API 응답 에러');
      const bJson = await bRes.json();
      
      if (bJson.status === 'success' && bJson.data && bJson.data.length > 0) {
        const mappedBudgets = bJson.data.map((b: any) => ({
          category: b.category,
          bank: b.bank || 'Unknown',
          account: b.account || 'Unknown',
          "subCategory": b.subCategory,
          amount: b.amount
        }));
        const { error: bErr } = await supabase.from('budgets').insert(mappedBudgets);
        if (bErr) throw new Error('Budgets Insert 에러: ' + bErr.message);
      }

      // 2. Get Transactions
      const tRes = await fetch(`${gasUrl}?action=getTransactions`);
      if (!tRes.ok) throw new Error('Transactions API 응답 에러');
      const tJson = await tRes.json();
      
      if (tJson.status === 'success' && tJson.data && tJson.data.length > 0) {
        const transactions = tJson.data;
        
        const expenses = transactions
          .filter((t: any) => t.type === '지출' || t.type === 'expense')
          .map((t: any) => ({
            month: t.month ? t.month.toString() : parseInt(t.date.split('-')[1]).toString(),
            date: t.date,
            category: t.category,
            "subCategory": t.subCategory,
            amount: t.amount,
            memo: t.memo || t.content || ''
          }));
        
        const incomes = transactions
          .filter((t: any) => t.type === '수입' || t.type === 'income')
          .map((t: any) => ({
            month: t.month ? t.month.toString() : parseInt(t.date.split('-')[1]).toString(),
            date: t.date,
            category: t.category,
            "subCategory": t.subCategory,
            amount: t.amount,
            memo: t.memo || t.content || ''
          }));

        if (expenses.length > 0) {
          const { error: eErr } = await supabase.from('expenses').insert(expenses);
          if (eErr) throw new Error('Expenses Insert 에러: ' + eErr.message);
        }
        
        if (incomes.length > 0) {
          const { error: iErr } = await supabase.from('incomes').insert(incomes);
          if (iErr) throw new Error('Incomes Insert 에러: ' + iErr.message);
        }
      }
      
      alert('✅ 기존 구글 시트 데이터가 Supabase로 성공적으로 마이그레이션 되었습니다!');
      
    } catch (err: any) {
      console.error(err);
      alert('❌ 마이그레이션 실패: ' + err.message);
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="pb-24 bg-gray-50/30 min-h-screen">
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
        
        {/* Migration Section */}
        <section className="pt-8 mt-12 border-t border-gray-200">
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center space-y-3">
            <Database size={24} className="text-orange-500" />
            <h3 className="font-bold text-orange-800 text-[15px]">데이터베이스 마이그레이션</h3>
            <p className="text-[12px] text-orange-600/80">
              구글 스프레드시트의 과거 기록을 불러와<br/>새로운 Supabase 시스템으로 안전하게 이전합니다.
            </p>
            <button 
              onClick={runMigration}
              disabled={isMigrating}
              className={`mt-2 w-full py-3.5 rounded-xl font-bold text-white shadow-sm flex items-center justify-center gap-2 transition-all ${
                isMigrating ? 'bg-orange-300 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98]'
              }`}
            >
              {isMigrating ? (
                <>
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></span>
                  이전 중...
                </>
              ) : (
                '데이터 마이그레이션 실행하기'
              )}
            </button>
          </div>
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
