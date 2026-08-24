import { useState, useEffect } from 'react';
import { getBudgets, appendExpense } from '../services/api';
import { Budget } from '../types';
import { Check, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import TransactionList from '../components/TransactionList';

export default function ExpensePage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [expenseMonth, setExpenseMonth] = useState((new Date().getMonth() + 1).toString());
  
  const today = new Date().toISOString().split('T')[0];
  
  interface ExpenseRow {
    id: string;
    date: string;
    category: string;
    subCategory: string;
    amount: string;
    memo: string;
  }
  
  const [expenseRows, setExpenseRows] = useState<ExpenseRow[]>([{
    id: Date.now().toString(),
    date: today,
    category: '생활비',
    subCategory: '',
    amount: '',
    memo: ''
  }]);

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString();
  };
  const parseAmount = (val: string) => val.replace(/[^0-9]/g, '');

  const getSubOptionsByCategory = (cat: string) => {
    const options = budgets.filter(b => b.category === cat).map(b => b.subCategory);
    if (cat === '생활비' && !options.includes('생활비 기타')) options.push('생활비 기타');
    if (cat === '교통비' && !options.includes('교통비 기타')) options.push('교통비 기타');
    if (cat === '예비비' && !options.includes('기타예비비')) options.push('기타예비비');
    return Array.from(new Set(options));
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  const addExpenseRow = () => {
    if (expenseRows.length >= 20) {
      showToast('최대 20개까지만 추가할 수 있습니다.');
      return;
    }
    setExpenseRows([...expenseRows, {
      id: Date.now().toString(),
      date: today,
      category: '생활비',
      subCategory: '',
      amount: '',
      memo: ''
    }]);
  };

  const removeExpenseRow = (id: string) => {
    if (expenseRows.length <= 1) return;
    setExpenseRows(expenseRows.filter(r => r.id !== id));
  };

  const updateExpenseRow = (id: string, field: keyof ExpenseRow, value: string) => {
    setExpenseRows(expenseRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'category') updated.subCategory = '';
        return updated;
      }
      return r;
    }));
  };

  const handleExpenseSubmit = async () => {
    const invalidRow = expenseRows.find(r => !r.category || !r.subCategory || !parseAmount(r.amount));
    if (invalidRow) {
      showToast('모든 항목의 세부 분류와 금액을 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = expenseRows.map(r => ({
        month: expenseMonth,
        date: r.date,
        category: r.category,
        subCategory: r.subCategory,
        amount: Number(parseAmount(r.amount)),
        memo: r.memo
      }));
      await appendExpense(dataToSubmit);
      
      showToast('지출 내역 전송 성공!');
      setExpenseRows([{
        id: Date.now().toString(),
        date: today,
        category: '생활비',
        subCategory: '',
        amount: '',
        memo: ''
      }]);
      triggerRefresh();
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const months = Array.from({length: 12}, (_, i) => (i + 1).toString());

  return (
    <div className="pb-32 bg-gray-50/30">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1 max-w-[480px] mx-auto w-full">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-text">지출 입력</h1>
            <p className="text-text-light text-sm mt-1">다수의 지출 내역을 한 번에 입력하세요</p>
          </div>
          <select
            value={expenseMonth}
            onChange={(e) => setExpenseMonth(e.target.value)}
            className="bg-white border border-gray-200 text-gray-800 font-bold text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {months.map(m => (
              <option key={m} value={m}>{m}월 지출</option>
            ))}
          </select>
        </div>
      </header>

      <div className="px-4 max-w-[480px] mx-auto w-full">
        {loading && <LoadingSpinner text="데이터 전송 중..." overlay={true} />}

        <div className="space-y-4">
          {expenseRows.map((row, index) => {
            const subOptions = getSubOptionsByCategory(row.category);
            if (!row.subCategory && subOptions.length > 0) {
               updateExpenseRow(row.id, 'subCategory', subOptions[0]);
            }

            return (
              <div key={row.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                <div className="flex justify-between items-center mb-3">
                  <span className="bg-gray-100 text-gray-500 font-bold text-[10px] px-2 py-1 rounded-md">
                    #{index + 1}
                  </span>
                  {expenseRows.length > 1 && (
                    <button onClick={() => removeExpenseRow(row.id)} className="text-red-400 hover:text-red-500 transition-colors p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                
                <div className="space-y-2.5">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={row.date}
                      onChange={(e) => updateExpenseRow(row.id, 'date', e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                    />
                    <select
                      value={row.category}
                      onChange={(e) => updateExpenseRow(row.id, 'category', e.target.value)}
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                    >
                      <option value="교통비">교통비</option>
                      <option value="생활비">생활비</option>
                      <option value="예비비">예비비</option>
                    </select>
                    <select
                      value={row.subCategory}
                      onChange={(e) => updateExpenseRow(row.id, 'subCategory', e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {subOptions.map(subCat => (
                        <option key={subCat} value={subCat}>{subCat}</option>
                      ))}
                      {subOptions.length === 0 && <option value="" disabled>항목 없음</option>}
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-[1.5]">
                      <input
                        type="text"
                        value={row.amount}
                        onChange={(e) => updateExpenseRow(row.id, 'amount', formatAmount(e.target.value))}
                        placeholder="지출 금액"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
                    </div>
                    <input
                      type="text"
                      value={row.memo}
                      onChange={(e) => updateExpenseRow(row.id, 'memo', e.target.value)}
                      placeholder="메모 (선택)"
                      className="flex-[2] bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            onClick={addExpenseRow}
            className="w-full bg-gray-50 text-gray-600 border border-dashed border-gray-300 font-bold rounded-2xl py-4 text-[13px] flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <Plus size={18} />
            지출 항목 추가
          </button>

          <TransactionList 
            isIncome={false} 
            budgets={budgets} 
            refreshTrigger={refreshTrigger} 
            onToast={showToast} 
          />
        </div>
      </div>

      <div className="fixed bottom-16 left-0 w-full max-w-[480px] left-1/2 -translate-x-1/2 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 pb-safe">
        <button
          onClick={handleExpenseSubmit}
          className="w-full bg-primary text-white font-bold rounded-xl py-4 text-[15px] hover:bg-primary/90 transition-colors shadow-sm"
        >
          모두 전송하기 ({expenseRows.length}건)
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
