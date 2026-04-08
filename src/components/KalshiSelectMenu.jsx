import React, { useState, useRef, useEffect, useCallback, useId } from 'react';

/**
 * Custom listbox-style control (better visuals than native `<select>`).
 * @param {{
 *   id?: string,
 *   label: string,
 *   value: string,
 *   options: Array<{ value: string, label: string }>,
 *   onChange: (value: string) => void,
 *   disabled?: boolean,
 *   emptyMessage?: string,
 *   colors: Record<string, string>,
 * }} props
 */
export function KalshiSelectMenu({
  id,
  label,
  value,
  options,
  onChange,
  disabled = false,
  emptyMessage = 'No options',
  colors,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const uid = useId().replace(/:/g, '');
  const listId = `${id || 'kalshi-menu'}-${uid}-listbox`;

  const selected = options.find((o) => o.value === value);
  const display = selected?.label ?? (value ? value : '');

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="relative space-y-2">
      {label && (
        <label
          htmlFor={id}
          className={`block text-[11px] font-bold uppercase tracking-[0.14em] ${colors.textMuted}`}
        >
          {label}
        </label>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`
          group w-full text-left rounded-2xl border ${colors.border} ${colors.surfaceSecondary} ${colors.text}
          px-4 py-3.5 min-h-[3.25rem] flex items-center justify-between gap-3
          shadow-sm shadow-slate-900/[0.04] dark:shadow-none
          transition-all duration-200
          hover:border-blue-400/50 dark:hover:border-blue-500/35
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/45 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-slate-900
          disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:border-inherit
        `}
      >
        <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${display ? colors.text : colors.textMuted}`}>
          {options.length === 0 ? emptyMessage : display || 'Choose…'}
        </span>
        <span
          className={`shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border ${colors.border} ${colors.surface} text-slate-500 dark:text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          tabIndex={-1}
          className={`
            absolute left-0 right-0 top-full z-[60] mt-2 max-h-[min(18rem,55vh)] overflow-auto rounded-2xl border ${colors.border}
            ${colors.surface} py-1.5 shadow-xl shadow-slate-900/10 dark:shadow-black/40 ring-1 ring-slate-900/5 dark:ring-white/10
          `}
        >
          {options.length === 0 ? (
            <li className={`px-4 py-3 text-sm ${colors.textMuted}`}>{emptyMessage}</li>
          ) : (
            options.map((opt) => {
              const active = opt.value === value;
              return (
                <li key={opt.value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(opt.value);
                      close();
                    }}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm font-medium flex items-center justify-between gap-3 transition-colors
                      ${
                        active
                          ? 'bg-blue-600/10 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200'
                          : `${colors.text} hover:bg-slate-100/90 dark:hover:bg-slate-800/80`
                      }
                    `}
                  >
                    <span className="min-w-0 truncate">{opt.label}</span>
                    {active && (
                      <svg className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
