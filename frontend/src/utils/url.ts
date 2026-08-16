/**
 * Sanea y valida URLs externas para prevenir inyecciones y ataques de DOM XSS (como 'javascript:...').
 * Solo permite URLs que tengan un esquema válido 'http:' o 'https:'.
 * Si la URL no es válida o es peligrosa, devuelve null.
 */
export function sanitizeExternalUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
  } catch {
    // Fallback: comprobación estricta de prefijo para URLs relativas o malformadas
    if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
      return trimmed;
    }
    return null;
  }

  return null;
}
