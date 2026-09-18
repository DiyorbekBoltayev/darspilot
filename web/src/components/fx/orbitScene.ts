// "Sinf galaktikasi": markazda o'qituvchi — yulduz, o'quvchilar uning atrofida sfera bo'ylab aylanadi.
// Qatlam (sfera radiusi) = oxirgi e'tibordan beri o'tgan darslar (bugun · 1–2 · 3–N−1 · N+), rang = o'zlashtirish.
// Harakat vaqtga asoslangan easing bilan: kadr tezligi o'zgarsa ham silliq qoladi.
import * as THREE from 'three'
import { COLORS, createRenderer, disposeScene, masteryColor, observeSize, reducedMotion, runLoop } from './common'

export interface OrbitStudent {
  id: number
  name: string
  code: string
  level: string
  avg: number
  gap: number
}

export interface OrbitHandles {
  canvas: HTMLCanvasElement
  tip: HTMLElement
  labels: HTMLElement[]
  onHover: (index: number) => void
  onSelect: (index: number) => void
}

// Sfera qatlamlari radiusi
export const RING_RADII = [2.15, 3.35, 4.55, 5.8]
const SPHERE_R = 0.3

export function ringOf(gap: number, alert: number) {
  if (gap === 0) return 0
  if (gap <= 2) return 1
  return gap < alert ? 2 : 3
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeOutCubic = (x: number) => 1 - Math.pow(1 - x, 3)
const easeOutBack = (x: number) => {
  const c1 = 1.2, c3 = c1 + 1
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2)
}
const damp = (current: number, target: number, lambda: number, dt: number) => current + (target - current) * (1 - Math.exp(-lambda * dt))

function starShape(R: number) {
  const r = (R * Math.cos(Math.PI / 4)) / Math.cos(Math.PI / 8)
  const shape = new THREE.Shape()
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8
    const rad = i % 2 === 0 ? R : r
    const x = Math.cos(a) * rad, y = Math.sin(a) * rad
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

/** Fibonachchi sferasi: nuqtalar sfera yuzasiga teng taqsimlanadi (klasterlanmaydi). */
function spherePoint(i: number, n: number, offset: number) {
  const k = i + 0.5
  const cos = 1 - (2 * k) / n
  const theta = Math.acos(Math.max(-1, Math.min(1, cos)))
  const phi = Math.PI * (1 + Math.sqrt(5)) * k + offset
  return new THREE.Vector3(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi))
}

function glowTexture(r: number, g: number, b: number, softness = 0.42) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, `rgba(${r},${g},${b},0.95)`)
  grd.addColorStop(softness, `rgba(${r},${g},${b},0.32)`)
  grd.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grd
  ctx.fillRect(0, 0, 128, 128)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function createOrbit(host: HTMLElement, students: OrbitStudent[], gapAlert: number, h: OrbitHandles) {
  const renderer = createRenderer(h.canvas)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  const still = reducedMotion()

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd6ecec, 2.0))
  const sun = new THREE.DirectionalLight(0xffffff, 1.7)
  sun.position.set(-6, 9, 8)
  scene.add(sun)
  const rim = new THREE.DirectionalLight(0xbfe3e6, 0.7)
  rim.position.set(7, -5, -6)
  scene.add(rim)

  // ---------------- galaktika: hamma narsa shu guruh ichida aylanadi
  const galaxy = new THREE.Group()
  scene.add(galaxy)

  // qatlam orbitalari: har sferaga ikkita ingichka halqa, turli qiyalikda
  const ringGeos: THREE.BufferGeometry[] = []
  RING_RADII.forEach((r, i) => {
    const color = i === 3 ? '#E3A184' : '#A9D9DA'
    const opacity = i === 3 ? 0.5 : 0.36
    const geo = new THREE.TorusGeometry(r, 0.008 + i * 0.0015, 6, 200)
    ringGeos.push(geo)
    const tilts: [number, number][] = [[Math.PI / 2, 0], [Math.PI / 2 - 0.5 - i * 0.12, 0.7 + i * 0.5]]
    tilts.forEach(([rx, ry], k) => {
      const ring = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: k ? opacity * 0.55 : opacity, depthWrite: false }))
      ring.rotation.set(rx, ry, 0)
      galaxy.add(ring)
    })
  })

  // ---------------- markaz: o'qituvchi yulduzi
  const core = new THREE.Group()
  galaxy.add(core)
  const starGeo = new THREE.ExtrudeGeometry(starShape(0.82), { depth: 0.3, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 3 })
  starGeo.center()
  const starMat = new THREE.MeshStandardMaterial({ color: COLORS.indigo, roughness: 0.34, metalness: 0.08 })
  const star = new THREE.Mesh(starGeo, starMat)
  core.add(star)
  const coreGlowTex = glowTexture(10, 138, 145)
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: coreGlowTex, transparent: true, opacity: 0.6, depthWrite: false }))
  coreGlow.scale.setScalar(4.2)
  core.add(coreGlow)

  // ---------------- fon changlari (galaktika hissi uchun)
  const dustCount = 240
  const dustPos = new Float32Array(dustCount * 3)
  for (let i = 0; i < dustCount; i++) {
    const v = spherePoint(i, dustCount, 1.7).multiplyScalar(6.8 + (i % 7) * 0.5)
    dustPos.set([v.x, v.y * 0.75, v.z], i * 3)
  }
  const dustGeo = new THREE.BufferGeometry()
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3))
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#7FC3C6', size: 0.06, transparent: true, opacity: 0.45, sizeAttenuation: true, depthWrite: false }))
  galaxy.add(dust)

  // ---------------- o'quvchilar
  const sphereGeo = new THREE.SphereGeometry(SPHERE_R, 40, 28)
  const hitGeo = new THREE.SphereGeometry(SPHERE_R * 1.9, 12, 8)
  const hitMat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false })
  const alertGlowTex = glowTexture(196, 87, 46, 0.3)
  const beamGlowTex = glowTexture(10, 138, 145, 0.3)

  const byRing: number[][] = [[], [], [], []]
  students.forEach((s, i) => byRing[ringOf(s.gap, gapAlert)].push(i))

  type Beam = { line: THREE.Mesh; mat: THREE.MeshBasicMaterial; dot: THREE.Sprite; curve: THREE.QuadraticBezierCurve3 }
  type Node = {
    mesh: THREE.Mesh; hit: THREE.Mesh; dir: THREE.Vector3; radius: number; phase: number; delay: number; hover: number
    glow?: THREE.Sprite; beam?: Beam
  }
  const nodes: Node[] = new Array(students.length)
  const hits: THREE.Mesh[] = []
  const beamGeos: THREE.BufferGeometry[] = []

  byRing.forEach((idxs, ring) => {
    const radius = RING_RADII[ring]
    idxs.forEach((si, k) => {
      const s = students[si]
      const dir = spherePoint(k, Math.max(1, idxs.length), ring * 1.31)
      const mesh = new THREE.Mesh(sphereGeo, new THREE.MeshPhysicalMaterial({
        color: masteryColor(s.avg), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.16,
      }))
      const hit = new THREE.Mesh(hitGeo, hitMat)
      hit.userData.index = si
      galaxy.add(mesh, hit)
      const node: Node = { mesh, hit, dir, radius, phase: (si * 2.39996) % (Math.PI * 2), delay: 0.12 + ring * 0.1 + k * 0.025, hover: 0 }

      if (ring === 3) {                       // e'tibordan chetda — terrakota nur
        const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: alertGlowTex, transparent: true, opacity: 0, depthWrite: false }))
        glow.scale.setScalar(1.4)
        galaxy.add(glow)
        node.glow = glow
      }
      if (ring === 0) {                       // bugun ishlangan — markazdan nur
        const end = dir.clone().multiplyScalar(radius)
        const mid = end.clone().multiplyScalar(0.55).add(new THREE.Vector3(0, 0.4, 0))
        const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), mid, end)
        const geo = new THREE.TubeGeometry(curve, 36, 0.016, 6)
        beamGeos.push(geo)
        const mat = new THREE.MeshBasicMaterial({ color: COLORS.firuza, transparent: true, opacity: 0, depthWrite: false })
        const line = new THREE.Mesh(geo, mat)
        const dot = new THREE.Sprite(new THREE.SpriteMaterial({ map: beamGlowTex, transparent: true, opacity: 0, depthWrite: false }))
        dot.scale.setScalar(0.45)
        galaxy.add(line, dot)
        node.beam = { line, mat, dot, curve }
      }
      nodes[si] = node
      hits.push(hit)
    })
  })

  // ---------------- kamera va yorliqlar
  let W = 1, H = 1
  const tmpDir = new THREE.Vector3()
  const project = (v: THREE.Vector3) => {
    const p = v.clone().project(camera)
    return { x: (p.x * 0.5 + 0.5) * W, y: (-p.y * 0.5 + 0.5) * H }
  }
  // Yorliqlar qatlamning ekrandagi chekkasiga qo'yiladi (yuqoridan pastga emas, diagonal bo'ylab yoyiladi)
  const camRight = new THREE.Vector3()
  const camUp = new THREE.Vector3()
  const labelPoint = new THREE.Vector3()
  const LABEL_ANGLES = [0.45, 0.65, 0.85, 1.05]      // radian: tashqi qatlam yuqoriroqda — yorliqlar ustma-ust tushmaydi
  const placeLabels = () => {
    camera.matrixWorld.extractBasis(camRight, camUp, tmpDir)
    h.labels.forEach((el, i) => {
      if (!el) return
      const r = RING_RADII[i] + (i === 3 ? 0.5 : 0.36)
      const a = LABEL_ANGLES[i]
      labelPoint.copy(camRight).multiplyScalar(Math.cos(a) * r).addScaledVector(camUp, Math.sin(a) * r)
      const p = project(labelPoint)
      el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, -50%)`
    })
  }
  const stopResize = observeSize(host, (w, hh) => {
    W = w
    H = hh
    renderer.setSize(w, hh, false)
    const aspect = w / hh
    camera.aspect = aspect
    const tan = Math.tan(THREE.MathUtils.degToRad(15))
    const R = RING_RADII[3] + 0.95
    const dist = Math.max(R / tan, R / (tan * aspect))
    const elev = THREE.MathUtils.degToRad(13)
    camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist)
    camera.lookAt(0, 0, 0)
    camera.updateProjectionMatrix()
    galaxy.updateMatrixWorld()
    placeLabels()
  })

  // ---------------- boshqaruv: sudrab aylantirish
  const pointer = new THREE.Vector2(-10, -10)
  const raycaster = new THREE.Raycaster()
  let hover = -1, dragging = false, lastX = 0, lastY = 0, moved = 0
  let rotY = 0, targetY = 0, rotX = 0.16, targetX = 0.16, spin = still ? 0 : 1, inertia = 0

  const onDown = (e: PointerEvent) => {
    dragging = true
    moved = 0
    lastX = e.clientX
    lastY = e.clientY
    h.canvas.setPointerCapture(e.pointerId)
  }
  const onMove = (e: PointerEvent) => {
    const r = h.canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    if (dragging) {
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      moved += Math.abs(dx) + Math.abs(dy)
      targetY += dx * 0.006
      targetX = Math.max(-0.7, Math.min(0.7, targetX + dy * 0.004))
      inertia = dx * 0.06
    }
  }
  const onUp = () => {
    dragging = false
    if (moved < 6 && hover >= 0) h.onSelect(hover)
  }
  const onLeave = () => pointer.set(-10, -10)
  h.canvas.addEventListener('pointerdown', onDown)
  h.canvas.addEventListener('pointermove', onMove)
  h.canvas.addEventListener('pointerup', onUp)
  h.canvas.addEventListener('pointerleave', onLeave)

  const tmp = new THREE.Vector3()
  const start = performance.now() / 1000
  const frame = (now: number, dt: number) => {
    const t = now - start

    spin = damp(spin, still || hover >= 0 || dragging ? 0 : 1, 3, dt)
    if (!dragging) {
      targetY += (0.075 * spin + inertia) * dt
      inertia = damp(inertia, 0, 2.5, dt)
    }
    rotY = damp(rotY, targetY, 9, dt)
    rotX = damp(rotX, targetX + (still ? 0 : Math.sin(t * 0.21) * 0.05), 6, dt)
    galaxy.rotation.set(rotX, rotY, 0)
    galaxy.updateMatrixWorld()

    // yulduz galaktika bilan ag'darilmaydi: doim yuzi bilan qaraydi va o'z o'qi atrofida sekin aylanadi
    core.quaternion.copy(galaxy.quaternion).invert()
    core.rotateZ(t * 0.22)
    core.scale.setScalar(1 + 0.03 * Math.sin(t * 1.5))
    coreGlow.scale.setScalar(4.2 * (1 + 0.05 * Math.sin(t * 1.5)))
    dust.rotation.y = -t * 0.01

    raycaster.setFromCamera(pointer, camera)
    const hit = t > 0.8 ? raycaster.intersectObjects(hits, false)[0] : undefined
    const idx = hit ? (hit.object.userData.index as number) : -1
    if (idx !== hover) {
      hover = idx
      h.canvas.style.cursor = idx >= 0 ? 'pointer' : 'grab'
      h.onHover(idx)
    }

    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i]
      const p = clamp01((t - n.delay) / 1.1)
      const e = still ? 1 : easeOutBack(p)
      n.hover = damp(n.hover, i === hover ? 1 : 0, 12, dt)
      const bob = still ? 0 : Math.sin(t * 0.9 + n.phase) * 0.09
      tmp.copy(n.dir).multiplyScalar(n.radius * e + bob + n.hover * 0.5)
      n.mesh.position.copy(tmp)
      n.hit.position.copy(tmp)
      n.mesh.scale.setScalar((still ? 1 : easeOutCubic(p)) * (1 + n.hover * 0.42))
      if (n.glow) {
        const f = (t * 0.5 + n.phase / 6.283) % 1
        n.glow.position.copy(tmp)
        n.glow.scale.setScalar(1.25 + f * 1.2)
        n.glow.material.opacity = p >= 1 ? 0.5 * (1 - f) : 0
      }
      if (n.beam) {
        const vis = clamp01((t - n.delay - 0.9) / 0.6)
        n.beam.mat.opacity = 0.36 * vis
        const f = (t * 0.4 + n.phase / 6.283) % 1
        n.beam.curve.getPoint(f, tmp)
        n.beam.dot.position.copy(tmp)
        n.beam.dot.material.opacity = vis * Math.sin(f * Math.PI) * 0.85
      }
    }

    placeLabels()
    if (hover >= 0) {
      nodes[hover].mesh.getWorldPosition(tmp)
      tmp.y += 0.5
      const s = project(tmp)
      h.tip.style.transform = `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px) translate(-50%, -100%)`
      h.tip.style.opacity = '1'
    } else {
      h.tip.style.opacity = '0'
    }
    renderer.render(scene, camera)
  }

  let stopLoop = () => {}
  if (still) frame(start + 3, 0.016)
  stopLoop = runLoop(host, frame)

  return () => {
    stopLoop()
    stopResize()
    h.canvas.removeEventListener('pointerdown', onDown)
    h.canvas.removeEventListener('pointermove', onMove)
    h.canvas.removeEventListener('pointerup', onUp)
    h.canvas.removeEventListener('pointerleave', onLeave)
    coreGlowTex.dispose()
    alertGlowTex.dispose()
    beamGlowTex.dispose()
    ringGeos.forEach((g) => g.dispose())
    beamGeos.forEach((g) => g.dispose())
    starGeo.dispose()
    dustGeo.dispose()
    disposeScene(scene, renderer)
  }
}
