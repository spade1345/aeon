import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({
  title,
  right,
  children,
  className,
}: {
  title?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-2xl border border-slate-800 bg-slate-900/70 p-4', className)}>
      {(title || right) && (
        <header className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</h3>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 1,
  step = 0.01,
  format,
  hint,
  color = '#a78bfa',
  compact,
  inline,
  className,
}: {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  hint?: string;
  color?: string;
  compact?: boolean;
  inline?: boolean;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const display = format ? format(value) : `${Math.round(value * 100)}%`;
  if (inline) {
    return (
      <label className={cn('flex items-center gap-2 whitespace-nowrap text-xs', className)}>
        <span className="shrink-0 font-medium text-slate-300">{label}</span>
        <input
          type="range"
          className="range w-16 sm:w-20"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          style={{ '--p': `${pct}%`, '--c': color } as CSSProperties}
          aria-label={typeof label === 'string' ? label : undefined}
        />
        <span className="shrink-0 tabular-nums text-[11px] text-slate-400">{display}</span>
      </label>
    );
  }
  return (
    <label className={cn('block', className)}>
      <div className={cn('flex items-baseline justify-between text-xs', compact ? 'mb-0' : 'mb-0.5')}>
        <span className="font-medium text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-400">{display}</span>
      </div>
      <input
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ '--p': `${pct}%`, '--c': color } as CSSProperties}
        aria-label={typeof label === 'string' ? label : undefined}
      />
      {hint && <div className="text-[11px] leading-snug text-slate-500">{hint}</div>}
    </label>
  );
}

export function Select<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <label className={cn('block', className)}>
      {label && <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>}
      <select
        className="field w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-violet-400"
        value={value}
        onChange={(e) => {
          const raw = e.target.value;
          const found = options.find((o) => String(o.value) === raw);
          if (found) onChange(found.value);
        }}
      >
        {options.map((o) => (
          <option key={String(o.value)} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  small,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  hint?: string;
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {label && (
        <div className="min-w-0">
          <div className="text-sm font-medium text-slate-200">{label}</div>
          {hint && <div className="text-[11px] leading-snug text-slate-500">{hint}</div>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={typeof label === 'string' ? label : 'toggle'}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-violet-400',
          small ? 'h-5 w-9' : 'h-6 w-11',
          checked ? 'bg-violet-500' : 'bg-slate-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform',
            small ? 'h-4 w-4' : 'h-5 w-5',
            checked && (small ? 'translate-x-4' : 'translate-x-5'),
          )}
        />
      </button>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div>
      {label && <div className="mb-1 text-xs font-medium text-slate-300">{label}</div>}
      <div className="flex flex-wrap gap-1 rounded-xl bg-slate-950 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              'flex-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors',
              value === o.value ? 'bg-violet-500 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function IconButton({
  children,
  onClick,
  label,
  className,
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-700 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-violet-400',
        className,
      )}
    >
      {children}
    </button>
  );
}
