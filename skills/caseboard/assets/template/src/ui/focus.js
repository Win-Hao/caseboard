// 右侧黄色便签纸详情面板。
//
// 所有 line-height 都是 --rule-step 的整数倍，文字才落在横线上——
// 这是这个面板唯一不能碰的约束。

import { icons } from './icons.js'
import { strings } from '../core/i18n.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

export function createFocusPanel(root, { locale, onClose, onStep, onNavigate }) {
  const t = strings(locale)
  const el = document.createElement('article')
  el.className = 'kb-detail'
  el.setAttribute('role', 'dialog')
  el.setAttribute('aria-modal', 'false')
  el.tabIndex = -1
  el.hidden = true
  root.appendChild(el)

  el.addEventListener('click', (e) => {
    const back = e.target.closest('[data-role="back"]')
    if (back) { onClose(); return }
    const step = e.target.closest('[data-step]')
    if (step) { onStep(Number(step.dataset.step)); return }
    const jump = e.target.closest('[data-jump]')
    if (jump) onNavigate(jump.dataset.jump)
  })

  function render(node, { index, total, accent, related }) {
    el.style.setProperty('--accent', accent)
    el.style.setProperty('--accent-ink', accent)

    const facts = node.facts.length
      ? `<h2>${t.facts}</h2><ul class="kb-fact-list">${node.facts
          .map((f) => `<li><strong>${esc(f.label)}</strong><span>${esc(f.value)}</span></li>`)
          .join('')}</ul>`
      : ''

    const bullets = node.bullets.length
      ? `<h2>${t.bullets}</h2><ul class="kb-fact-list">${node.bullets
          .map((b) => `<li><span>${esc(b)}</span></li>`).join('')}</ul>`
      : ''

    const media = node.image && node.kind !== 'photo'
      ? `<div class="kb-detail-media"><figure>
           <img src="${esc(node.image)}" alt="${esc(node.imageCaption || node.title)}" loading="lazy">
           ${node.imageCaption ? `<figcaption>${esc(node.imageCaption)}</figcaption>` : ''}
         </figure></div>`
      : ''

    const video = node.video
      ? `<div class="kb-detail-media"><figure>
           <div class="kb-video-screen">
             <iframe src="${esc(node.video)}" title="${esc(node.videoCaption || node.title)}"
                     allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                     allowfullscreen loading="lazy"></iframe>
           </div>
           ${node.videoCaption ? `<figcaption>${esc(node.videoCaption)}</figcaption>` : ''}
         </figure></div>`
      : ''

    const sources = node.sources.length
      ? `<section class="kb-detail-sources"><h2>${t.sources}</h2>${node.sources
          .map((s) => s.url
            ? `<a href="${esc(s.url)}" target="_blank" rel="noreferrer noopener">
                 <strong>${esc(s.label)}</strong><span>${esc(hostOf(s.url))}</span></a>`
            : `<a><strong>${esc(s.label)}</strong></a>`)
          .join('')}</section>`
      : ''

    const threads = related.length
      ? `<h2>${t.threads}</h2><div class="kb-link-list">${related
          .map((r) => `<button type="button" data-jump="${esc(r.id)}">
              <strong>${esc(r.relation)}</strong>
              <span>${esc(r.title)}</span>
              <small>${esc(r.summary)}</small>
            </button>`).join('')}</div>`
      : ''

    el.innerHTML = `
      <div class="kb-detail-binding"></div>
      <div class="kb-detail-sheet">
        <header class="kb-detail-head">
          <button type="button" class="kb-detail-back" data-role="back">${t.back}</button>
          <p class="kb-detail-kicker">${esc(node.kicker === node.kindLabel ? node.kicker : `${node.kicker} · ${node.kindLabel}`)}</p>
          <h1 tabindex="-1">${esc(node.title)}</h1>
        </header>
        <div class="kb-detail-body">
          <div class="kb-detail-nav">
            <button type="button" data-step="-1" ${index === 0 ? 'disabled' : ''} aria-label="上一条">${icons.prev}</button>
            <strong>${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</strong>
            <button type="button" data-step="1" ${index === total - 1 ? 'disabled' : ''} aria-label="下一条">${icons.next}</button>
          </div>
          <p class="kb-detail-lead">${esc(node.detail)}</p>
          ${facts}
          ${bullets}
          ${media}
          ${video}
          ${sources}
          ${threads}
        </div>
      </div>`

    el.hidden = false
    el.scrollTop = 0
    el.querySelector('h1')?.focus({ preventScroll: true })
  }

  return {
    element: el,
    render,
    close() { el.hidden = true; el.innerHTML = '' },
    get isOpen() { return !el.hidden },
  }
}
