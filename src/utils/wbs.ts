export function getWbs(mIdx: number, tIdx?: number, sIdx?: number): string {
  if (tIdx === undefined) return String(mIdx + 1);
  if (sIdx === undefined) return `${mIdx + 1}.${tIdx + 1}`;
  return `${mIdx + 1}.${tIdx + 1}.${sIdx + 1}`;
}
