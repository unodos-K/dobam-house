import React, { useState, useEffect, useRef } from 'react';
import { getBudgets, getDashboard, appendIncome } from '../services/api';
import { Budget, DashboardData } from '../types';
import { Check, CheckCircle2 } from 'lucide-react';
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
  const [oneClickDate, setOneClickDate] = useState(new Date().toISOString().split('T')[0]);
  const [interestDate, setInterestDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);

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

  const [interestAmount, setInterestAmount] = useState<string>('');
  const [interestCategory, setInterestCategory] = useState<string>('생활비 기타');
  
  const handleInterestSubmit = async () => {
    const rawAmount = parseAmount(interestAmount);
    if (!rawAmount || isNaN(Number(rawAmount))) {
      showToast('정확한 금액을 입력해주세요.');
      return;
    }
    
    if (!interestDate) {
      alert('날짜를 먼저 입력해주세요.');
      return;
    }
    
    const mainCategory = interestCategory.includes('교통비') ? '교통비' : 
                         interestCategory.includes('예비비') ? '예비비' : '생활비';

    setLoading(true);
    try {
      await appendIncome([{
        month: budgetMonth,
        date: interestDate,
        category: mainCategory,
        subCategory: interestCategory,
        amount: Number(rawAmount),
        memo: ''
      }]);
      const newData = await getDashboard();
      setDashboardData(newData);
      showToast(`${interestCategory} 수입이 등록되었습니다.`);
      setInterestAmount('');
    } catch (err) {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const [manualCat, setManualCat] = useState('생활비');
  const [manualSub, setManualSub] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMemo, setManualMemo] = useState('');

  useEffect(() => {
    const options = getSubOptionsByCategory(manualCat);
    if (options.length > 0) {
      setManualSub(options[0]);
    } else {
      setManualSub('');
    }
  }, [manualCat, budgets]);

  const handleManualSubmit = async () => {
    const rawAmount = parseAmount(manualAmount);
    if (!manualSub || !rawAmount || isNaN(Number(rawAmount))) {
      showToast('세부 항목과 금액을 모두 올바르게 입력해주세요.');
      return;
    }
    
    if (!manualDate) {
      alert('날짜를 먼저 입력해주세요.');
      return;
    }
    
    setLoading(true);
    try {
      await appendIncome([{
        month: budgetMonth,
        date: manualDate,
        category: manualCat,
        subCategory: manualSub,
        amount: Number(rawAmount),
        memo: manualMemo
      }]);
      const newData = await getDashboard();
      setDashboardData(newData);
      showToast('기타 수입이 성공적으로 등록되었습니다.');
      setManualAmount('');
      setManualMemo('');
    } catch (err) {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const manualAmountRef = useRef<HTMLInputElement>(null);

  const handleManualMemoKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleManualSubmit().then(() => {
        setTimeout(() => {
          manualAmountRef.current?.focus();
        }, 50);
      });
    }
  };

  return (
    <div className="pb-24 bg-gray-50/30">
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

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>💰</span> 통장 이자 (소액 수입)
            </h2>
            <div className="flex gap-2">
              <input
                type="date"
                value={interestDate}
                onChange={(e) => setInterestDate(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
              />
              <select
                value={interestCategory}
                onChange={(e) => setInterestCategory(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
              >
                <option value="생활비 기타">생활비 기타</option>
                <option value="교통비 기타">교통비 기타</option>
                <option value="기타예비비">기타예비비</option>
              </select>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={interestAmount}
                  onChange={(e) => setInterestAmount(formatAmount(e.target.value))}
                  placeholder="금액 입력"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl pl-3 pr-8 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
              </div>
              <button
                onClick={handleInterestSubmit}
                className="bg-gray-800 text-white font-bold rounded-xl px-4 py-3 text-[13px] hover:bg-gray-700 transition-colors whitespace-nowrap"
              >
                입력
              </button>
            </div>
          </section>

          <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h2 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span>📝</span> 기타 수입 직접 입력
            </h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="date"
                  value={manualDate}
                  onChange={(e) => setManualDate(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-2 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                />
                <select
                  value={manualCat}
                  onChange={(e) => setManualCat(e.target.value)}
                  className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
                >
                  <option value="교통비">교통비</option>
                  <option value="생활비">생활비</option>
                  <option value="예비비">예비비</option>
                </select>
                <select
                  value={manualSub}
                  onChange={(e) => setManualSub(e.target.value)}
                  className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                >
                  {getSubOptionsByCategory(manualCat).map(subCat => (
                    <option key={subCat} value={subCat}>
                      {subCat}
                    </option>
                  ))}
                  {getSubOptionsByCategory(manualCat).length === 0 && (
                    <option value="" disabled>항목 없음</option>
                  )}
                </select>
              </div>
              <div className="relative">
                <input
                  type="text"
                  ref={manualAmountRef}
                  value={manualAmount}
                  onChange={(e) => setManualAmount(formatAmount(e.target.value))}
                  placeholder="수입 금액"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
              </div>
              <input
                type="text"
                value={manualMemo}
                onChange={(e) => setManualMemo(e.target.value)}
                onKeyDown={handleManualMemoKeyDown}
                placeholder="메모를 입력하세요 (선택)"
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button
                onClick={handleManualSubmit}
                className="w-full bg-primary text-white font-bold rounded-xl px-4 py-3.5 text-[14px] hover:bg-primary/90 transition-colors mt-2 shadow-sm"
              >
                입력 완료
              </button>
            </div>
          </section>
        </div>
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
