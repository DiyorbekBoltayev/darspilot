/** Sakkiz qirrali yulduz (xotam) koordinatalari — Xiva majolikasidagi naqsh. */
export function starPoints(cx: number, cy: number, R: number) {
  const r = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8)
  return Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8 - Math.PI / 2
    const rad = i % 2 === 0 ? R : r
    return `${(cx + Math.cos(a) * rad).toFixed(2)},${(cy + Math.sin(a) * rad).toFixed(2)}`
  }).join(' ')
}
