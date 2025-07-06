/**
 * Class Name Utility
 * 
 * Utility function for combining class names with proper Tailwind CSS merging.
 * Uses clsx for conditional classes and tailwind-merge for deduplication.
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combine class names with proper Tailwind CSS merging
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
} 