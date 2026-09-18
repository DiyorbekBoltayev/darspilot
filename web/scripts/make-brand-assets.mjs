// Brend assetlari: Xiva majolikasidagi sakkiz qirrali yulduz (xotam) naqshi va logotip.
// Ishga tushirish: node scripts/make-brand-assets.mjs
import { writeFileSync } from 'node:fs'

const f = (n) => n.toFixed(2)

export function starPoints(cx, cy, R) {
  const r = R * Math.cos(Math.PI / 4) / Math.cos(Math.PI / 8)
  const pts = []
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2
    const rad = i % 2 === 0 ? R : r
    pts.push(`${f(cx + Math.cos(a) * rad)},${f(cy + Math.sin(a) * rad)}`)
  }
  return pts.join(' ')
}

function octagon(cx, cy, R) {
  const pts = []
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 + Math.PI / 8
    pts.push(`${f(cx + Math.cos(a) * R)},${f(cy + Math.sin(a) * R)}`)
  }
  return pts.join(' ')
}

function tile(stroke, opacity) {
  const T = 64
  const corners = [[0, 0], [T, 0], [0, T], [T, T]]
    .map(([x, y]) => `<polygon points="${starPoints(x, y, 8)}"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${T}" viewBox="0 0 ${T} ${T}">
<g fill="none" stroke="${stroke}" stroke-opacity="${opacity}" stroke-width="1.1" stroke-linejoin="round">
<polygon points="${starPoints(32, 32, 24)}"/><polygon points="${octagon(32, 32, 9)}"/>${corners}
</g></svg>`
}

writeFileSync('public/girih-light.svg', tile('#0A8A91', 0.55))
writeFileSync('public/girih-dark.svg', tile('#FFFFFF', 0.5))

const logo = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
<rect width="64" height="64" rx="16" fill="#23328C"/>
<polygon points="${starPoints(32, 32, 23)}" fill="#12A7AE"/>
<circle cx="32" cy="32" r="9.5" fill="#FFFFFF"/>
<circle cx="32" cy="32" r="4" fill="#23328C"/>
</svg>`
writeFileSync('public/favicon.svg', logo)
console.log('ok')
