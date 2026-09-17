import { supabase } from '../lib/supabase';
import { Transaction, Budget, DashboardData, BudgetOneClickStatus, IncomeInsert, ExpenseInsert, TransactionType } from '../types';

// 환경 변수로 Mock 사용 여부 강제 제어 가능
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

const MOCK_STORAGE_KEY = 'dobam_transactions_mock';

// LocalStorage를 활용한 Mock 데이터 초기화
const getMockData = (): Transaction[] => {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (data) return JSON.parse(data);
  return [];
};

const saveMockData = (data: Transaction[]) => {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(data));
};

const mockBudgets: Budget[] = [
  { category: '고정지출', bank: '신한은행', account: '110-123-456789', subCategory: '관리비', amount: 150000 },
  { category: '고정지출', bank: '신한은행', account: '110-123-456789', subCategory: '통신비', amount: 100000 },
  { category: '변동지출', bank: '국민은행', account: '942302-01-123456', subCategory: '식비', amount: 600000 },
  { category: '변동지출', bank: '국민은행', account: '942302-01-123456', subCategory: '교통비', amount: 120000 },
  { category: '도밤이', bank: '카카오뱅크', account: '3333-01-1234567', subCategory: '사료/간식', amount: 80000 },
  { category: '도밤이', bank: '카카오뱅크', account: '3333-01-1234567', subCategory: '병원비', amount: 50000 },
];

export const getBudgets = async (): Promise<Budget[]> => {
  if (USE_MOCK) return mockBudgets;

  try {
    const { data, error } = await supabase.from('budgets').select('*');
    if (error) throw error;
    
    // 마이그레이션 중복 방지를 위한 데이터 덮어쓰기(Deduplication) 로직
    const uniqueBudgetsMap = new Map();
    data.forEach(item => {
      const key = `${item.category}-${item.subCategory}`;
      if (!uniqueBudgetsMap.has(key)) {
        uniqueBudgetsMap.set(key, item);
      }
    });
    
    return Array.from(uniqueBudgetsMap.values()) as Budget[];
  } catch (error) {
    console.error('API Error (getBudgets):', error);
    throw error;
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  if (USE_MOCK) return getMockData();

  try {
    const { data: expenses, error: expError } = await supabase.from('expenses').select('*');
    if (expError) throw expError;

    const { data: incomes, error: incError } = await supabase.from('incomes').select('*');
    if (incError) throw incError;

    const formattedExpenses = (expenses || []).map(e => ({
      ...e,
      type: '지출' as const,
      subCategory: e.subCategory,
      content: e.memo || '' // Ensure content exists
    }));

    const formattedIncomes = (incomes || []).map(i => ({
      ...i,
      type: '수입' as const,
      subCategory: i.subCategory,
      content: i.memo || '' // Ensure content exists
    }));

    const allTransactions = [...formattedExpenses, ...formattedIncomes];
    allTransactions.sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
      if (dateDiff !== 0) return dateDiff;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    });

    return allTransactions as unknown as Transaction[];
  } catch (error) {
    console.error('API Error (getTransactions):', error);
    throw error;
  }
};

export const appendIncome = async (dataArray: IncomeInsert[]) => {
  if (USE_MOCK) return;

  try {
    const { error } = await supabase.from('incomes').insert(dataArray);
    if (error) throw error;
  } catch (error) {
    console.error('API Error (appendIncome):', error);
    throw error;
  }
};

const createBatchId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  throw new Error('이 환경에서는 안전한 원클릭 batch ID를 생성할 수 없습니다.');
};

export const getBudgetOneClickStatus = async (month: string, category: string): Promise<BudgetOneClickStatus> => {
  if (USE_MOCK) {
    const rows = getMockData().filter(t => t.type === '수입' && t.date.slice(5, 7) === month.padStart(2, '0') && t.category === category);
    const active = rows.find(t => t.source === 'budget_one_click' && t.batch_id);
    return { activeBatchId: active?.batch_id || null, legacyUnmanaged: false };
  }

  try {
    const { data, error } = await supabase
      .from('incomes')
      .select('batch_id, amount, memo, source')
      .eq('month', month)
      .eq('category', category)
      .eq('source', 'budget_one_click');
    if (error) throw error;

    const activeBatch = (data || []).find(row => row.batch_id);
    const hasLegacyPositive = (data || []).some(row => !row.batch_id && Number(row.amount) > 0 && row.memo === '정기 예산 원클릭');
    const hasLegacyCancel = (data || []).some(row => !row.batch_id && Number(row.amount) < 0 && row.memo === '정기 예산 원클릭 (취소)');
    return {
      activeBatchId: activeBatch?.batch_id || null,
      legacyUnmanaged: !activeBatch && hasLegacyPositive && !hasLegacyCancel
    };
  } catch (error) {
    console.error('API Error (getBudgetOneClickStatus):', error);
    throw error;
  }
};

export const createBudgetOneClick = async (input: Omit<IncomeInsert, 'source' | 'batch_id' | 'subCategory' | 'amount'>) => {
  const batchId = createBatchId();
  if (USE_MOCK) {
    const mockRows = getMockData();
    const rows = mockRows.filter(t => t.type === '수입' && t.source === 'budget_one_click' && t.batch_id && t.date.slice(5, 7) === input.month.padStart(2, '0') && t.category === input.category);
    if (rows.length > 0) throw new Error('활성 원클릭 입금이 이미 존재합니다.');
    saveMockData([...mockRows, {
      id: batchId,
      date: input.date,
      type: '수입',
      category: input.category,
      subCategory: input.category,
      memo: input.memo,
      content: input.memo,
      amount: 0,
      source: 'budget_one_click',
      batch_id: batchId
    }]);
    return batchId;
  }

  try {
    const { error } = await supabase.rpc('create_budget_one_click', {
      p_month: input.month,
      p_date: input.date,
      p_category: input.category,
      p_batch_id: batchId
    });
    if (error) throw error;
    return batchId;
  } catch (error) {
    console.error('API Error (createBudgetOneClick):', error);
    throw error;
  }
};

export const cancelBudgetOneClick = async (batchId: string | null) => {
  if (!batchId) throw new Error('기존 원클릭 기록은 batch 식별자가 없어 자동 취소할 수 없습니다.');
  if (USE_MOCK) {
    saveMockData(getMockData().filter(t => t.batch_id !== batchId));
    return;
  }

  try {
    const { error } = await supabase.rpc('cancel_budget_one_click', { p_batch_id: batchId });
    if (error) throw error;
  } catch (error) {
    console.error('API Error (cancelBudgetOneClick):', error);
    throw error;
  }
};

export const appendExpense = async (dataArray: ExpenseInsert[]) => {
  if (USE_MOCK) return;

  try {
    const { error } = await supabase.from('expenses').insert(dataArray);
    if (error) throw error;
  } catch (error) {
    console.error('API Error (appendExpense):', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string, type: TransactionType) => {
  if (USE_MOCK) {
    const current = getMockData();
    const transaction = current.find(t => t.id === id && t.type === type);
    if (transaction?.source === 'budget_one_click') {
      throw new Error('원클릭 예산은 batch 취소로만 삭제할 수 있습니다.');
    }
    const found = Boolean(transaction);
    if (!found) throw new Error('삭제할 거래를 찾을 수 없습니다.');
    const data = current.filter(t => !(t.id === id && t.type === type));
    saveMockData(data);
    return id;
  }
  
  try {
    const table = type === '지출' ? 'expenses' : 'incomes';
    if (type === '수입') {
      const { data: income, error: lookupError } = await supabase
        .from('incomes')
        .select('source, batch_id')
        .eq('id', id)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (income?.source === 'budget_one_click') {
        throw new Error('원클릭 예산은 batch 취소로만 삭제할 수 있습니다.');
      }
    }
    const { data, error } = await supabase.from(table).delete().eq('id', id).select('id');
    if (error) throw error;
    if (!data || data.length === 0) throw new Error('삭제할 거래를 찾을 수 없습니다.');
    return id;
  } catch (error) {
    console.error('API Error (deleteTransaction):', error);
    throw error;
  }
};

export const updateTransaction = async (transaction: Transaction) => {
  if (USE_MOCK) {
    const data = getMockData().map(t => t.id === transaction.id ? transaction : t);
    saveMockData(data);
    return transaction;
  }
  
  try {
    const { id, type } = transaction;
    const table = type === '지출' ? 'expenses' : 'incomes';
    const updateData = type === '지출'
      ? { date: transaction.date, category: transaction.category, subCategory: transaction.subCategory, amount: transaction.amount, memo: transaction.memo || '' }
      : { date: transaction.date, category: transaction.category, subCategory: transaction.subCategory, amount: transaction.amount, memo: transaction.memo || '', source: transaction.source || 'manual', batch_id: transaction.batch_id || null };

    const updateQuery = supabase.from(table).update(updateData).eq('id', id);
    const { data: updatedRows, error } = type === '수입'
      ? await updateQuery.neq('source', 'budget_one_click').select('id')
      : await updateQuery.select('id');
    if (error) throw error;
    if (!updatedRows || updatedRows.length === 0) throw new Error('수정할 수 없는 거래입니다.');
    
    return transaction;
  } catch (error) {
    console.error('API Error (updateTransaction):', error);
    throw error;
  }
};

export const getDashboard = async (): Promise<DashboardData> => {
  if (USE_MOCK) {
    // 기존 모크 리턴
    return {}; 
  }

  try {
    // We need month, so let's fetch raw tables directly or use getTransactions
    const { data: expenses, error: expError } = await supabase.from('expenses').select('*');
    if (expError) throw expError;

    const { data: incomes, error: incError } = await supabase.from('incomes').select('*');
    if (incError) throw incError;
    
    const all = [
      ...(expenses || []).map(e => ({ ...e, type: '지출' })),
      ...(incomes || []).map(i => ({ ...i, type: '수입' }))
    ];

    const dashboard: DashboardData = {};

    all.forEach(t => {
      // Use DB month or fallback to parsed date month
      let month = t.month ? t.month.toString() : '';
      if (!month && t.date) {
        month = parseInt(t.date.split('-')[1]).toString();
      }
      if (!month) return; // skip if no month

      // Helper function to update a specific month key in dashboard
      const updateDashboardForMonth = (mKey: string) => {
        if (!dashboard[mKey]) dashboard[mKey] = {};

        if (!dashboard[mKey][t.category]) {
          dashboard[mKey][t.category] = {
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            items: []
          };
        }

        const catData = dashboard[mKey][t.category];
        const subCatName = t.subCategory || t.subCategory || '기타';
        let subItem = catData.items.find(item => item.name === subCatName);
        if (!subItem) {
          subItem = { name: subCatName, income: 0, expense: 0, balance: 0 };
          catData.items.push(subItem);
        }

        if (t.type === '수입') {
          catData.totalIncome += t.amount;
          subItem.income += t.amount;
        } else {
          catData.totalExpense += t.amount;
          subItem.expense += t.amount;
        }

        catData.balance = catData.totalIncome - catData.totalExpense;
        subItem.balance = subItem.income - subItem.expense;
      };

      updateDashboardForMonth(month);
      updateDashboardForMonth('all'); // Add cumulative balance
    });

    return dashboard;
  } catch (error) {
    console.error('API Error (getDashboard):', error);
    throw error;
  }
};
