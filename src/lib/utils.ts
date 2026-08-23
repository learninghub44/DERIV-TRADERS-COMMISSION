import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * DERIV TECH - Utility Functions
 *
 * Financial formatting uses Intl.NumberFormat for proper currency display.
 * All monetary values in the database are stored as NUMERIC(18,2) to avoid
 * floating-point precision issues.
 */

/**
 * Format a number as currency.
 * Uses proper decimal formatting for financial display.
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  // Round to 2 decimal places to avoid floating-point display issues
  const rounded = Math.round(amount * 100) / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rounded);
}

/**
 * Format a number with locale-appropriate separators.
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(num));
}

/**
 * Format a number as a percentage.
 */
export function formatPercent(num: number): string {
  return `${(Math.round(num * 100) / 100).toFixed(2)}%`;
}

/**
 * Format a date string to a readable format.
 */
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

/**
 * Format a datetime string to a readable format.
 */
export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

/**
 * Format a relative time string (e.g., "5m ago", "2h ago").
 */
export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(date);
}

/**
 * Convert text to a URL-friendly slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

/**
 * Generate a UUID v4.
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Safely parse a string to a number, returning 0 for invalid values.
 * Used for financial data from the database to prevent NaN propagation.
 */
export function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  if (isNaN(num) || !isFinite(num)) return 0;
  return num;
}

/**
 * Safely parse a string to an integer, returning 0 for invalid values.
 */
export function safeParseInt(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const num = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (isNaN(num)) return 0;
  return num;
}
