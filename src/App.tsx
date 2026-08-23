import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import BudgetPage from './pages/BudgetPage';
import HistoryPage from './pages/HistoryPage';
import InputPage from './pages/InputPage';
import AuthPage from './pages/AuthPage';

const Header = () => {
  const location = useLocation();
  const getTitle = () => {
    switch (location.pathname) {
      case '/history': return '내역';
      case '/budget': return '예산';
      case '/input-income': return '수입 입력';
      case '/input-expense': return '지출 입력';
      default: return '도밤가계부';
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-center h-14 shadow-sm">
      <h1 className="text-[16px] font-bold text-gray-800">{getTitle()}</h1>
    </header>
  );
};
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = localStorage.getItem('isAuthenticated');
    if (auth === 'true') {
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  if (loading) return null;

  // 인증 전이면 AuthPage만 보여줌
  if (!isAuthenticated) {
    return <AuthPage onLogin={() => setIsAuthenticated(true)} />;
  }

  // 인증 완료 후 메인 앱 렌더링
  return (
    <Router>
      <div className="pb-16 min-h-[100dvh] bg-gray-50/30">
        <Header />
        <Routes>
          <Route path="/" element={<Navigate to="/history" replace />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/input-income" element={<InputPage type="income" />} />
          <Route path="/input-expense" element={<InputPage type="expense" />} />
          {/* 알 수 없는 경로는 기본 화면으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/history" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  );
}

export default App;
