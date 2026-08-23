import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Copy, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { getBudgets } from '../services/api';
import { Budget } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';

// 기본 색상 팔레트
const COLORS = ['#f43f5e', '#fcd34d', '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899', '#14b8a6'];

interface GroupedBudget {
  category: string;
  bank: string;
  account: string;
  totalAmount: number;
  items: Budget[];
  color: string;
}

export default function BudgetPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [lockedIndex, setLockedIndex] = useState(-1); // 클릭으로 고정된 인덱스

  useEffect(() => {
    const fetchBudgets = async () => {
      try {
        const data = await getBudgets();
        setBudgets(data);
      } catch (error) {
        console.error('Failed to fetch budgets', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBudgets();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2500);
  };

  const handleCopy = async (e: React.MouseEvent, text: string) => {
    e.stopPropagation(); // 아코디언 토글 방지
    try {
      await navigator.clipboard.writeText(text);
      showToast('계좌번호가 복사되었습니다!');
    } catch (err) {
      console.error('Failed to copy text', err);
      showToast('복사에 실패했습니다.');
    }
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const onPieEnter = (_: any, index: number) => {
    if (lockedIndex === -1) {
      setActiveIndex(index);
    }
  };

  const onPieLeave = () => {
    if (lockedIndex === -1) {
      setActiveIndex(-1);
    }
  };

  const onPieClick = (_: any, index: number, e: any) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setLockedIndex(index);
    setActiveIndex(index);
    
    // 클릭 시 해당 섹션의 토글(아코디언) 자동 열림
    const categoryName = chartData[index]?.name;
    if (categoryName) {
      setExpandedCategories(prev => {
        if (!prev.includes(categoryName)) return [...prev, categoryName];
        return prev;
      });
    }
  };

  const handleBackgroundClick = () => {
    setLockedIndex(-1);
    setActiveIndex(-1);
  };

  // 차트용 데이터 및 아코디언용 그룹화 가공
  // 1. 고정된 8개 카테고리 초기화
  const FIXED_CATEGORIES = ['교통비', '공과금', '생활비', '헌금', '남편 용돈', '아내 용돈', '예비비', '주거비'];
  
  const groupedData: GroupedBudget[] = FIXED_CATEGORIES.map(cat => ({
    category: cat,
    bank: '',
    account: '',
    totalAmount: 0,
    items: [],
    color: ''
  }));
  
  budgets.forEach(curr => {
    const existing = groupedData.find(item => item.category === curr.category);
    if (existing) {
      existing.totalAmount += curr.amount;
      existing.items.push(curr);
      if (curr.bank && !existing.bank) existing.bank = curr.bank;
      if (curr.account && !existing.account) existing.account = curr.account;
    } else {
      // 8개 항목에 속하지 않는 예외 카테고리가 있을 경우 추가 (안전 장치)
      groupedData.push({
        category: curr.category,
        bank: curr.bank,
        account: curr.account,
        totalAmount: curr.amount,
        items: [curr],
        color: '' 
      });
    }
  });

  // 그룹 데이터에 색상 동기화 할당
  groupedData.forEach((group, idx) => {
    group.color = COLORS[idx % COLORS.length];
  });

  // 차트 데이터 구성
  const chartData = groupedData.map(group => ({
    name: group.category,
    value: group.totalAmount,
    color: group.color
  }));

  // 현재 락된 카테고리 이름
  const lockedCategoryName = lockedIndex !== -1 ? chartData[lockedIndex]?.name : null;

  // 탭 클릭 핸들러
  const onCategorySelect = (categoryName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const index = chartData.findIndex(c => c.name === categoryName);
    
    // 차트 인덱스 고정 (Pie 폭발 효과)
    if (index !== -1) {
      setLockedIndex(index);
      setActiveIndex(index);
    }
    
    // 카드 리스트 자동 열림
    setExpandedCategories(prev => {
      if (!prev.includes(categoryName)) return [...prev, categoryName];
      return prev;
    });
  };

  // 락된 항목이 가장 위로 오도록 정렬 (나머지는 원래 8개 배열 순서 유지)
  const sortedGroupedData = [...groupedData].sort((a, b) => {
    if (a.category === lockedCategoryName) return -1;
    if (b.category === lockedCategoryName) return 1;
    return 0;
  });

  // Recharts 사용자 정의 외곽 라벨 (지시선 포함)
  const renderCustomizedLabel = ({ cx, cy, midAngle, outerRadius, name, percent, value }: any) => {
    // 값이 0인 항목은 지시선과 라벨을 렌더링하지 않음
    if (value === 0) return null;
    
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 20;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="#4b5563" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        fontSize={11}
        fontWeight="600"
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  // Hover 시 살짝 튀어나오는 커스텀 Active Shape
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
    if (value === 0) return null;
    
    const isLocked = payload.name === chartData[lockedIndex]?.name;
    
    return (
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + (isLocked ? 12 : 8)}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={isLocked ? { filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))', transition: 'all 0.3s' } : { transition: 'all 0.3s' }}
      />
    );
  };

  if (loading) {
    return <LoadingSpinner text="예산 데이터를 불러오는 중..." />;
  }

  return (
    <div className="pb-20 bg-gray-50/30" onClick={handleBackgroundClick}>
      <header className="sticky top-0 z-40 bg-[#f8f9fa]/90 backdrop-blur-md px-4 pt-8 pb-4 mb-4 border-b border-gray-100/80 shadow-sm flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-text">예산 관리</h1>
        <p className="text-text-light text-sm">항목별 예산 및 계좌 정보</p>
      </header>

      <div className="px-4">

      {/* 차트 영역 (플랫 스타일 Pie Chart) */}
      <div className="bg-white pt-4 pb-2 rounded-2xl shadow-sm border border-gray-50 mb-4 h-64 relative overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              dataKey="value"
              paddingAngle={1}
              label={renderCustomizedLabel}
              labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
              isAnimationActive={true}
              stroke="none"
              onClick={onPieClick}
              {...({
                activeIndex,
                activeShape: renderActiveShape,
                onMouseEnter: onPieEnter,
                onMouseLeave: onPieLeave
              } as any)}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color} 
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 8개 항 탭 (그리드 레이아웃 - 한 화면에 꽉 차게) */}
      <div className="grid grid-cols-4 gap-1.5 pb-2 mb-4">
        {FIXED_CATEGORIES.map(cat => {
          const isSelected = lockedCategoryName === cat;
          const groupItem = groupedData.find(g => g.category === cat);
          const color = groupItem?.color || '#cbd5e1'; 
          return (
            <button
              key={cat}
              onClick={(e) => onCategorySelect(cat, e)}
              className={`px-1 py-1.5 rounded-lg text-[10.5px] font-bold transition-all shadow-sm border whitespace-nowrap overflow-hidden text-ellipsis
                ${isSelected 
                  ? 'text-white shadow-md' 
                  : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                }`}
              style={isSelected ? { backgroundColor: color, borderColor: color } : undefined}
            >
              {cat}
            </button>
          )
        })}
      </div>

      {/* 예산 테이블 리스트 (높이를 대폭 줄인 초슬림 아코디언 형태) */}
      <div className="space-y-2.5">
        {sortedGroupedData.map((group) => {
          const isExpanded = expandedCategories.includes(group.category);
          
          return (
            <div key={group.category} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all">
              {/* 아코디언 헤더 (대분류 '항') - 1줄 배치로 공간 절약 */}
              <div 
                className="px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => toggleCategory(group.category)}
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {/* 색상 태그 */}
                    <span 
                      className="inline-flex items-center justify-center px-2 py-0.5 text-white text-[11px] font-bold rounded-md shrink-0"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.category}
                    </span>
                    
                    {/* 은행/계좌 및 복사 버튼 (텍스트 줄임 적용) */}
                    <div className="flex items-center text-[11px] text-text-light whitespace-nowrap overflow-hidden">
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{group.bank} {group.account}</span>
                      <button
                        onClick={(e) => handleCopy(e, group.account)}
                        className="ml-1 p-1 hover:text-primary transition-colors bg-gray-100 rounded-md flex items-center justify-center shrink-0"
                        aria-label="계좌 복사"
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  </div>
                  
                  {/* 총 예산 합계 및 토글 화살표 */}
                  <div className="flex items-center gap-1.5 text-right shrink-0">
                    <span className="font-bold text-sm text-text">
                      {group.totalAmount.toLocaleString()}원
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={16} className="text-text-light" />
                    ) : (
                      <ChevronDown size={16} className="text-text-light" />
                    )}
                  </div>
                </div>
              </div>

              {/* 아코디언 컨텐츠 (소분류 '목' 리스트) */}
              {isExpanded && (
                <div className="border-t border-gray-50 bg-gray-50/70 px-4 py-3 space-y-2">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <div className="text-text font-medium flex items-center gap-2">
                        <div 
                          className="w-1.5 h-1.5 rounded-full" 
                          style={{ backgroundColor: group.color, opacity: 0.7 }}
                        ></div>
                        {item.subCategory}
                      </div>
                      <div className="text-text-light font-medium">
                        {item.amount.toLocaleString()}원
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 토스트 알림 */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-5 py-2.5 rounded-full text-sm shadow-xl z-50 flex items-center gap-2 transition-opacity duration-300">
          <Check size={16} className="text-green-400" />
          {toastMessage}
        </div>
      )}
      </div>
    </div>
  );
}
