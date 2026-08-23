import { useState, useEffect } from 'react';
import { getBudgets, addTransaction } from '../services/api';
import { Budget } from '../types';
import { Check, Loader2 } from 'lucide-react';

interface InputPageProps {
  type?: 'income' | 'expense';
}

export default function InputPage({ type }: InputPageProps) {
  const isIncome = type === 'income';
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isIncome) {
      getBudgets().then(setBudgets).catch(console.error);
    }
  }, [isIncome]);

  // Toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // 날짜
  const today = new Date().toISOString().split('T')[0];
  
  // ============================
  // [유형 1] 정기 예산 원클릭 입금
  // ============================
  const handleOneClickBudget = async (categoryName: string) => {
    if (!window.confirm(`${categoryName} 예산을 이번 달 수입으로 일괄 등록하시겠습니까?`)) return;
    
    const targetBudgets = budgets.filter(b => b.category === categoryName);
    if (targetBudgets.length === 0) {
      showToast(`${categoryName}에 해당하는 예산 항목이 없습니다.`);
      return;
    }

    setLoading(true);
    try {
      await Promise.all(targetBudgets.map(b => 
        addTransaction({
          date: today,
          type: '수입',
          category: categoryName,
          content: b.subCategory,
          amount: b.amount
        })
      ));
      showToast(`${categoryName} 예산 일괄 등록이 완료되었습니다.`);
    } catch (err) {
      console.error(err);
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // [유형 2] 통장 이자 입력 (소액)
  // ============================
  const [interestAmount, setInterestAmount] = useState<string>('');
  const [interestCategory, setInterestCategory] = useState<string>('생활비 기타');
  
  const handleInterestSubmit = async () => {
    if (!interestAmount || isNaN(Number(interestAmount))) {
      showToast('정확한 금액을 입력해주세요.');
      return;
    }
    
    const mainCategory = interestCategory.includes('교통비') ? '교통비' : 
                         interestCategory.includes('예비비') ? '예비비' : '생활비';

    setLoading(true);
    try {
      await addTransaction({
        date: today,
        type: '수입',
        category: mainCategory,
        content: interestCategory,
        amount: Number(interestAmount)
      });
      showToast(`${interestCategory} 수입이 등록되었습니다.`);
      setInterestAmount('');
    } catch (err) {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // [유형 3] 잡수입 직접 입력
  // ============================
  const [manualCat, setManualCat] = useState('생활비');
  const [manualSub, setManualSub] = useState('');
  const [manualAmount, setManualAmount] = useState('');
  const [manualMemo, setManualMemo] = useState('');

  const handleManualSubmit = async () => {
    if (!manualSub || !manualAmount || isNaN(Number(manualAmount))) {
      showToast('세부 항목명과 금액을 모두 올바르게 입력해주세요.');
      return;
    }
    
    setLoading(true);
    try {
      await addTransaction({
        date: today,
        type: '수입',
        category: manualCat,
        content: manualMemo ? `${manualSub} (${manualMemo})` : manualSub,
        amount: Number(manualAmount)
      });
      showToast('기타 수입이 성공적으로 등록되었습니다.');
      setManualSub('');
      setManualAmount('');
      setManualMemo('');
    } catch (err) {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isIncome) {
    return (
      <div className="p-4 pt-8 pb-20 max-w-[480px] mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-text">지출 입력</h1>
          <p className="text-text-light text-sm mt-1">지출 입력 기능은 아직 준비 중입니다.</p>
        </header>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-center">
          <span className="text-3xl mb-3">🛒</span>
          <h2 className="text-lg font-bold text-gray-800">지출 폼 준비 중</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pt-8 pb-24 max-w-[480px] mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">수입 입력</h1>
        <p className="text-text-light text-sm mt-1">다양한 유형의 수입을 편리하게 기록하세요</p>
      </header>

      <div className="space-y-6 relative">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="animate-spin text-primary" size={36} />
          </div>
        )}

        {/* 유형 1: 정기 예산 원클릭 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>🎯</span> 정기 예산 원클릭 입금
          </h2>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            이번 달 정기 예산 항목들을 수입으로 일괄 자동 등록합니다.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['교통비', '생활비', '예비비'].map(cat => (
              <button
                key={cat}
                onClick={() => handleOneClickBudget(cat)}
                className="py-3 px-2 rounded-xl bg-blue-50 text-blue-600 font-bold text-[13px] hover:bg-blue-100 transition-colors border border-blue-100"
              >
                {cat} 일괄등록
              </button>
            ))}
          </div>
        </section>

        {/* 유형 2: 통장 이자 입력 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>💰</span> 통장 이자 (소액 수입)
          </h2>
          <div className="flex gap-2">
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
                type="number"
                value={interestAmount}
                onChange={(e) => setInterestAmount(e.target.value)}
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

        {/* 유형 3: 잡수입 수동 입력 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span>📝</span> 기타 수입 직접 입력
          </h2>
          <div className="space-y-3">
            <div className="flex gap-2">
              <select
                value={manualCat}
                onChange={(e) => setManualCat(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50 w-1/3"
              >
                <option value="교통비">교통비</option>
                <option value="생활비">생활비</option>
                <option value="예비비">예비비</option>
              </select>
              <input
                type="text"
                value={manualSub}
                onChange={(e) => setManualSub(e.target.value)}
                placeholder="항목명 (예: 당근마켓)"
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                placeholder="수입 금액"
                className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-medium rounded-xl px-3 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">원</span>
            </div>
            <input
              type="text"
              value={manualMemo}
              onChange={(e) => setManualMemo(e.target.value)}
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

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
    </div>
  );
}
