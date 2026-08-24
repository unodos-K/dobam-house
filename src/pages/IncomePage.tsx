import React, { useState, useEffect, useRef } from 'react';
import { getBudgets, getDashboard, appendIncome } from '../services/api';
import { Budget, DashboardData } from '../types';
import { Check, CheckCircle2, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import ConfirmModal from '../components/ConfirmModal';
import BalanceWidget from '../components/BalanceWidget';

export default function IncomePage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '확인',
    message: '',
    confirmText: '확인',
    onConfirm: () => {}
  });

  const [budgetMonth, setBudgetMonth] = useState((new Date().getMonth() + 1).toString());
  const today = new Date().toISOString().split('T')[0];
  const [oneClickDate, setOneClickDate] = useState(today);

  interface IncomeRow {
    id: string;
    date: string;
    category: string;
    subCategory: string;
    amount: string;
    memo: string;
  }
  
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([{
    id: Date.now().toString(),
    date: today,
    category: '생활비',
    subCategory: '',
    amount: '',
    memo: ''
  }]);

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

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
    getDashboard().then(setDashboardData).catch(console.error);
  }, []);

  const isBudgetRegistered = (cat: string) => {
    if (!dashboardData) return false;
    const monthData = dashboardData[budgetMonth];
    if (!monthData || !monthData[cat]) return false;
    
    const budgetSum = budgets.filter(b => b.category === cat).reduce((sum, b) => sum + b.amount, 0);
    return budgetSum > 0 && monthData[cat].totalIncome >= budgetSum;
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  const handleOneClickBudget = async (categoryName: string) => {
    const isRegistered = isBudgetRegistered(categoryName);
    const targetBudgets = budgets.filter(b => b.category === categoryName);
    
    if (targetBudgets.length === 0) {
      showToast(`${categoryName}에 해당하는 예산 항목이 없습니다.`);
      return;
    }

    if (!oneClickDate) {
      alert('날짜를 먼저 입력해주세요.');
      return;
    }

    if (isRegistered) {
      setConfirmConfig({
        isOpen: true,
        title: '정기예산 입금 취소',
        message: `${budgetMonth}월 ${categoryName} 입금을 취소하시겠습니까?\n(마이너스 금액으로 장부에 상계 처리됩니다)`,
        confirmText: '입금 취소',
        onConfirm: async () => {
          setConfirmConfig(prev => ({ ...prev, isOpen: false }));
          setLoading(true);
          try {
            const dataToSubmit = targetBudgets.map(b => ({
              month: budgetMonth,
              date: oneClickDate,
              category: categoryName,
              subCategory: b.subCategory,
              amount: -b.amount,
              memo: '정기 예산 원클릭 (취소)'
            }));
            await appendIncome(dataToSubmit);
            const newData = await getDashboard();
            setDashboardData(newData);
            showToast(`${budgetMonth}월 ${categoryName} 입금이 취소되었습니다.`);
          } catch (err) {
            showToast('취소 처리 중 오류가 발생했습니다.');
          } finally {
            setLoading(false);
          }
        }
      });
      return;
    }

    setConfirmConfig({
      isOpen: true,
      title: '정기예산 일괄 입금',
      message: `${budgetMonth}월 ${categoryName} 예산을 일괄 입금하시겠습니까?`,
      confirmText: '일괄 입금',
      onConfirm: async () => {
        setConfirmConfig(prev => ({ ...prev, isOpen: false }));
        setLoading(true);
        try {
          const dataToSubmit = targetBudgets.map(b => ({
            month: budgetMonth,
            date: oneClickDate,
            category: categoryName,
            subCategory: b.subCategory,
            amount: b.amount,
            memo: '정기 예산 원클릭'
          }));
          await appendIncome(dataToSubmit);
          const newData = await getDashboard();
          setDashboardData(newData);
          showToast(`${budgetMonth}월 ${categoryName} 예산 입금이 완료되었습니다.`);
        } catch (err) {
          showToast('등록 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const amountInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const addIncomeRow = () => {
    if (incomeRows.length >= 20) {
      showToast('최대 20개까지만 추가할 수 있습니다.');
      return;
    }
    const lastRow = incomeRows[incomeRows.length - 1];
    setIncomeRows([...incomeRows, {
      id: Date.now().toString(),
      date: lastRow.date,
      category: lastRow.category,
      subCategory: lastRow.subCategory,
      amount: '',
      memo: ''
    }]);
    
    setTimeout(() => {
      const el = amountInputRefs.current[incomeRows.length];
      if (el) el.focus();
    }, 50);
  };

  const handleMemoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addIncomeRow();
    }
  };

  const removeIncomeRow = (id: string) => {
    if (incomeRows.length <= 1) return;
    setIncomeRows(incomeRows.filter(r => r.id !== id));
  };

  const updateIncomeRow = (id: string, field: keyof IncomeRow, value: string) => {
    setIncomeRows(incomeRows.map(r => {
      if (r.id === id) {
        const updated = { ...r, [field]: value };
        if (field === 'category') updated.subCategory = '';
        return updated;
      }
      return r;
    }));
  };

  const handleIncomeSubmit = async () => {
    const invalidRow = incomeRows.find(r => !r.category || !r.subCategory || !parseAmount(r.amount));
    if (invalidRow) {
      showToast('모든 항목의 세부 분류와 금액을 올바르게 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = incomeRows.map(r => ({
        month: budgetMonth,
        date: r.date,
        category: r.category,
        subCategory: r.subCategory,
        amount: Number(parseAmount(r.amount)),
        memo: r.memo
      }));
      await appendIncome(dataToSubmit);
      const newData = await getDashboard();
      setDashboardData(newData);
      
      showToast('수입 내역 전송 성공!');
      setIncomeRows([{
        id: Date.now().toString(),
        date: today,
        category: '생활비',
        subCategory: '',
        amount: '',
        memo: ''
      }]);
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-32 bg-gray-50/30">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1 max-w-[480px] mx-auto w-full">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-bold text-text">수입 입력</h1>
            <p className="text-text-light text-sm mt-1">다양한 유형의 수입을 편리하게 기록하세요</p>
          </div>
          <select
            value={budgetMonth}
            onChange={(e) => setBudgetMonth(e.target.value)}
            className="bg-white border border-gray-200 text-gray-800 font-bold text-sm rounded-xl px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {Array.from({length: 12}, (_, i) => (i + 1).toString()).map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
        </div>
      </header>

      <div className="px-4 max-w-[480px] mx-auto w-full">
        <BalanceWidget dashboardData={dashboardData} month={budgetMonth} />
        <div className="space-y-6 relative">
          {loading && <LoadingSpinner text="데이터 전송 중..." overlay={true} />}

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
                <span>🎯</span> 정기 예산 원클릭 입금
              </h2>
              <input
                type="date"
                value={oneClickDate}
                onChange={(e) => setOneClickDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-medium text-[13px] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
              선택한 월의 정기 예산 항목들을 수입으로 일괄 자동 등록합니다.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {['교통비', '생활비', '예비비'].map(cat => {
                const registered = isBudgetRegistered(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => handleOneClickBudget(cat)}
                    disabled={loading}
                    className={`group relative flex flex-col items-center justify-center gap-1.5 p-4 rounded-[20px] transition-all overflow-hidden ${
                      registered 
                        ? 'bg-[#EAF1E4] border border-[#d3e2c6] shadow-inner' 
                        : 'bg-white shadow-sm border border-gray-100 hover:-translate-y-1 hover:shadow-md'
                    }`}
                  >
                    {registered ? (
                      <>
                        <div className="flex flex-col items-center justify-center transition-opacity duration-300 group-hover:opacity-0 group-active:opacity-0">
                          <CheckCircle2 size={24} className="text-[#748E63] mb-1" />
                          <span className="font-extrabold text-[13px] text-[#748E63]">{cat} 입금 완료!</span>
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-active:opacity-100 bg-red-50/90 backdrop-blur-sm">
                          <span className="font-extrabold text-[13px] text-red-500">입금 취소하기</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <span className="text-[11px] font-bold text-text-light">{cat}</span>
                        <span className="font-extrabold text-[15px] text-text">입금하기</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-4 relative">
            {incomeRows.map((row, index) => {
              const subOptions = getSubOptionsByCategory(row.category);
              if (!row.subCategory && subOptions.length > 0) {
                 updateIncomeRow(row.id, 'subCategory', subOptions[0]);
              }

              return (
                <div key={row.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative">
                  <div className="flex justify-between items-center mb-3">
                    <span className="bg-gray-100 text-gray-500 font-bold text-[10px] px-2 py-1 rounded-md">
                      #{index + 1}
                    </span>
                    {incomeRows.length > 1 && (
                      <button onClick={() => removeIncomeRow(row.id)} className="text-red-400 hover:text-red-500 transition-colors p-1">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  
                  <div className="space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={row.date}
                        onChange={(e) => updateIncomeRow(row.id, 'date', e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                      />
                      <select
                        value={row.category}
                        onChange={(e) => updateIncomeRow(row.id, 'category', e.target.value)}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                      >
                        <option value="교통비">교통비</option>
                        <option value="생활비">생활비</option>
                        <option value="예비비">예비비</option>
                      </select>
                      <select
                        value={row.subCategory}
                        onChange={(e) => updateIncomeRow(row.id, 'subCategory', e.target.value)}
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
                          ref={el => amountInputRefs.current[index] = el}
                          value={row.amount}
                          onChange={(e) => updateIncomeRow(row.id, 'amount', formatAmount(e.target.value))}
                          placeholder="수입 금액"
                          className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl pl-3 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">원</span>
                      </div>
                      <input
                        type="text"
                        value={row.memo}
                        onChange={(e) => updateIncomeRow(row.id, 'memo', e.target.value)}
                        onKeyDown={handleMemoKeyDown}
                        placeholder="메모 (선택)"
                        className="flex-[2] bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              onClick={addIncomeRow}
              className="w-full bg-gray-50 text-gray-600 border border-dashed border-gray-300 font-bold rounded-2xl py-4 text-[13px] flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
            >
              <Plus size={18} />
              수입 항목 추가
            </button>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 w-full max-w-[480px] left-1/2 -translate-x-1/2 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 pb-safe">
        <button
          onClick={handleIncomeSubmit}
          className="w-full bg-primary text-white font-bold rounded-xl py-4 text-[15px] hover:bg-primary/90 transition-colors shadow-sm"
        >
          모두 전송하기 ({incomeRows.length}건)
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-36 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}

      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        confirmText={confirmConfig.confirmText}
      />
    </div>
  );
}
