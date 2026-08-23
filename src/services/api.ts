import { Transaction, Budget, DashboardData } from '../types';

// GAS 웹 앱 배포 URL (배포 후 .env 파일에 설정)
const GAS_URL = import.meta.env.VITE_GAS_WEB_APP_URL;
// 환경 변수로 Mock 사용 여부 강제 제어 가능
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true' || !GAS_URL;

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

// 예산 Mock 데이터
const mockBudgets: Budget[] = [
  { category: '고정지출', bank: '신한은행', account: '110-123-456789', subCategory: '관리비', amount: 150000 },
  { category: '고정지출', bank: '신한은행', account: '110-123-456789', subCategory: '통신비', amount: 100000 },
  { category: '변동지출', bank: '국민은행', account: '942302-01-123456', subCategory: '식비', amount: 600000 },
  { category: '변동지출', bank: '국민은행', account: '942302-01-123456', subCategory: '교통비', amount: 120000 },
  { category: '도밤이', bank: '카카오뱅크', account: '3333-01-1234567', subCategory: '사료/간식', amount: 80000 },
  { category: '도밤이', bank: '카카오뱅크', account: '3333-01-1234567', subCategory: '병원비', amount: 50000 },
];

export const getBudgets = async (): Promise<Budget[]> => {
  if (USE_MOCK) {
    console.log('[API Mock] getBudgets 호출됨');
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockBudgets;
  }

  try {
    const response = await fetch(`${GAS_URL}?action=getBudgets`);
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data as Budget[];
    } else {
      throw new Error(result.message || 'Failed to fetch budgets');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getTransactions = async (): Promise<Transaction[]> => {
  if (USE_MOCK) {
    console.log('[API Mock] getTransactions 호출됨');
    // 실제 통신처럼 약간의 지연 추가
    await new Promise(resolve => setTimeout(resolve, 500));
    return getMockData();
  }

  try {
    const response = await fetch(`${GAS_URL}?action=getTransactions`);
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data as Transaction[];
    } else {
      throw new Error(result.message || 'Failed to fetch transactions');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<Transaction> => {
  const newTransaction: Transaction = {
    ...transaction,
    id: Date.now().toString(), // 임시 고유 ID 발급
  };

  if (USE_MOCK) {
    console.log('[API Mock] addTransaction 호출됨', newTransaction);
    await new Promise(resolve => setTimeout(resolve, 500));
    const data = getMockData();
    data.push(newTransaction);
    saveMockData(data);
    return newTransaction;
  }

  try {
    const response = await fetch(GAS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8', 
        // 주의: GAS CORS 이슈 방지를 위해 보통 text/plain을 씁니다.
      },
      body: JSON.stringify({
        action: 'addTransaction',
        data: newTransaction
      }),
    });
    
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.status === 'success') {
      return newTransaction;
    } else {
      throw new Error(result.message || 'Failed to add transaction');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const getDashboard = async (): Promise<DashboardData> => {
  if (USE_MOCK) {
    console.log('[API Mock] getDashboard 호출됨');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 임시 모크 데이터
    const mockDashboard: DashboardData = {
      "1": {
        "교통비": {
          totalIncome: 100000,
          totalExpense: 85000,
          balance: 15000,
          items: [
            { name: "대중교통", income: 50000, expense: 40000, balance: 10000 },
            { name: "유류비", income: 50000, expense: 45000, balance: 5000 }
          ]
        },
        "생활비": {
          totalIncome: 500000,
          totalExpense: 520000,
          balance: -20000,
          items: [
            { name: "식비", income: 300000, expense: 350000, balance: -50000 },
            { name: "고양이", income: 200000, expense: 170000, balance: 30000 }
          ]
        },
        "예비비": {
          totalIncome: 200000,
          totalExpense: 0,
          balance: 200000,
          items: [
            { name: "경조사비", income: 100000, expense: 0, balance: 100000 },
            { name: "병원비", income: 100000, expense: 0, balance: 100000 }
          ]
        }
      },
      "2": {
        "교통비": {
          totalIncome: 120000,
          totalExpense: 90000,
          balance: 30000,
          items: [
            { name: "대중교통", income: 60000, expense: 40000, balance: 20000 },
            { name: "유류비", income: 60000, expense: 50000, balance: 10000 }
          ]
        }
      }
    };
    return mockDashboard;
  }

  try {
    const response = await fetch(`${GAS_URL}?action=getDashboard`);
    if (!response.ok) throw new Error('Network response was not ok');
    const result = await response.json();
    if (result.status === 'success') {
      return result.data as DashboardData;
    } else {
      throw new Error(result.message || 'Failed to fetch dashboard data');
    }
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
