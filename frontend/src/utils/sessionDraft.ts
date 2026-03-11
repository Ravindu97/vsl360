export function loadSessionDraft<T>(key: string): Partial<T> | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<T>;
  } catch {
    return null;
  }
}

export function saveSessionDraft<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;

  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota and serialization failures for draft persistence.
  }
}

export function clearSessionDraft(key: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key);
}
