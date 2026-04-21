export function uid(): string {
  return 't' + Date.now() + Math.random().toString(36).slice(2, 6);
}
