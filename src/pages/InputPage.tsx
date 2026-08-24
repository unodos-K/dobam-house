import { useState, useEffect } from 'react';
import { getBudgets, getDashboard, appendIncome, appendExpense, getTransactions, deleteTransaction, updateTransaction } from '../services/api';
import { Budget, DashboardData, Transaction } from '../types';
import { Check, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

interface InputPageProps {
  type?: 'income' | 'expense';
}

export default function InputPage({ type }: InputPageProps) {
  const isIncome = type === 'income';
  
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // 리스트 및 필터 상태
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const currentM = (new Date().getMonth() + 1).toString();
  const [filterMonth, setFilterMonth] = useState<string>(currentM);
  const [filterCat, setFilterCat] = useState<string>('전체');
  const [filterSubCat, setFilterSubCat] = useState<string>('전체');
  
  // 수정 기능 상태
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Transaction | null>(null);

  // 정기예산 월 선택
  const [budgetMonth, setBudgetMonth] = useState((new Date().getMonth() + 1).toString());

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
    getTransactions().then(setTransactions).catch(console.error);
    if (isIncome) {
      getDashboard().then(setDashboardData).catch(console.error);
    }
  }, [isIncome]);

  // 필터 로직
  useEffect(() => {
    setFilterSubCat('전체');
  }, [filterCat]);

  const filterSubOptions = filterCat === '전체' ? [] : getSubOptionsByCategory(filterCat);

  const filteredTransactions = transactions.filter(t => {
    if (isIncome && t.type !== '수입') return false;
    if (!isIncome && t.type !== '지출') return false;
    
    if (filterMonth !== '전체') {
      const dateObj = new Date(t.date);
      if (!isNaN(dateObj.getTime())) {
        if ((dateObj.getMonth() + 1).toString() !== filterMonth) return false;
      }
    }
    
    if (filterCat !== '전체' && t.category !== filterCat) return false;
    if (filterSubCat !== '전체' && t.content !== filterSubCat) return false;
    return true;
  });

  const filteredTotal = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);

  // 내역 삭제 및 수정 핸들러
  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      showToast('삭제가 완료되었습니다.');
    } catch (err) {
      showToast('삭제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditForm({ ...t });
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    setLoading(true);
    try {
      await updateTransaction(editForm);
      setTransactions(prev => prev.map(t => t.id === editForm.id ? editForm : t));
      showToast('수정이 완료되었습니다.');
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      showToast('수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const renderTransactionList = () => (
    <div className="mt-12 space-y-4">
      <h2 className="text-[15px] font-bold text-gray-800 px-1 flex items-center gap-2">
        <span>📋</span> 최근 등록 내역
      </h2>
      
      {/* 3단 필터 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
          {/* 1) 월별 필터 */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-medium rounded-xl px-2 py-2 focus:outline-none"
          >
            <option value="전체">전체 월</option>
            {Array.from({length: 12}, (_, i) => (i + 1).toString()).map(m => (
              <option key={m} value={m}>{m}월</option>
            ))}
          </select>
          
          {/* 2) 대분류 필터 */}
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-medium rounded-xl px-2 py-2 focus:outline-none"
          >
            <option value="전체">전체 항목</option>
            <option value="교통비">교통비</option>
            <option value="생활비">생활비</option>
            <option value="예비비">예비비</option>
          </select>

          {/* 3) 세부항목 필터 */}
          <select
            value={filterSubCat}
            onChange={e => setFilterSubCat(e.target.value)}
            disabled={filterCat === '전체'}
            className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[12px] font-medium rounded-xl px-2 py-2 focus:outline-none disabled:opacity-50"
          >
            <option value="전체">전체 세부</option>
            {filterSubOptions.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
        
        {/* 요약 카드 */}
        <div className={`p-3 rounded-xl border flex items-center justify-between shadow-sm ${
          isIncome ? 'bg-blue-50/40 border-blue-100 text-blue-700' : 'bg-red-50/40 border-red-100 text-red-700'
        }`}>
          <span className="text-[13px] font-bold flex items-center gap-1.5">
            🔍 검색된 내역 합계
          </span>
          <span className="text-[15px] font-extrabold tracking-tight">
            {filteredTotal.toLocaleString()}원
          </span>
        </div>
      </div>

      {/* 리스트 */}
      <div className="space-y-2 pb-10">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 border-dashed">
            해당하는 내역이 없습니다.
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-colors">
              {editingId === t.id && editForm ? (
                // 수정 폼
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={editForm.date}
                      onChange={e => setEditForm({ ...editForm, date: e.target.value })}
                      className="bg-gray-50 border border-gray-200 text-gray-700 text-[12px] rounded-lg px-2 py-1.5 focus:outline-none w-1/3"
                    />
                    <select
                      value={editForm.category}
                      onChange={e => setEditForm({ ...editForm, category: e.target.value })}
                      className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[12px] rounded-lg px-2 py-1.5 focus:outline-none"
                    >
                      <option value="교통비">교통비</option>
                      <option value="생활비">생활비</option>
                      <option value="예비비">예비비</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editForm.content}
                      onChange={e => setEditForm({ ...editForm, content: e.target.value })}
                      className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 text-[12px] rounded-lg px-2 py-1.5 focus:outline-none"
                      placeholder="세부항목 / 메모"
                    />
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={formatAmount(editForm.amount.toString())}
                        onChange={e => {
                          const val = parseAmount(e.target.value);
                          setEditForm({ ...editForm, amount: Number(val) });
                        }}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-[12px] rounded-lg pl-2 pr-6 py-1.5 focus:outline-none"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">원</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-[11px] font-bold text-gray-500 bg-gray-100 rounded-lg flex items-center gap-1">
                      <X size={12} /> 취소
                    </button>
                    <button onClick={handleEditSave} className="px-3 py-1.5 text-[11px] font-bold text-white bg-blue-500 rounded-lg flex items-center gap-1">
                      <Save size={12} /> 저장
                    </button>
                  </div>
                </div>
              ) : (
                // 일반 뷰
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">{t.category}</span>
                        <span className="text-[11px] text-gray-400 font-medium">{t.date}</span>
                      </div>
                      <div className="text-[13px] font-bold text-gray-700">{t.content.replace(/☑/g, '').trim()}</div>
                    </div>
                    <div className={`font-bold text-[14px] ${isIncome ? 'text-blue-500' : 'text-red-500'}`}>
                      {isIncome ? '+' : '-'}{t.amount.toLocaleString()}원
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-50">
                    <button onClick={() => startEdit(t)} className="text-gray-400 hover:text-blue-500 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(t.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );

  // 입금 완료 상태 판별 (API 데이터 기반)
  const isBudgetRegistered = (cat: string) => {
    if (!dashboardData) return false;
    const monthData = dashboardData[budgetMonth];
    if (!monthData || !monthData[cat]) return false;
    
    // 해당 카테고리의 예산 합계 계산
    const budgetSum = budgets.filter(b => b.category === cat).reduce((sum, b) => sum + b.amount, 0);
    // 현재 수입 합계가 예산 합계 이상이면 입금 완료로 간주
    return budgetSum > 0 && monthData[cat].totalIncome >= budgetSum;
  };

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
    const isRegistered = isBudgetRegistered(categoryName);
    const targetBudgets = budgets.filter(b => b.category === categoryName);
    
    if (targetBudgets.length === 0) {
      showToast(`${categoryName}에 해당하는 예산 항목이 없습니다.`);
      return;
    }

    if (isRegistered) {
      if (!window.confirm(`${budgetMonth}월 ${categoryName} 입금을 취소하시겠습니까?\n(마이너스 금액으로 장부에 상계 처리됩니다)`)) return;
      
      setLoading(true);
      try {
        const dataToSubmit = targetBudgets.map(b => ({
          month: budgetMonth,
          category: categoryName,
          subCategory: b.subCategory,
          amount: -b.amount, // 음수로 전송하여 취소 처리
          memo: '정기 예산 원클릭 (취소)'
        }));
        await appendIncome(dataToSubmit);
        
        // 대시보드 데이터 및 내역 새로고침
        const newData = await getDashboard();
        setDashboardData(newData);
        getTransactions().then(setTransactions).catch(console.error);
        showToast(`${budgetMonth}월 ${categoryName} 입금이 취소되었습니다.`);
      } catch (err) {
        showToast('취소 처리 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!window.confirm(`${budgetMonth}월 ${categoryName} 예산을 일괄 입금하시겠습니까?`)) return;
    
    setLoading(true);
    try {
      const dataToSubmit = targetBudgets.map(b => ({
        month: budgetMonth,
        category: categoryName,
        subCategory: b.subCategory,
        amount: b.amount,
        memo: '정기 예산 원클릭'
      }));
      await appendIncome(dataToSubmit);
      
      const newData = await getDashboard();
      setDashboardData(newData);
      getTransactions().then(setTransactions).catch(console.error);
      showToast(`${budgetMonth}월 ${categoryName} 예산 입금이 완료되었습니다.`);
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
      getTransactions().then(setTransactions).catch(console.error);
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
      getTransactions().then(setTransactions).catch(console.error);
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
      getTransactions().then(setTransactions).catch(console.error);
    } catch (err) {
      showToast('전송 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (!isIncome) {
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

        {renderTransactionList()}

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
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-50/30">
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1 max-w-[480px] mx-auto w-full">
        <h1 className="text-2xl font-bold text-text">수입 입력</h1>
        <p className="text-text-light text-sm mt-1">다양한 유형의 수입을 편리하게 기록하세요</p>
      </header>

      <div className="px-4 max-w-[480px] mx-auto w-full">
        <div className="space-y-6 relative">
        {/* Loading Overlay */}
        {loading && <LoadingSpinner text="데이터 전송 중..." overlay={true} />}

        {/* 유형 1: 정기 예산 원클릭 */}
        <section className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-[15px] font-bold text-gray-800 flex items-center gap-2">
              <span>🎯</span> 정기 예산 원클릭 입금
            </h2>
            <select
              value={budgetMonth}
              onChange={(e) => setBudgetMonth(e.target.value)}
              className="bg-gray-100 border-none text-gray-700 font-bold text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {Array.from({length: 12}, (_, i) => (i + 1).toString()).map(m => (
                <option key={m} value={m}>{m}월</option>
              ))}
            </select>
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
                  className={`py-3 px-2 rounded-xl font-bold text-[13px] transition-colors border ${
                    registered 
                      ? 'bg-gray-100 text-gray-500 border-gray-200' 
                      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100'
                  }`}
                >
                  {registered ? '입금 완료 (취소)' : cat}
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
        
        {renderTransactionList()}
      </div>

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800/90 backdrop-blur-sm text-white px-5 py-3 rounded-full text-[13px] font-medium shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300 whitespace-nowrap">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
      </div>
    </div>
  );
}
