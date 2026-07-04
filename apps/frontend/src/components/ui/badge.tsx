import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-[var(--primary)] text-[var(--background)]',
        secondary: 'border-transparent bg-[var(--card)] text-[var(--foreground)]',
        destructive: 'border-transparent bg-[var(--destructive)] text-[var(--background)]',
        outline: 'border-[var(--border)] text-[var(--foreground)]',
        success: 'border-transparent bg-[var(--accent)] text-[var(--background)]',
        warning: 'border-transparent bg-[var(--warning)] text-[var(--background)]',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
