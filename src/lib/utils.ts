/**
 * Utility functions for CorperWe
 */

/**
 * Ensures name has the prefix "Corper" without duplicating if the corper already typed it.
 */
export function formatCorperName(rawName: string): string {
  if (!rawName) return 'Corper';
  const trimmed = rawName.trim();
  // Check if string starts with "corper" followed by space or end
  const corperRegex = /^corper\b\s*/i;
  if (corperRegex.test(trimmed)) {
    const after = trimmed.replace(corperRegex, '').trim();
    if (!after) return 'Corper';
    return `Corper ${after}`;
  }
  return `Corper ${trimmed}`;
}

/**
 * Generate slug from name + 4 random characters (e.g. ada-x7k2)
 */
export function generateSlug(name: string): string {
  // Strip leading "corper" if user typed it, to keep slug clean like "ada-x7k2"
  let cleanName = name.trim().replace(/^corper\b\s*/i, '').trim();
  cleanName = cleanName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 15);

  if (!cleanName) {
    cleanName = 'corper';
  }

  // 4 random characters (alphanumeric, lowercase)
  const chars = '23456789abcdefghjkmnpqrstuvwxyz';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return `${cleanName}-${rand}`;
}

/**
 * Build shareable link URL
 */
export function getShareUrl(slug: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/pop/${slug}`;
  }
  return `/pop/${slug}`;
}

/**
 * Visitor cooldown rate limiter (30 seconds client-side per browser)
 */
const COOLDOWN_SECONDS = 30;

export function checkVisitorCooldown(slug: string): { allowed: boolean; remainingSecs: number } {
  if (typeof window === 'undefined') return { allowed: true, remainingSecs: 0 };
  try {
    const key = `corperwe_cooldown_${slug}`;
    const lastSent = localStorage.getItem(key);
    if (!lastSent) return { allowed: true, remainingSecs: 0 };
    const elapsedMs = Date.now() - parseInt(lastSent, 10);
    const elapsedSecs = Math.floor(elapsedMs / 1000);
    if (elapsedSecs < COOLDOWN_SECONDS) {
      return { allowed: false, remainingSecs: COOLDOWN_SECONDS - elapsedSecs };
    }
    return { allowed: true, remainingSecs: 0 };
  } catch {
    return { allowed: true, remainingSecs: 0 };
  }
}

export function recordVisitorSend(slug: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `corperwe_cooldown_${slug}`;
    localStorage.setItem(key, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Format timestamp into friendly relative time
 */
export function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return 'Just now';
  let date: Date;
  if (timestamp.toDate) {
    date = timestamp.toDate();
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    return 'Recently';
  }

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 30) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
