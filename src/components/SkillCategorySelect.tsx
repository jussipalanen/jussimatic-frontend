import { useEffect, useRef, useState } from 'react';
import type { ExportOption } from '../api/resumesApi';

interface Props {
  value: string;
  onChange: (value: string) => void;
  options: ExportOption[];
  label: string;
  placeholder?: string;
  inputCls: string;
  labelCls: string;
}

export default function SkillCategorySelect({ value, onChange, options, label, placeholder, inputCls, labelCls }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync display text when value changes externally
  const selectedLabel = options.find(o => o.value === value)?.label ?? value;
  const [inputText, setInputText] = useState(selectedLabel);
  const [prevValue, setPrevValue] = useState(value);
  const [prevOptions, setPrevOptions] = useState(options);

  if (prevValue !== value || prevOptions !== options) {
    setPrevValue(value);
    setPrevOptions(options);
    setInputText(selectedLabel);
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
        // Revert input to current selected label if user typed something unrecognised
        setInputText(options.find(o => o.value === value)?.label ?? value);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, value, options]);

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  function select(opt: ExportOption) {
    onChange(opt.value);
    setInputText(opt.label);
    setQuery('');
    setOpen(false);
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setInputText(e.target.value);
    setQuery(e.target.value);
    setOpen(true);
  }

  function handleFocus() {
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className={labelCls}>{label}</label>
      <div className="relative">
        <input
          type="text"
          value={inputText}
          onChange={handleInput}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={inputCls}
          autoComplete="off"
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
          onClick={() => setOpen(o => !o)}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {open && filtered.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-lg border border-gray-600 bg-gray-800 shadow-xl max-h-56 overflow-y-auto">
          {filtered.map(opt => (
            <li
              key={opt.value}
              onMouseDown={() => select(opt)}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-600/40 ${opt.value === value ? 'bg-blue-600/20 text-white' : 'text-white/80'}`}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
