import { useState } from 'react';
import { Lock, Heart } from 'lucide-react';

interface AuthPageProps {
  onLogin: () => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === '2018') {
      localStorage.setItem('isAuthenticated', 'true');
      onLogin();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-pink-50 to-white flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center border border-pink-100">
        <div className="mx-auto w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mb-6 shadow-inner text-pink-500">
          <Heart size={32} fill="currentColor" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-800 mb-2">도밤가계부</h1>
        <p className="text-gray-500 mb-8 font-medium">우리 부부와 고양이의 보금자리</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-3 text-left">
            <label className="block text-sm font-semibold text-gray-700 ml-1">
              우리가 결혼한 연도는? <span className="text-pink-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock size={18} className="text-gray-400" />
              </div>
              <input
                type="tel"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="연도 4자리 입력"
                className={`block w-full pl-11 pr-4 py-3.5 bg-gray-50 border ${
                  error ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-pink-400'
                } rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:border-transparent transition-all`}
                maxLength={4}
                autoFocus
              />
            </div>
            {error && (
              <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-top-1">
                연도가 올바르지 않습니다. 다시 입력해주세요!
              </p>
            )}
          </div>
          
          <button
            type="submit"
            className="w-full bg-gray-900 text-white font-bold py-3.5 px-4 rounded-xl hover:bg-gray-800 active:scale-[0.98] transition-all shadow-md"
          >
            입장하기
          </button>
        </form>
      </div>
    </div>
  );
}
