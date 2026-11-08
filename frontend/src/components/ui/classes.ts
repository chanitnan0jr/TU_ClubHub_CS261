// Shared class names for controls that a ui component does not always render,
// such as a router Link styled as a button or a plain <select>.

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-tu-maroon text-white hover:bg-tu-maroon-800 disabled:bg-slate-200 disabled:text-slate-500',
  secondary:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:border-slate-200 disabled:bg-white disabled:text-slate-500',
  ghost: 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 disabled:bg-transparent disabled:text-slate-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-slate-200 disabled:text-slate-500',
};

const buttonSizes: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 py-2',
  icon: 'size-11',
};

export function buttonClass(variant: ButtonVariant = 'secondary', size: ButtonSize = 'md') {
  return `inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed ${buttonSizes[size]} ${buttonVariants[variant]}`;
}

/** Text input, select and textarea styling; `invalid` adds the error border. */
export function inputClass(invalid = false) {
  return `block min-h-11 w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-slate-900 transition-colors placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-tu-maroon/25 disabled:cursor-not-allowed disabled:bg-slate-100 ${
    invalid ? 'border-red-600 focus:border-red-600' : 'border-slate-300 focus:border-tu-maroon'
  }`;
}
