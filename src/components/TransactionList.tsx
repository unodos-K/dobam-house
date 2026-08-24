import { useState, useEffect } from 'react';
import { getTransactions, deleteTransaction, updateTransaction } from '../services/api';
import { Budget, Transaction } from '../types';
import { Edit2, Save, Trash2, X } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

interface TransactionListProps {
  isIncome: boolean;
  budgets: Budget[];
  refreshTrigger: number;
  onToast: (msg: string) => void;
}

export default function TransactionList({ isIncome, budgets, refreshTrigger, onToast }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const currentM = (new Date().getMonth() + 1).toString();
  const [filterMonth, setFilterMonth] = useState<string>(currentM);
  const [filterCat, setFilterCat] = useState<string>('전체');
  const [filterSubCat, setFilterSubCat] = useState<string>('전체');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTransactions().then(setTransactions).catch(console.error);
  }, [isIncome, refreshTrigger]);

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

  const handleDelete = async (id: string) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    setLoading(true);
    try {
      await deleteTransaction(id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      onToast('삭제가 완료되었습니다.');
    } catch (err) {
      onToast('삭제 중 오류가 발생했습니다.');
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
      onToast('수정이 완료되었습니다.');
      setEditingId(null);
      setEditForm(null);
    } catch (err) {
      onToast('수정 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-12 space-y-4 relative">
      {loading && <LoadingSpinner text="처리 중..." overlay={true} />}
      
      <h2 className="text-[15px] font-bold text-gray-800 px-1 flex items-center gap-2">
        <span>📋</span> 최근 등록 내역
      </h2>
      
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-3">
        <div className="flex gap-2">
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

      <div className="space-y-2 pb-10">
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm bg-white rounded-2xl border border-gray-100 border-dashed">
            해당하는 내역이 없습니다.
          </div>
        ) : (
          filteredTransactions.map(t => (
            <div key={t.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 transition-colors">
              {editingId === t.id && editForm ? (
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
}
