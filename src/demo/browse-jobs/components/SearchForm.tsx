interface SearchFormProps {
  searchQuery: string;
  selectedCategory: string;
  categories: string[];
  onSearchChange: (query: string) => void;
  onCategoryChange: (category: string) => void;
  onClearSearch: () => void;
  translations: {
    category: string;
    allCategories: string;
    searchPlaceholder: string;
    searchButton: string;
    clear: string;
  };
}

export function SearchForm({
  searchQuery,
  selectedCategory,
  categories,
  onSearchChange,
  onCategoryChange,
  onClearSearch,
  translations,
}: SearchFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtering is handled automatically by parent component
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      {/* Category filter */}
      <div className="mb-3">
        <label htmlFor="category" className="block text-sm font-medium mb-2">
          {translations.category}
        </label>
        <select
          id="category"
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        >
          <option value="">{translations.allCategories}</option>
          {categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </div>

      {/* Search input */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder={translations.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="grow bg-gray-800 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-lg"
        >
          {translations.searchButton}
        </button>
        {(searchQuery || selectedCategory) && (
          <button
            type="button"
            onClick={onClearSearch}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg"
          >
            {translations.clear}
          </button>
        )}
      </div>
    </form>
  );
}
