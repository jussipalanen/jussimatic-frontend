# Browse Jobs Feature

A feature-based module for browsing job listings from the Vantaa API.

## 📂 Structure

```
src/demo/browse-jobs/
├── BrowseJobsView.tsx          # Main view component
├── index.ts                     # Feature exports
├── api/
│   └── jobsApi.ts              # API client for Vantaa jobs
├── components/
│   ├── Header.tsx              # Page header with language selector
│   ├── Footer.tsx              # Page footer with social links
│   ├── SearchForm.tsx          # Search and filter form
│   ├── JobList.tsx             # Job list container
│   ├── JobCard.tsx             # Individual job card
│   └── Pagination.tsx          # Pagination controls
├── hooks/
│   ├── useJobsData.ts          # Fetch jobs and categories
│   ├── useJobsFilter.ts        # Filter jobs by search/category
│   └── usePagination.ts        # Pagination logic
└── types/
    └── index.ts                # TypeScript interfaces
```

## 🎯 Features

- **Search**: Filter jobs by title or organization
- **Category Filter**: Browse jobs by professional field (ammattiala)
- **Pagination**: Navigate through results with 5 items per page
- **Internationalization**: English and Finnish language support
- **Responsive Design**: Mobile-friendly UI with Tailwind CSS

## 🔧 Usage

### Importing the Feature

```typescript
import BrowseJobsView from './demo/browse-jobs';
// or
import { BrowseJobsView } from './demo/browse-jobs';
```

### Route Configuration

```typescript
<Route path="/demo/browse-jobs" element={<BrowseJobsView />} />
```

## 🧩 Components

### BrowseJobsView
Main container component that orchestrates all functionality.

### Header
- Title display
- Language selector (English/Finnish)
- Back navigation button

### SearchForm
- Category dropdown
- Search input
- Clear filters button

### JobList
- Loading state
- Error state
- Empty state
- Renders JobCard components

### JobCard
- Job title
- Organization name (truncated if > 100 words)
- Professional field (ammattiala)
- Application deadline
- Apply button (opens in new tab)

### Pagination
- Previous/Next buttons
- Page number buttons
- Ellipsis for skipped pages
- Smooth scroll to top on page change

## 🪝 Custom Hooks

### useJobsData
Fetches jobs and categories from the Vantaa API on mount.

**Returns:**
- `jobs`: Array of job objects
- `categories`: Array of unique category names
- `loading`: Loading state boolean
- `error`: Error message string or null

### useJobsFilter
Filters jobs based on search query and selected category.

**Returns:**
- `filteredJobs`: Filtered job array
- `searchQuery`: Current search string
- `selectedCategory`: Selected category name
- `setSearchQuery`: Update search query
- `setSelectedCategory`: Update category
- `handleClearSearch`: Reset all filters

### usePagination
Manages pagination state and calculations.

**Parameters:**
- `itemsPerPage`: Number of items per page (default: 5)

**Returns:**
- `currentPage`: Current page number
- `getTotalPages`: Calculate total pages for item count
- `paginatedItems`: Get current page items
- `handlePageChange`: Navigate to specific page
- `getPageNumbers`: Get page numbers to display
- `resetPage`: Reset to page 1

## 🔌 API

### Vantaa Jobs API

**Base URL:** `https://gis.vantaa.fi/rest/tyopaikat/v1`

**Endpoints:**
- `GET /kaikki` - Fetch all jobs
- `GET /` - Fetch all jobs (used for categories)

**Response Format:**
```typescript
interface VantaaJob {
  id: number;
  organisaatio: string;
  ammattiala: string;
  tyotehtava: string;
  tyoavain: string;
  osoite: string;
  haku_paattyy_pvm: string;
  x: number;
  y: number;
  linkki: string;
}
```

## 🎨 Styling

Uses Tailwind CSS with dark theme:
- Background: `bg-gray-900`
- Cards: `bg-gray-800`
- Accents: `blue-600`, `green-600`
- Hover states: Lighter shade variants

## 🌐 Internationalization

Language detection and storage handled by `src/i18n.ts`.

**Translation Keys:**
- `jobs.title`
- `jobs.back`
- `jobs.category`
- `jobs.allCategories`
- `jobs.searchPlaceholder`
- `jobs.searchButton`
- `jobs.clear`
- `jobs.loading`
- `jobs.errorLoading`
- `jobs.empty`
- `jobs.organization`
- `jobs.deadline`
- `jobs.apply`
- `jobs.previousPage`
- `jobs.nextPage`

## 🧪 Testing

Build validation:
```bash
npm run build
```

Development server:
```bash
npm run dev
```

## 📝 Migration Notes

This feature replaces the old `JobsView.tsx` and `api/jobsApi.ts` files with a modular, feature-based structure. The route has been changed from `/jobs` to `/demo/browse-jobs`.

### Breaking Changes
- Route changed: `/jobs` → `/demo/browse-jobs`
- Import path changed: `import JobsView from './JobsView'` → `import BrowseJobsView from './demo/browse-jobs'`

### Benefits
- **Better organization**: Separate concerns into logical modules
- **Reusability**: Components and hooks can be imported individually
- **Maintainability**: Easier to locate and update specific functionality
- **Testability**: Smaller, focused units for testing
- **Scalability**: Add new features without bloating main component
