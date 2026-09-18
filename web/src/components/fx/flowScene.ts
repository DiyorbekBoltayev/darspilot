// "Bilim oqimi": zarrachalar masala yechishning 7 bosqichi darvozasidan o'tadi.
// Har bir darvozadan o'tish ehtimoli = sinfning shu bosqichdagi to'g'ri javob foizi.
// O'ta olmagan zarrachalar qizarib pastga to'kiladi — sinf qayerda "yiqilayotgani" ko'rinadi.
import * as THREE from 'three'
import { COLORS, POINT_FRAG, createRenderer, disposeScene, drift, masteryColor, observeSize, reducedMotion, rng, runLoop } from './common'

export const FLOW_HALF_W = 12.2

export function gateX(count: number) {
  return Array.from({ length: count }, (_, i) => -9.2 + i * (18.0 / Math.max(1, count - 1)))
}

interface Particle {
  x: number; y: number; vx: number; vy: number; gate: number; fail: boolean; life: number
  seed: number; alive: boolean; wait: number; c: [number, number, number]
}

export function createFlow(host: HTMLElement, canvas: HTMLCanvasElement, steps: { name: string; pct: number }[]) {
  const rand = rng((Date.now() ^ 0x5bd1e995) >>> 0)
  const renderer = createRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-FLOW_HALF_W, FLOW_HALF_W, 4, -4, -10, 10)
  const G = steps.length
  const gx = gateX(G)
  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: renderer.getPixelRatio() } }

  // darvozalar
  const gatePos: number[] = [], gateCol: number[] = [], gateSeed: number[] = []
  steps.forEach((s, i) => {
    const c = masteryColor(s.pct / 100)
    for (let k = 0; k < 140; k++) {
      const a = (k / 140) * Math.PI * 2
      gatePos.push(gx[i] + Math.cos(a) * 0.32, Math.sin(a) * 1.9, 0)
      gateCol.push(c.r, c.g, c.b)
      gateSeed.push(rand() * 10)
    }
  })
  const gateGeo = new THREE.BufferGeometry()
  gateGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(gatePos), 3))
  gateGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(gateCol), 3))
  gateGeo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(gateSeed), 1))
  scene.add(new THREE.Points(gateGeo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uTime; uniform float uPixelRatio; attribute vec3 aColor; attribute float aSeed; varying vec3 vColor; varying float vA;
      void main(){ vColor = aColor; vA = 0.55 + 0.45 * (0.5 + 0.5 * sin(uTime * 2.0 + aSeed * 6.0 + position.y * 2.0));
        gl_PointSize = 3.6 * uPixelRatio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: POINT_FRAG,
  })))

  // oxiridagi "o'zlashtirildi" yadrosi
  const orbGeo = new THREE.BufferGeometry()
  orbGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([10.2, 0, 0]), 3))
  scene.add(new THREE.Points(orbGeo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uTime; uniform float uPixelRatio; void main(){ gl_PointSize = (70.0 + 10.0 * sin(uTime * 1.7)) * uPixelRatio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `void main(){ float d = length(gl_PointCoord - 0.5); float core = smoothstep(0.2, 0.17, d); float halo = smoothstep(0.5, 0.2, d) * 0.28; float a = max(core, halo); if (a < 0.01) discard; gl_FragColor = vec4(0.039, 0.541, 0.569, a); }`,
  })))

  // oqim zarrachalari
  const N = 1100
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const alpha = new Float32Array(N)
  const P: Particle[] = []
  for (let i = 0; i < N; i++) {
    P.push({ x: 0, y: 0, vx: 0, vy: 0, gate: 0, fail: false, life: 0, seed: rand() * 100, alive: false, wait: rand() * 6, c: [COLORS.indigoLight.r, COLORS.indigoLight.g, COLORS.indigoLight.b] })
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1))
  scene.add(new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uPixelRatio; attribute vec3 aColor; attribute float aAlpha; varying vec3 vColor; varying float vA;
      void main(){ vColor = aColor; vA = aAlpha; gl_PointSize = 4.6 * uPixelRatio; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: POINT_FRAG,
  })))

  const spawn = (p: Particle) => {
    p.x = -11 - rand() * 0.5
    p.y = (rand() - 0.5) * 3.2
    p.vx = 2.4 + rand() * 1.2
    p.vy = 0
    p.gate = 0
    p.fail = false
    p.life = 0
    p.alive = true
    p.c = [COLORS.indigoLight.r, COLORS.indigoLight.g, COLORS.indigoLight.b]
  }

  const stopResize = observeSize(host, (w, h) => {
    renderer.setSize(w, h, false)
    const halfH = Math.max(3.4, FLOW_HALF_W / (w / h))
    camera.top = halfH
    camera.bottom = -halfH
    camera.updateProjectionMatrix()
  })

  const t0 = performance.now() / 1000
  const frame = (now: number, dt: number, draw = true) => {
    const t = now - t0
    uniforms.uTime.value = t
    for (let i = 0; i < N; i++) {
      const p = P[i]
      if (!p.alive) {
        p.wait -= dt
        if (p.wait <= 0) spawn(p)
        alpha[i] = 0
        continue
      }
      p.life += dt
      if (!p.fail) {
        p.vy += drift(t * 0.9 + p.x * 0.3, p.seed) * dt * 1.6 - p.y * dt * 0.9
        p.vy *= 0.96
        if (p.gate < G && p.x >= gx[p.gate]) {
          if (rand() * 100 > steps[p.gate].pct) {
            p.fail = true
            p.vx *= 0.25
            p.vy = 0.6 + rand() * 0.8
            const c = steps[p.gate].pct < 50 ? COLORS.terra : COLORS.oltin
            p.c = [c.r, c.g, c.b]
          } else {
            const k = (p.gate + 1) / G
            const a0 = COLORS.indigoLight, a1 = COLORS.firuza
            p.c = [a0.r + (a1.r - a0.r) * k, a0.g + (a1.g - a0.g) * k, a0.b + (a1.b - a0.b) * k]
          }
          p.gate++
        }
        if (p.x > 10.2) {
          p.vx *= 0.9
          p.y += (0 - p.y) * 0.1
          p.x += (10.2 - p.x) * 0.1
          if (p.life > 12 || Math.abs(p.vx) < 0.05) {
            p.alive = false
            p.wait = rand() * 0.8
          }
        }
        alpha[i] = Math.min(1, p.life * 2)
      } else {
        p.vy -= dt * 4.5
        alpha[i] = Math.max(0, alpha[i] - dt * 0.7)
        if (alpha[i] <= 0 || p.y < -6) {
          p.alive = false
          p.wait = rand() * 0.8
        }
      }
      p.x += p.vx * dt
      p.y += p.vy * dt
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      col[i * 3] = p.c[0]
      col[i * 3 + 1] = p.c[1]
      col[i * 3 + 2] = p.c[2]
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aColor.needsUpdate = true
    geo.attributes.aAlpha.needsUpdate = true
    if (draw) renderer.render(scene, camera)
  }

  // ochilganda oqim bo'sh ko'rinmasligi uchun 6 soniyalik holat oldindan hisoblanadi
  const WARM = 6
  for (let k = 0; k < WARM * 30; k++) frame(t0 + k / 30, 1 / 30, false)
  frame(t0 + WARM, 1 / 30)
  const stopLoop = reducedMotion() ? () => {} : runLoop(host, (now, dt) => frame(now + WARM, dt))

  return () => {
    stopLoop()
    stopResize()
    disposeScene(scene, renderer)
  }
}
