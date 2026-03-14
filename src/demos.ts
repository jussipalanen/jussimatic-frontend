// Central registry of projects & demos.
// Currently defined as a static array; will be replaced by an API call in a future iteration.

export type DemoLabelKey =
  | 'chatCta'
  | 'jobsCta'
  | 'ecommerceCta'
  | 'aiCvCta'
  | 'resumeBuilderCta'
  | 'invoiceToolCta';

export interface DemoBadge {
  label: string;
  /** Tailwind color + weight classes (e.g. "bg-blue-400/15 text-blue-300 font-semibold").
   *  The shared base classes (inline-flex, rounded-full, px-2, py-0.5, text-xs) are
   *  applied by the rendering component. */
  colorClass: string;
}

export interface Demo {
  id: string;
  path: string;
  /** Key into translations[lang].landing – used until the API provides its own labels. */
  labelKey: DemoLabelKey;
  /** Tailwind text-color class for the icon (e.g. "text-blue-400"). */
  iconColor: string;
  /** SVG <path> `d` attribute, rendered with strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}. */
  iconPath: string;
  badges: DemoBadge[];
}

export const DEMOS: Demo[] = [
  {
    id: 'chat',
    path: '/chat',
    labelKey: 'chatCta',
    iconColor: 'text-blue-400',
    iconPath:
      'M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'Node.js', colorClass: 'bg-green-600/20 text-green-300 font-semibold' },
      { label: 'AI', colorClass: 'bg-amber-400/15 text-amber-300 font-medium' },
    ],
  },
  {
    id: 'browse-jobs',
    path: '/demo/browse-jobs',
    labelKey: 'jobsCta',
    iconColor: 'text-green-400',
    iconPath:
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'JSON', colorClass: 'bg-gray-500/25 text-gray-300 font-semibold' },
      { label: 'API integration', colorClass: 'bg-teal-500/15 text-teal-300 font-medium' },
    ],
  },
  {
    id: 'ecommerce',
    path: '/demo/ecommerce/products',
    labelKey: 'ecommerceCta',
    iconColor: 'text-purple-400',
    iconPath: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'PHP', colorClass: 'bg-indigo-400/15 text-indigo-300 font-semibold' },
      { label: 'Laravel', colorClass: 'bg-red-400/15 text-red-300 font-semibold' },
      { label: 'Blade', colorClass: 'bg-orange-400/15 text-orange-300 font-semibold' },
      { label: 'API integration', colorClass: 'bg-teal-500/15 text-teal-300 font-medium' },
      { label: 'MySQL', colorClass: 'bg-cyan-500/15 text-cyan-300 font-semibold' },
      { label: 'Ecommerce', colorClass: 'bg-green-500/15 text-green-300 font-medium' },
    ],
  },
  {
    id: 'ai-cv-review',
    path: '/demo/ai-cv-review',
    labelKey: 'aiCvCta',
    iconColor: 'text-orange-400',
    iconPath: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'Python', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'AI', colorClass: 'bg-amber-400/15 text-amber-300 font-medium' },
      { label: 'API integration', colorClass: 'bg-teal-500/15 text-teal-300 font-medium' },
    ],
  },
  {
    id: 'resume-tool',
    path: '/demo/resume-tool',
    labelKey: 'resumeBuilderCta',
    iconColor: 'text-teal-400',
    iconPath:
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'PHP', colorClass: 'bg-indigo-400/15 text-indigo-300 font-semibold' },
      { label: 'Laravel', colorClass: 'bg-red-400/15 text-red-300 font-semibold' },
      { label: 'PDF Export', colorClass: 'bg-green-500/15 text-green-300 font-medium' },
    ],
  },
  {
    id: 'invoice-tool',
    path: '/demo/invoice-tool',
    labelKey: 'invoiceToolCta',
    iconColor: 'text-yellow-400',
    iconPath:
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
    badges: [
      { label: 'TypeScript', colorClass: 'bg-blue-400/15 text-blue-300 font-semibold' },
      { label: 'PHP', colorClass: 'bg-indigo-400/15 text-indigo-300 font-semibold' },
      { label: 'Laravel', colorClass: 'bg-red-400/15 text-red-300 font-semibold' },
      { label: 'PDF Export', colorClass: 'bg-yellow-400/15 text-yellow-300 font-medium' },
    ],
  },
];
