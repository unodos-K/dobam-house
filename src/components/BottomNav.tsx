import { Link, useLocation } from 'react-router-dom';
import { Home, PieChart, List, PlusCircle } from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();

  const navItems = [
    { name: '홈', path: '/', icon: Home },
    { name: '예산', path: '/budget', icon: PieChart },
    { name: '내역', path: '/history', icon: List },
    { name: '입력', path: '/input', icon: PlusCircle },
  ];

  return (
    <nav className="fixed bottom-0 w-full max-w-[480px] bg-white border-t border-gray-100 pb-safe z-50">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-text-light hover:text-text'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
