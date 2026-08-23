import { useState, useEffect } from 'react';
import { getBudgets, appendIncome, appendExpense } from '../services/api';
import { Budget } from '../types';
import { Check, Plus, Trash2 } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface InputPageProps {
  type?: 'income' | 'expense';
}

export default function InputPage({ type }: InputPageProps) {
  const isIncome = type === 'income';
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [registeredBudgets, setRegisteredBudgets] = useState<string[]>([]);

  // 금액 포맷팅 유틸리티
  const formatAmount = (val: string) => {
    const num = val.replace(/[^0-9]/g, '');
    if (!num) return '';
    return Number(num).toLocaleString();
  };
  const parseAmount = (val: string) => val.replace(/[^0-9]/g, '');

  // 세부 항목 조회 유틸리티 (기본값 추가)
  const getSubOptionsByCategory = (cat: string) => {
    const options = budgets.filter(b => b.category === cat).map(b => b.subCategory);
    if (cat === '생활비' && !options.includes('생활비 기타')) options.push('생활비 기타');
    if (cat === '교통비' && !options.includes('교통비 기타')) options.push('교통비 기타');
    if (cat === '예비비' && !options.includes('기타예비비')) options.push('기타예비비');
    return Array.from(new Set(options));
  };

  useEffect(() => {
    getBudgets().then(setBudgets).catch(console.error);
  }, []);

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
    if (registeredBudgets.includes(categoryName)) {
      if (!window.confirm(`${categoryName} 등록을 취소하시겠습니까?\n(현재는 UI 상태만 원복됩니다)`)) return;
      setRegisteredBudgets(prev => prev.filter(c => c !== categoryName));
      showToast(`${categoryName} 등록이 취소되었습니다.`);
      return;
    }

    if (!window.confirm(`${categoryName} 예산을 이번 달 수입으로 일괄 등록하시겠습니까?`)) return;
    
    const targetBudgets = budgets.filter(b => b.category === categoryName);
    if (targetBudgets.length === 0) {
      showToast(`${categoryName}에 해당하는 예산 항목이 없습니다.`);
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = targetBudgets.map(b => ({
        month: (new Date().getMonth() + 1).toString(),
        category: categoryName,
        subCategory: b.subCategory,
        amount: b.amount,
        memo: '정기 예산 원클릭'
      }));
      await appendIncome(dataToSubmit);
      
      setRegisteredBudgets(prev => [...prev, categoryName]);
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
    const rawAmount = parseAmount(interestAmount);
    if (!rawAmount || isNaN(Number(rawAmount))) {
      showToast('정확한 금액을 입력해주세요.');
      return;
    }
    
    const mainCategory = interestCategory.includes('교통비') ? '교통비' : 
                         interestCategory.includes('예비비') ? '예비비' : '생활비';

    setLoading(true);
    try {
      await appendIncome([{
        month: (new Date().getMonth() + 1).toString(),
        category: mainCategory,
        subCategory: interestCategory,
        amount: Number(rawAmount),
        memo: ''
      }]);
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

  // 대분류 변경 시 첫 번째 세부 항목으로 자동 설정
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
    
    setLoading(true);
    try {
      await appendIncome([{
        month: (new Date().getMonth() + 1).toString(),
        category: manualCat,
        subCategory: manualSub,
        amount: Number(rawAmount),
        memo: manualMemo
      }]);
      showToast('기타 수입이 성공적으로 등록되었습니다.');
      // 금액과 메모만 초기화
      setManualAmount('');
      setManualMemo('');
    } catch (err) {
      showToast('등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // ============================
  // 지출 입력 다중 폼 로직
  // ============================
  const [expenseMonth, setExpenseMonth] = useState((new Date().getMonth() + 1).toString());
  
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
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isIncome) {
    const months = Array.from({length: 12}, (_, i) => (i + 1).toString());

    return (
      <div className="p-4 pt-8 pb-32 max-w-[480px] mx-auto">
        <header className="mb-6">
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

        {/* Loading Overlay */}
        {loading && <LoadingSpinner text="데이터 전송 중..." overlay={true} />}

        <div className="space-y-4">
          {expenseRows.map((row, index) => {
            const subOptions = getSubOptionsByCategory(row.category);
            // 소분류 자동 선택 로직
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
        </div>

        {/* 하단 고정 전송 버튼 영역 */}
        <div className="fixed bottom-16 left-0 w-full max-w-[480px] left-1/2 -translate-x-1/2 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 z-40 pb-safe">
          <button
            onClick={handleExpenseSubmit}
            className="w-full bg-primary text-white font-bold rounded-xl py-4 text-[15px] hover:bg-primary/90 transition-colors shadow-sm"
          >
            모두 전송하기 ({expenseRows.length}건)
          </button>
        </div>

        {/* 토스트 알림 */}
        {toastMessage && (
          <div className="fixed bottom-36 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
            <Check size={16} className="text-green-400" />
            {toastMessage}
          </div>
        )}
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
        {loading && <LoadingSpinner text="데이터 전송 중..." overlay={true} />}

        {/* 유형 1: 정기 예산 원클릭 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span>🎯</span> 정기 예산 원클릭 입금
          </h2>
          <p className="text-[12px] text-gray-500 mb-4 leading-relaxed">
            이번 달 정기 예산 항목들을 수입으로 일괄 자동 등록합니다.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {['교통비', '생활비', '예비비'].map(cat => {
              const isRegistered = registeredBudgets.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => handleOneClickBudget(cat)}
                  className={`py-3 px-2 rounded-xl font-bold text-[13px] transition-colors border ${
                    isRegistered 
                      ? 'bg-gray-100 text-gray-500 border-gray-200' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100'
                  }`}
                >
                  {isRegistered ? '취소' : cat}
                </button>
              );
            })}
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
