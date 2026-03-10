interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  getPageNumbers: () => number[];
  translations: {
    previousPage: string;
    nextPage: string;
  };
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  getPageNumbers,
  translations,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-2 mt-6">
      {/* Previous Button */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        aria-label={translations.previousPage}
      >
        ←
      </button>

      {/* Page Numbers */}
      {getPageNumbers().map((page, index) => {
        if (page === -1) {
          return (
            <span key={`ellipsis-${index}`} className="px-2 text-gray-500">
              ...
            </span>
          );
        }
        
        return (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded transition-colors ${
              currentPage === page
                ? 'bg-blue-600 text-white font-bold'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
            }`}
          >
            {page}
          </button>
        );
      })}

      {/* Next Button */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed rounded transition-colors"
        aria-label={translations.nextPage}
      >
        →
      </button>
    </div>
  );
}
