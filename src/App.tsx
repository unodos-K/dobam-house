import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import BudgetPage from './pages/BudgetPage';
import HistoryPage from './pages/HistoryPage';
import IncomePage from './pages/IncomePage';
import ExpensePage from './pages/ExpensePage';
import AuthPage from './pages/AuthPage';

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
        <Routes>
          <Route path="/" element={<Navigate to="/history" replace />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/budget" element={<BudgetPage />} />
          <Route path="/input-income" element={<IncomePage />} />
          <Route path="/input-expense" element={<ExpensePage />} />
          {/* 알 수 없는 경로는 기본 화면으로 리다이렉트 */}
          <Route path="*" element={<Navigate to="/history" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </Router>
  );
}

export default App;
