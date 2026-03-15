interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    /** Page numbers to render. Use -1 as a sentinel value for an ellipsis separator. */
    pageNumbers: number[];
    previousLabel?: string;
    nextLabel?: string;
}

export function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    pageNumbers,
    previousLabel = 'Previous page',
    nextLabel = 'Next page',
}: PaginationProps) {
    if (totalPages <= 1) return null;

    return (
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {currentPage > 1 && (
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    className="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
                    aria-label={previousLabel}
                >
                    «
                </button>
            )}

            {pageNumbers.map((page, index) => {
                if (page === -1) {
                    return (
                        <span key={`ellipsis-${index}`} className="px-2 text-sm text-gray-500">
                            ...
                        </span>
                    );
                }

                return (
                    <button
                        key={page}
                        onClick={() => onPageChange(page)}
                        className={
                            page === currentPage
                                ? 'rounded-lg bg-blue-600 px-3 py-1 text-sm font-semibold text-white'
                                : 'rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800'
                        }
                    >
                        {page}
                    </button>
                );
            })}

            {currentPage < totalPages && (
                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    className="rounded-lg border border-gray-700 px-3 py-1 text-sm text-gray-200 hover:bg-gray-800"
                    aria-label={nextLabel}
                >
                    »
                </button>
            )}
        </div>
    );
}
