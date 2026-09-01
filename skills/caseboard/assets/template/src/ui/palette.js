// ⌘K 命令面板。跨全部案卷模糊搜索。

import { icons } from './icons.js'
import { strings } from '../core/i18n.js'

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** 子序列匹配 + 连续片段加权。够用，不引依赖。 */
function score(query, text) {
  if (!query) return 1
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  const direct = t.indexOf(q)
  if (direct >= 0) return 1000 - direct
  let qi = 0
  let s = 0
  let streak = 0
  for (let i = 0; i < t.length && qi < q.length; i += 1) {
    if (t[i] === q[qi]) { qi += 1; streak += 1; s += streak * 2 } else streak = 0
  }
  return qi === q.length ? s : 0
}

export function createPalette(root, { locale, entries, onPick }) {
  const t = strings(locale)
  const backdrop = document.createElement('div')
  backdrop.className = 'kb-search-backdrop'
  backdrop.hidden = true
  backdrop.innerHTML = `
    <div class="kb-search" role="dialog" aria-modal="true" aria-label="${t.search}">
      <div class="kb-search-input">
        ${icons.search}
        <input type="search" name="board-search" aria-label="${t.search}"
               placeholder="${t.searchPlaceholder}" autocomplete="off" spellcheck="false" />
        <kbd>ESC</kbd>
      </div>
      <div class="kb-search-meta">
        <span data-role="count"></span><span>${t.hintNav}</span>
      </div>
      <div class="kb-search-results" role="listbox"></div>
      <div class="kb-search-footer">
        <span><kbd>↑</kbd><kbd>↓</kbd> ${t.move}</span>
        <span><kbd>⏎</kbd> ${t.open}</span>
        <span><kbd>esc</kbd> ${t.close}</span>
      </div>
    </div>`
  root.appendChild(backdrop)

  const input = backdrop.querySelector('input')
  const list = backdrop.querySelector('.kb-search-results')
  const countEl = backdrop.querySelector('[data-role="count"]')
  let items = []
  let active = 0
  let all = entries

  function draw() {
    const q = input.value.trim()
    items = all
      .map((e) => ({ e, s: Math.max(score(q, e.title), score(q, e.summary) * 0.6, score(q, e.caseLabel) * 0.4) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 40)
      .map((x) => x.e)

    active = 0
    countEl.textContent = t.resultCount(items.length)
    if (items.length === 0) {
      list.innerHTML = `<div class="kb-search-empty"><strong>${t.emptyTitle}</strong><span>${t.emptySub}</span></div>`
      return
    }
    list.innerHTML = items.map((e, i) => `
      <button type="button" role="option" data-index="${i}" class="${i === 0 ? 'is-active' : ''}">
        <span class="kb-search-number">${String(i + 1).padStart(2, '0')}</span>
        <span><strong>${esc(e.title)}</strong><small>${esc(e.summary)}</small></span>
        <em>${esc(e.caseLabel)} · ${esc(e.kindLabel)}</em>
        ${icons.arrowRight}
      </button>`).join('')
  }

  function setActive(i) {
    if (items.length === 0) return
    active = (i + items.length) % items.length
    for (const [j, btn] of [...list.querySelectorAll('button')].entries()) {
      btn.classList.toggle('is-active', j === active)
      if (j === active) btn.scrollIntoView({ block: 'nearest' })
    }
  }

  function close() {
    backdrop.hidden = true
    input.value = ''
  }

  function open() {
    backdrop.hidden = false
    draw()
    input.focus()
  }

  input.addEventListener('input', draw)
  backdrop.addEventListener('pointerdown', (e) => { if (e.target === backdrop) close() })
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]')
    if (!btn) return
    const entry = items[Number(btn.dataset.index)]
    close()
    onPick(entry)
  })
  backdrop.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close() }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1) }
    else if (e.key === 'Enter') {
      e.preventDefault()
      if (items[active]) { const entry = items[active]; close(); onPick(entry) }
    }
  })

  return {
    open,
    close,
    setEntries(next) { all = next },
    get isOpen() { return !backdrop.hidden },
  }
}
