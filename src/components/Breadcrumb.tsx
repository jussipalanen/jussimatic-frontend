interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Current page title — shown as the last (non-clickable) crumb */
  current: string;
  /** Optional subtitle shown below the current page title */
  subtitle?: string;
}

export default function Breadcrumb({ items, current, subtitle }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 flex-wrap">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 shrink-0">
          {item.onClick ? (
            <button
              type="button"
              onClick={item.onClick}
              className="flex items-center gap-1 text-xs text-white/45 hover:text-white/80 transition-colors"
            >
              {i === 0 && (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              )}
              {item.label}
            </button>
          ) : (
            <span className="text-xs text-white/45">{item.label}</span>
          )}
          <svg className="w-3 h-3 text-white/20 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      ))}

      <span className="min-w-0">
        <span className="text-sm font-semibold text-white truncate block">{current}</span>
        {subtitle && <span className="text-xs text-white/40 truncate block">{subtitle}</span>}
      </span>
    </nav>
  );
}
