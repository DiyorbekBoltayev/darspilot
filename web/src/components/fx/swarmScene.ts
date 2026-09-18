// "AI ishlayapti" sahnasi: server javobini kutayotganda zarrachalar
// tumanlik → javob chizig'i (skaner nuri bilan o'qiladi) → 7 bosqichli tashxis zanjiri → 8 bosqichli dars shakllariga o'tadi.
// Bo'yalgan doirachalar va tashxis natijalari har siklda tasodifiy — animatsiya takrorlanmaydi.
import * as THREE from 'three'
import { COLORS, createRenderer, disposeScene, drift, observeSize, rng } from './common'

export type SwarmKind = 'create' | 'scan' | 'demo' | 'grade' | 'lesson' | 'report' | 'homework'

type Pt = [number, number, number[]]

export function createSwarm(host: HTMLElement, canvas: HTMLCanvasElement, kind: SwarmKind) {
  const rand = rng((Date.now() * 2654435761) >>> 0)
  const renderer = createRenderer(canvas)
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-12, 12, 7, -7, -10, 10)
  const N = 2600
  const pos = new Float32Array(N * 3)
  const target = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const targetCol = new Float32Array(N * 3)
  const size = new Float32Array(N)
  const phase = new Float32Array(N)
  for (let i = 0; i < N; i++) {
    pos.set([(rand() - 0.5) * 30, (rand() - 0.5) * 18, 0], i * 3)
    col.set([0.56, 0.6, 0.82], i * 3)
    size[i] = 2.6 + rand() * 2.8
    phase[i] = rand() * 100
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1))
  const uniforms = { uPixelRatio: { value: renderer.getPixelRatio() }, uScale: { value: 1 } }
  const points = new THREE.Points(geo, new THREE.ShaderMaterial({
    uniforms, transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    vertexShader: `uniform float uPixelRatio; uniform float uScale; attribute vec3 aColor; attribute float aSize; varying vec3 vColor;
      void main(){ vColor = aColor; gl_PointSize = aSize * uPixelRatio * uScale; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `varying vec3 vColor; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.38, d); if (a < 0.01) discard; gl_FragColor = vec4(vColor, a); }`,
  }))
  scene.add(points)

  // skaner nuri
  const beamMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uA: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `uniform float uA; varying vec2 vUv; void main(){ float a = smoothstep(0.5, 0.0, abs(vUv.x - 0.5)) * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.85, vUv.y) * uA * 0.55; gl_FragColor = vec4(0.85, 0.64, 0.11, a); }`,
  })
  const beam = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 16), beamMat)
  scene.add(beam)

  const DIM = [0.8, 0.88, 0.89]
  let filled: [number, number, number][] = []
  let chainNodes: [number, number, number[]][] = []
  let lessonBlocks: [number, number, number[]][] = []

  const assign = (pts: Pt[]) => {
    for (let i = 0; i < N; i++) {
      let x: number, y: number, c: number[]
      if (i < pts.length) [x, y, c] = pts[i]
      else {
        x = (rand() - 0.5) * 28
        y = (rand() - 0.5) * 16
        c = DIM
      }
      target.set([x, y, 0], i * 3)
      targetCol.set(c, i * 3)
    }
  }
  const ring = (out: Pt[], cx: number, cy: number, r: number, count: number, c: number[]) => {
    for (let k = 0; k < count; k++) {
      const a = (k / count) * Math.PI * 2 + rand() * 0.05
      out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, c])
    }
  }
  const disk = (out: Pt[], cx: number, cy: number, r: number, count: number, c: number[]) => {
    for (let k = 0; k < count; k++) {
      const a = rand() * Math.PI * 2, rr = Math.sqrt(rand()) * r
      out.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, c])
    }
  }
  const square = (out: Pt[], cx: number, cy: number, s: number, c: number[]) => {
    for (let k = 0; k < 60; k++) out.push([cx + (rand() - 0.5) * s, cy + (rand() - 0.5) * s, c])
  }

  const shapeSwarm = () => {
    const pts: Pt[] = []
    for (let i = 0; i < 1800; i++) {
      const a = rand() * Math.PI * 2, r = 2 + Math.pow(rand(), 0.6) * 6
      pts.push([Math.cos(a) * r * 1.4, Math.sin(a) * r * 0.8, rand() > 0.5 ? [0.04, 0.54, 0.57] : [0.14, 0.2, 0.55]])
    }
    return pts
  }

  const shapeStrip = () => {
    const pts: Pt[] = []
    filled = []
    const INK = [0.56, 0.6, 0.82]
    ;[[-10, 5.3], [10, 5.3], [10, -5.3], [-10, -5.3]].forEach(([x, y]) => square(pts, x, y, 1.1, [0.14, 0.2, 0.55]))
    for (let q = 0; q < 6; q++) {
      const pick = Math.floor(rand() * 4)
      for (let l = 0; l < 4; l++) {
        const cx = -7.5 + l * 1.7, cy = 3.8 - q * 1.5
        ring(pts, cx, cy, 0.55, 22, INK)
        if (l === pick) {
          const s = pts.length
          disk(pts, cx, cy, 0.42, 26, INK)
          filled.push([s, pts.length, cx])
        }
      }
    }
    for (let c = 0; c < 4; c++) {
      const pick = Math.floor(rand() * 11)
      for (let r = 0; r < 11; r++) {
        const cx = 2.2 + c * 1.6, cy = 4.4 - r * 0.9
        ring(pts, cx, cy, 0.3, 12, INK)
        if (r === pick && (c < 2 || rand() > 0.4)) {
          const s = pts.length
          disk(pts, cx, cy, 0.22, 14, INK)
          filled.push([s, pts.length, cx])
        }
      }
    }
    return pts
  }

  const shapeChain = () => {
    const pts: Pt[] = []
    chainNodes = []
    for (let k = 0; k < 7; k++) {
      const cx = -9 + k * 3, cy = Math.sin(k * 0.9 + rand()) * 1.2
      const ok = rand() > 0.28
      const s = pts.length
      ring(pts, cx, cy, 1.0, 70, [0.56, 0.6, 0.82])
      disk(pts, cx, cy, 0.55, 60, [0.56, 0.6, 0.82])
      const c = ok ? COLORS.firuza : COLORS.terra
      chainNodes.push([s, pts.length, [c.r, c.g, c.b]])
      if (k < 6) {
        const nx = -9 + (k + 1) * 3
        for (let j = 0; j < 30; j++) {
          const t = rand()
          pts.push([cx + 1.0 + t * (nx - cx - 2.0), cy + (rand() - 0.5) * 0.12, [0.72, 0.78, 0.86]])
        }
      }
    }
    return pts
  }

  // 45 daqiqalik dars: 8 bosqich uzunligi vaqtiga mos bloklar
  const shapeLesson = () => {
    const pts: Pt[] = []
    lessonBlocks = []
    const minutes = [2, 5, 3, 4, 12, 9, 8, 2]
    const palette = [COLORS.firuza, COLORS.indigo, COLORS.oltin, COLORS.terra, COLORS.firuzaLight]
    let x = -10.5
    minutes.forEach((m) => {
      const w = (m / 45) * 21 - 0.2
      const h = 1.4 + rand() * 2.6
      const s = pts.length
      const count = Math.round(40 + m * 22)
      for (let k = 0; k < count; k++) pts.push([x + rand() * w, -2.5 + rand() * h, [0.78, 0.82, 0.9]])
      const c = palette[Math.floor(rand() * palette.length)]
      lessonBlocks.push([s, pts.length, [c.r, c.g, c.b]])
      x += w + 0.2
    })
    for (let k = 0; k < 160; k++) pts.push([-10.5 + rand() * 21, -3.1 + (rand() - 0.5) * 0.08, [0.14, 0.2, 0.55]])
    return pts
  }

  const second = kind === 'lesson' ? { name: 'lesson', dur: 3.2, build: shapeLesson } : { name: 'strip', dur: 3.2, build: shapeStrip }
  const phases = [
    { name: 'swarm', dur: 1.3, build: shapeSwarm },
    second,
    { name: 'chain', dur: 2.8, build: shapeChain },
  ]
  let pi = -1, phaseStart = 0
  const nextPhase = (t: number) => {
    pi = (pi + 1) % phases.length
    phaseStart = t
    assign(phases[pi].build())
  }

  const stopResize = observeSize(host, (w, h) => {
    renderer.setSize(w, h, false)
    const aspect = w / h
    const viewH = Math.max(14, 26 / aspect)
    camera.left = (-viewH * aspect) / 2
    camera.right = (viewH * aspect) / 2
    camera.top = viewH / 2
    camera.bottom = -viewH / 2
    camera.updateProjectionMatrix()
    uniforms.uScale.value = Math.min(1.6, Math.max(0.8, h / 700))
  })

  const t0 = performance.now() / 1000
  nextPhase(0)
  let raf = 0
  const tick = () => {
    const t = performance.now() / 1000 - t0
    const p = phases[pi]
    const local = t - phaseStart
    if (local > p.dur) nextPhase(t)

    const beamX = -11 + (local / p.dur) * 23
    beam.visible = p.name === 'strip' || p.name === 'lesson'
    beam.position.x = beamX
    beamMat.uniforms.uA.value = beam.visible ? Math.min(1, local * 2) : 0

    if (p.name === 'strip') {
      for (const [s, e, cx] of filled) if (beamX > cx) for (let i = s; i < e; i++) targetCol.set([0.04, 0.54, 0.57], i * 3)
    } else if (p.name === 'lesson') {
      lessonBlocks.forEach(([s, e, c]) => {
        if (beamX > target[s * 3]) for (let i = s; i < e; i++) targetCol.set(c, i * 3)
      })
    } else if (p.name === 'chain') {
      chainNodes.forEach(([s, e, c], k) => {
        if (local > 0.35 + k * 0.3) for (let i = s; i < e; i++) targetCol.set(c, i * 3)
      })
    }

    const k = (1 - Math.pow(0.02, 1 / 60)) * 3.2
    for (let i = 0; i < N; i++) {
      const i3 = i * 3
      const jx = drift(t * 1.3, phase[i]) * 0.06, jy = drift(t * 1.1, phase[i] + 5) * 0.06
      pos[i3] += (target[i3] + jx - pos[i3]) * k
      pos[i3 + 1] += (target[i3 + 1] + jy - pos[i3 + 1]) * k
      col[i3] += (targetCol[i3] - col[i3]) * 0.08
      col[i3 + 1] += (targetCol[i3 + 1] - col[i3 + 1]) * 0.08
      col[i3 + 2] += (targetCol[i3 + 2] - col[i3 + 2]) * 0.08
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aColor.needsUpdate = true
    points.rotation.z = Math.sin(t * 0.2) * 0.02
    renderer.render(scene, camera)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    cancelAnimationFrame(raf)
    stopResize()
    disposeScene(scene, renderer)
  }
}
