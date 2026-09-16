/**
 * @file Primitivos UI compartidos: StatCard, EmptyState, Badge, ActionButton.
 */
import type { ReactElement, ReactNode, MouseEvent as ReactMouseEvent } from 'react';
import { Loader2, TrendingUp } from 'lucide-react';

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  /** String/número ya formateado, o un nodo (ej. `<AnimatedNumber>`) para el conteo animado. */
  value: ReactNode;
  icon?: ReactNode;
  color?: string; // clases de color del icono/acento (ej. 'bg-primary-600')
  note?: string;
  trend?: string;
  trendUp?: boolean;
}

/** Tarjeta de métrica compacta (label, valor grande, icono en color, variación opcional). */
export function StatCard({ label, value, icon, color = 'bg-primary-600', note, trend, trendUp }: StatCardProps): ReactElement {
  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm p-5 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5">
      <div className={`absolute top-0 left-0 right-0 h-1 ${color}`} />
      <div className="flex items-start justify-between gap-3">
        {icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-md shrink-0 ${color}`}>
            {icon}
          </div>
        )}
        {trend && (
          <span className={`text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            <TrendingUp size={12} className={trendUp ? '' : 'rotate-180'} /> {trend}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-2xl font-black text-slate-900 tracking-tight truncate">{value}</h3>
      <p className="text-xs font-bold text-slate-500 mt-0.5">{label}</p>
      {note && <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{note}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// EmptyState
// ---------------------------------------------------------------------------

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

/** Estado vacío consistente (icono + título + descripción + acción opcional). */
export function EmptyState({ icon, title, description, action }: EmptyStateProps): ReactElement {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
      {icon && <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">{icon}</div>}
      <h3 className="text-lg font-bold text-slate-700">{title}</h3>
      {description && <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Badge
// ---------------------------------------------------------------------------

type BadgeTone = 'green' | 'orange' | 'red' | 'slate' | 'amber' | 'primary';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
}

const TONE_CLASSES: Record<BadgeTone, string> = {
  green: 'bg-green-50 text-green-700 border-green-200',
  orange: 'bg-orange-50 text-orange-600 border-orange-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  slate: 'bg-slate-100 text-slate-500 border-slate-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  primary: 'bg-primary-50 text-primary-700 border-primary-200',
};

/** Chip/badge de estado con color semántico. */
export function Badge({ children, tone = 'slate' }: BadgeProps): ReactElement {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs border ${TONE_CLASSES[tone]}`}>
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// ActionButton
// ---------------------------------------------------------------------------

type ActionButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ActionButtonProps {
  children: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  variant?: ActionButtonVariant;
  className?: string;
}

const VARIANT_CLASSES: Record<ActionButtonVariant, string> = {
  primary: 'bg-primary-600 text-white hover:bg-primary-700 shadow-md',
  secondary: 'bg-slate-100 text-slate-600 hover:bg-slate-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md',
  ghost: 'bg-transparent text-slate-600 hover:bg-slate-100 border border-slate-200',
};

/** Botón de acción con variantes y estado de carga. */
export function ActionButton({
  children,
  onClick,
  type = 'button',
  disabled,
  loading,
  variant = 'primary',
  className = '',
}: ActionButtonProps): ReactElement {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  );
}
