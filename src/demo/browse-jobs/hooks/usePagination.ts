import { useState } from 'react';

interface UsePaginationReturn {
  currentPage: number;
  getTotalPages: (itemsLength: number) => number;
  paginatedItems: <T>(items: T[]) => T[];
  handlePageChange: (page: number, totalPages: number) => void;
  getPageNumbers: (totalPages: number) => number[];
  resetPage: () => void;
}

export function usePagination(itemsPerPage: number = 5): UsePaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedItems = <T>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };

  const getTotalPages = (itemsLength: number): number => {
    return Math.ceil(itemsLength / itemsPerPage);
  };

  const handlePageChange = (page: number, totalPages: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const getPageNumbers = (totalPages: number): number[] => {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  const resetPage = () => {
    setCurrentPage(1);
  };

  return {
    currentPage,
    getTotalPages,
    paginatedItems,
    handlePageChange,
    getPageNumbers,
    resetPage,
  };
}
