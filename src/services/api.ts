import { supabase } from '../lib/supabase';
import { Transaction, Budget, DashboardData } from '../types';

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
    // 만약 budgets 테이블이 비어있다면 mockBudgets를 기본으로 삽입하고 반환할 수도 있음
    if (!data || data.length === 0) {
       return mockBudgets;
    }
    return data as Budget[];
  } catch (error) {
    console.error('API Error (getBudgets):', error);
    return mockBudgets; // 에러 시 폴백
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
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return allTransactions as unknown as Transaction[];
  } catch (error) {
    console.error('API Error (getTransactions):', error);
    throw error;
  }
};

export const appendIncome = async (dataArray: any[]) => {
  if (USE_MOCK) return;

  try {
    const { error } = await supabase.from('incomes').insert(dataArray);
    if (error) throw error;
  } catch (error) {
    console.error('API Error (appendIncome):', error);
    throw error;
  }
};

export const appendExpense = async (dataArray: any[]) => {
  if (USE_MOCK) return;

  try {
    const { error } = await supabase.from('expenses').insert(dataArray);
    if (error) throw error;
  } catch (error) {
    console.error('API Error (appendExpense):', error);
    throw error;
  }
};

export const deleteTransaction = async (id: string) => {
  if (USE_MOCK) {
    const data = getMockData().filter(t => t.id !== id);
    saveMockData(data);
    return;
  }
  
  try {
    // We don't know if it's income or expense, try both
    const { error: expError } = await supabase.from('expenses').delete().eq('id', id);
    if (expError) throw expError;

    const { error: incError } = await supabase.from('incomes').delete().eq('id', id);
    if (incError) throw incError;
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
    const { id, type, content, ...rest } = transaction; // content is extra for supabase
    const table = type === '지출' ? 'expenses' : 'incomes';
    
    // We update everything except type and content
    const { error } = await supabase.from(table).update(rest).eq('id', id);
    if (error) throw error;
    
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

      if (!dashboard[month]) dashboard[month] = {};

      if (!dashboard[month][t.category]) {
        dashboard[month][t.category] = {
          totalIncome: 0,
          totalExpense: 0,
          balance: 0,
          items: []
        };
      }

      const catData = dashboard[month][t.category];
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
    });

    return dashboard;
  } catch (error) {
    console.error('API Error (getDashboard):', error);
    throw error;
  }
};
