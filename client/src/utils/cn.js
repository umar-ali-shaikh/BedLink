import { clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Custom type scale (tailwind.config.js) must be registered, or tailwind-merge treats
// `text-display` as a colour and drops it next to `text-primary`.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: ['display', 'h1', 'h2', 'h3', 'body', 'small', 'caption', 'number-lg', 'number-md'] }],
    },
  },
});

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
