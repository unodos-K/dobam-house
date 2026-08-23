interface InputPageProps {
  type?: 'income' | 'expense';
}

export default function InputPage({ type }: InputPageProps) {
  const title = type === 'income' ? '수입 입력' : type === 'expense' ? '지출 입력' : '내역 입력';
  
  return (
    <div className="p-4 pt-8 pb-20">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        <p className="text-text-light text-sm mt-1">새로운 {title}을 기록하세요</p>
      </header>
      
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[300px] text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <span className="text-2xl">✍️</span>
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">입력 폼 준비 중</h2>
        <p className="text-sm text-gray-500 max-w-[200px] leading-relaxed">
          구글 시트(GAS 웹앱)로 데이터를 전송하는 깔끔한 입력 폼이 이곳에 들어올 예정입니다.
        </p>
      </div>
    </div>
  );
}
