/** Dicebear avataaars — consistent per-driver avatar from id or name seed. */
export function getDriverAvatarUrl(seed: string): string {
  const encoded = encodeURIComponent(seed.trim() || "driver");
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encoded}`;
}

export function getDriverInitials(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
  }
  return parts[0]!.slice(0, 2).toUpperCase();
}
