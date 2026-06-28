import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-sky-500 text-white hover:bg-sky-400 focus-visible:ring-sky-400',
  secondary:
    'border border-slate-700 bg-slate-800 text-slate-200 hover:border-slate-600 hover:bg-slate-700 focus-visible:ring-slate-500',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        'inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950',
        variantStyles[variant],
        className,
      )}
      {...props}
    />
  ),
);

Button.displayName = 'Button';

export { Button };
