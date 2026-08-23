import { useStore } from '../store/useStore';

const Home = () => {
  const { balance } = useStore();

  return (
    <div className="p-4 pt-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text">도밤가계부</h1>
        <p className="text-text-light text-sm mt-1">이번 달 남은 예산</p>
        <div className="text-4xl font-extrabold text-primary mt-2">
          {balance.toLocaleString()}원
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <h2 className="text-sm font-medium text-text-light">총 수입</h2>
          <p className="text-lg font-bold text-text mt-1">0원</p>
        </div>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
          <h2 className="text-sm font-medium text-text-light">총 지출</h2>
          <p className="text-lg font-bold text-text mt-1">0원</p>
        </div>
      </div>
      
      <div className="mt-8 bg-white rounded-2xl p-4 shadow-sm border border-gray-50">
        <h2 className="text-lg font-bold text-text mb-4">최근 내역</h2>
        <div className="text-center text-text-light py-8 text-sm">
          아직 내역이 없습니다.
        </div>
      </div>
    </div>
  );
};

export default Home;
