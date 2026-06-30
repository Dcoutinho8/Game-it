/**
 * Primitivos de UI no estilo shadcn/ui, adaptados ao Game It.
 *
 * O shadcn/ui original usa Tailwind + Radix. Aqui replicamos a mesma
 * filosofia (componentes pequenos, acessíveis e compostos por variantes)
 * usando React + CSS com tokens (ver styles/ui.css). Assim mantemos a
 * estética shadcn sem reescrever todo o app para Tailwind.
 */
import { forwardRef } from 'react';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

/* ── Button ─────────────────────────────────────────── */
export const Button = forwardRef(function Button(
  { variant = 'default', size = 'default', className, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx('ui-btn', `ui-btn--${variant}`, `ui-btn--${size}`, className)}
      {...props}
    />
  );
});

/* ── Card ───────────────────────────────────────────── */
export function Card({ className, ...props }) {
  return <div className={cx('ui-card', className)} {...props} />;
}
export function CardHeader({ className, ...props }) {
  return <div className={cx('ui-card__header', className)} {...props} />;
}
export function CardTitle({ className, ...props }) {
  return <h3 className={cx('ui-card__title', className)} {...props} />;
}
export function CardDescription({ className, ...props }) {
  return <p className={cx('ui-card__desc', className)} {...props} />;
}
export function CardContent({ className, ...props }) {
  return <div className={cx('ui-card__content', className)} {...props} />;
}
export function CardFooter({ className, ...props }) {
  return <div className={cx('ui-card__footer', className)} {...props} />;
}

/* ── Badge ──────────────────────────────────────────── */
export function Badge({ variant = 'secondary', className, ...props }) {
  return <span className={cx('ui-badge', `ui-badge--${variant}`, className)} {...props} />;
}

/* ── Avatar ─────────────────────────────────────────── */
export function Avatar({ src, alt = '', fallback = '/static/img/Game It Logo.svg', size = 44, className }) {
  return (
    <img
      className={cx('ui-avatar', className)}
      src={src || fallback}
      alt={alt}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      onError={(e) => { e.target.onerror = null; e.target.src = fallback; }}
    />
  );
}

/* ── Input ──────────────────────────────────────────── */
export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cx('ui-input', className)} {...props} />;
});

/* ── Tabs (controlado) ──────────────────────────────── */
export function Tabs({ value, onValueChange, items, className }) {
  return (
    <div className={cx('ui-tabs', className)} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          className={cx('ui-tabs__trigger', value === it.value && 'is-active')}
          onClick={() => onValueChange(it.value)}
        >
          {it.icon && <i className={it.icon} />}
          {it.label}
          {typeof it.count === 'number' && <span className="ui-tabs__count">{it.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Skeleton ───────────────────────────────────────── */
export function Skeleton({ className, style }) {
  return <div className={cx('ui-skeleton', className)} style={style} />;
}

/* ── Separator ──────────────────────────────────────── */
export function Separator({ className }) {
  return <div className={cx('ui-separator', className)} />;
}

/* ── Label / Textarea / Select ──────────────────────── */
export function Label({ className, ...props }) {
  return <label className={cx('ui-label', className)} {...props} />;
}
export const Textarea = forwardRef(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cx('ui-input ui-textarea', className)} {...props} />;
});
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cx('ui-input ui-select', className)} {...props}>
      {children}
    </select>
  );
});

/* ── SearchInput (padrão único de busca) ────────────── */
export const SearchInput = forwardRef(function SearchInput(
  { className, value, onChange, onClear, ...props },
  ref
) {
  return (
    <div className={cx('ui-search', className)}>
      <i className="fa-solid fa-magnifying-glass ui-search__icon" />
      <input ref={ref} className="ui-input ui-search__input" value={value} onChange={onChange} {...props} />
      {value && (
        <button type="button" className="ui-search__clear" onClick={onClear} aria-label="Limpar busca">
          <i className="fa-solid fa-xmark" />
        </button>
      )}
    </div>
  );
});

/* ── Dialog (modal padrão, acessível) ───────────────── */
export function Dialog({ open = true, onClose, title, description, children, footer, size = 'md', className }) {
  if (!open) return null;
  return (
    <div className="ui-dialog__overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}>
      <div className={cx('ui-dialog', `ui-dialog--${size}`, className)} role="dialog" aria-modal="true">
        <div className="ui-dialog__header">
          <div className="ui-dialog__heading">
            {title && <h3 className="ui-dialog__title">{title}</h3>}
            {description && <p className="ui-dialog__desc">{description}</p>}
          </div>
          <button className="ui-dialog__close" onClick={onClose} aria-label="Fechar">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
        <div className="ui-dialog__body cscroll">{children}</div>
        {footer && <div className="ui-dialog__footer">{footer}</div>}
      </div>
    </div>
  );
}
