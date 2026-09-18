/* Taqdimot rejimi: <fayl>.html?present — brauzerda slayd-slayd, jonli animatsiya bilan.
   PDF yig'ishga ta'sir qilmaydi (build so'rovsiz ochadi). */
(() => {
  if (!location.search.includes('present')) return

  const slides = [...document.querySelectorAll('.slide')]
  if (!slides.length) return
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  document.body.classList.add('presenting')

  // ekran bo'ylab progress va slayd hisoblagichi
  const bar = document.createElement('div')
  bar.className = 'pbar'
  const hud = document.createElement('div')
  hud.className = 'hud'
  document.body.append(bar, hud)

  // har slaydda ketma-ket chiqadigan elementlar (tartib muhim)
  const PICK = '.eyebrow, h1, .lead, .row, .card, .step, .layer, .flow .f, .tl .p, .stage div, table tr, .day .t, .day .e, svg'

  function reveal(slide) {
    const items = [...slide.querySelectorAll(PICK)]
    items.forEach((el, n) => {
      el.classList.remove('rise')
      // qayta ishga tushirish uchun reflow
      void el.offsetWidth
      el.style.setProperty('--d', `${Math.min(n * (reduce ? 0 : 38), 900)}ms`)
      el.classList.add('rise')
    })
    // SVG chiziqlari chizilib chiqadi
    slide.querySelectorAll('svg .line, svg .line-d').forEach((path, n) => {
      const len = path.getTotalLength ? path.getTotalLength() : 0
      if (!len || reduce) return
      path.style.strokeDasharray = len
      path.style.strokeDashoffset = len
      path.style.animation = `draw .5s ${240 + n * 70}ms cubic-bezier(.22,1,.36,1) forwards`
    })
  }

  let i = 0
  function paint(dir = 1) {
    slides.forEach((s, n) => {
      s.classList.toggle('live', n === i)
      s.classList.toggle('past', n < i)
      s.classList.toggle('future', n > i)
    })
    bar.style.transform = `scaleX(${(i + 1) / slides.length})`
    hud.textContent = `${i + 1} / ${slides.length}`
    location.replace(`#${i + 1}`)
    reveal(slides[i])
    void dir
  }

  const go = (to, dir) => {
    const n = Math.max(0, Math.min(slides.length - 1, to))
    if (n === i) return
    i = n
    paint(dir)
  }

  addEventListener('keydown', (e) => {
    const k = e.key
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(i + 1, 1) }
    else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(i - 1, -1) }
    else if (k === 'Home') go(0, -1)
    else if (k === 'End') go(slides.length - 1, 1)
    else if (k.toLowerCase() === 'f') (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())
    else if (k.toLowerCase() === 'r') paint(1)                      // animatsiyani qayta ko'rsatish
  })

  addEventListener('click', (e) => {
    const back = e.clientX < innerWidth * 0.22
    go(i + (back ? -1 : 1), back ? -1 : 1)
  })

  let x0 = null
  addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX }, { passive: true })
  addEventListener('touchend', (e) => {
    if (x0 === null) return
    const dx = e.changedTouches[0].clientX - x0
    if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1)
    x0 = null
  }, { passive: true })

  const fromHash = parseInt(location.hash.slice(1), 10)
  i = Number.isFinite(fromHash) && fromHash > 0 ? Math.min(fromHash - 1, slides.length - 1) : 0
  paint(1)
})()
