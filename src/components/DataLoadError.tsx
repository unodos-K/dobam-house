interface DataLoadErrorProps {
  onRetry: () => void;
  isRetrying?: boolean;
}

export default function DataLoadError({ onRetry, isRetrying = false }: DataLoadErrorProps) {
  return (
    <div
      role="alert"
      className="mx-4 flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-red-100 bg-white px-6 py-10 text-center shadow-sm"
    >
      <p className="text-base font-bold text-gray-800">데이터를 불러오지 못했습니다.</p>
      <p className="mt-2 text-sm text-gray-500">잠시 후 다시 시도해 주세요.</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={isRetrying}
        className="mt-5 rounded-xl bg-gray-800 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
        aria-label="데이터 다시 시도"
      >
        다시 시도
      </button>
    </div>
  );
}
