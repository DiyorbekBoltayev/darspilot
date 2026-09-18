// three.js'siz yordamchilar: asosiy bundle'ga WebGL kutubxonasini tortib kirmaslik uchun alohida.
export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}
