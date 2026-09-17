import { Budget } from '../types';

export const getSubOptionsByCategory = (budgets: Budget[], category: string): string[] => {
  const options = budgets.filter(budget => budget.category === category).map(budget => budget.subCategory);
  if (category === '생활비' && !options.includes('생활비 기타')) options.push('생활비 기타');
  if (category === '교통비' && !options.includes('교통비 기타')) options.push('교통비 기타');
  if (category === '예비비' && !options.includes('기타예비비')) options.push('기타예비비');
  return Array.from(new Set(options));
};

export const getDefaultSubCategory = (budgets: Budget[], category: string): string =>
  getSubOptionsByCategory(budgets, category)[0] ?? '';
