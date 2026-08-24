export type TransactionType = '지출' | '수입';

export interface Transaction {
  id: string; // 고유 ID (생성 시 발급)
  date: string; // YYYY-MM-DD
  type: TransactionType; // 지출 or 수입
  category: string; // 식비, 교통비, 월급 등
  subCategory?: string; // 세부항목
  memo?: string; // 메모
  content: string; // 상세 내용 (호환성 유지)
  amount: number; // 금액
}

export interface Budget {
  category: string; // 항 (대분류)
  bank: string;     // 은행
  account: string;  // 계좌
  subCategory: string; // 목 (소분류)
  amount: number;   // 예산 금액
}

export interface DashboardItem {
  name: string;
  income: number;
  expense: number;
  balance: number;
}

export interface DashboardCategory {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  items: DashboardItem[];
}

export interface DashboardData {
  [month: string]: {
    [category: string]: DashboardCategory;
  }
}
