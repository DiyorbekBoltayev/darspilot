// Umumiy WebGL yordamchilari: renderer, ko'rinmayotganda pauza, tasodifiy sonlar, GLSL shovqin.
import * as THREE from 'three'

export { reducedMotion, webglAvailable } from './support'

export function createRenderer(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.setClearColor(0x000000, 0)
  return renderer
}

// Har yuklanishda boshqacha, lekin bitta sahna ichida barqaror tasodifiy sonlar (mulberry32).
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Irratsional chastotali sinuslar yig'indisi — harakat hech qachon aynan takrorlanmaydi.
export function drift(t: number, phase: number) {
  return Math.sin(t * 0.61 + phase) * 0.5 + Math.sin(t * 1.137 + phase * 1.7) * 0.3 + Math.sin(t * 0.271 + phase * 2.3) * 0.2
}

/** Animatsiya sikli: element ekrandan chiqsa yoki tab yashirilsa to'xtaydi. Tozalash funksiyasini qaytaradi. */
export function runLoop(element: Element, frame: (now: number, dt: number) => void) {
  let visible = true
  let raf = 0
  let last = performance.now()
  let stopped = false
  const tick = (now: number) => {
    raf = 0
    if (stopped || !visible || document.hidden) return
    const dt = Math.min((now - last) / 1000, 0.05)
    last = now
    frame(now / 1000, dt)
    raf = requestAnimationFrame(tick)
  }
  const resume = () => {
    if (!raf && !stopped && visible && !document.hidden) {
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  }
  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting
    resume()
  })
  io.observe(element)
  document.addEventListener('visibilitychange', resume)
  raf = requestAnimationFrame(tick)
  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    io.disconnect()
    document.removeEventListener('visibilitychange', resume)
  }
}

export function observeSize(element: HTMLElement, onResize: (w: number, h: number) => void) {
  const ro = new ResizeObserver(() => {
    const w = element.clientWidth
    const h = element.clientHeight
    if (w && h) onResize(w, h)
  })
  ro.observe(element)
  if (element.clientWidth && element.clientHeight) onResize(element.clientWidth, element.clientHeight)
  return () => ro.disconnect()
}

export function disposeScene(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
  scene.traverse((obj) => {
    const o = obj as THREE.Mesh
    o.geometry?.dispose()
    const mat = o.material as THREE.Material | THREE.Material[] | undefined
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else mat?.dispose()
  })
  renderer.dispose()
}

export const COLORS = {
  firuza: new THREE.Color('#0A8A91'),
  firuzaLight: new THREE.Color('#74C0C3'),
  indigo: new THREE.Color('#23328C'),
  indigoLight: new THREE.Color('#8E99D2'),
  terra: new THREE.Color('#C4572E'),
  oltin: new THREE.Color('#D9A21B'),
  line: new THREE.Color('#CBD8DA'),
}

export function masteryColor(v: number) {
  if (v < 0.5) return COLORS.terra
  if (v < 0.75) return COLORS.oltin
  return COLORS.firuza
}

/** Oq fon ustida ishlaydigan yumshoq nuqta (normal blending). */
export const POINT_FRAG = /* glsl */ `
  varying vec3 vColor; varying float vA;
  void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.36, d) * vA; if (a < 0.01) discard; gl_FragColor = vec4(vColor, a); }`
