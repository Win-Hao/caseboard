// 左下角的卷宗盒：案卷切换 + 工具条。

import { icons } from './icons.js'
import { strings } from '../core/i18n.js'

export function createCaseFile(root, { locale, cases, onSelectCase, onHome, onZoom, onSearch, onToggleHelp }) {
  const t = strings(locale)
  const el = document.createElement('section')
  el.className = 'kb-console'
  el.innerHTML = `
    <div class="kb-console-heading">
      <span>${t.caseWord}</span><strong data-role="index">01 / ${String(cases.length).padStart(2, '0')}</strong>
    </div>
    <div class="kb-console-controls">
      <button type="button" data-role="prev" aria-label="${t.prevCase}">${icons.prev}</button>
      <div class="kb-picker">
        <button type="button" class="kb-picker-trigger" data-role="trigger"
                aria-haspopup="listbox" aria-expanded="false">
          <span data-role="label"></span>${icons.chevronDown}
        </button>
      </div>
      <button type="button" data-role="next" aria-label="${t.nextCase}">${icons.next}</button>
    </div>
    <nav class="kb-console-tools" aria-label="视图工具">
      <button type="button" data-role="home" aria-label="${t.home}" title="${t.home} (0)">${icons.home}</button>
      <button type="button" data-role="in" aria-label="${t.zoomIn}" title="${t.zoomIn}">${icons.zoomIn}</button>
      <button type="button" data-role="out" aria-label="${t.zoomOut}" title="${t.zoomOut}">${icons.zoomOut}</button>
      <button type="button" data-role="search" aria-label="${t.search}" title="${t.search} (⌘K)">${icons.search}</button>
      <button type="button" data-role="help" aria-label="${t.helpTitle}" aria-pressed="true" title="${t.helpTitle}">${icons.info}</button>
    </nav>`
  root.appendChild(el)

  const picker = el.querySelector('.kb-picker')
  const trigger = el.querySelector('[data-role="trigger"]')
  const labelEl = el.querySelector('[data-role="label"]')
  const indexEl = el.querySelector('[data-role="index"]')
  const prevBtn = el.querySelector('[data-role="prev"]')
  const nextBtn = el.querySelector('[data-role="next"]')

  let popover = null
  let current = 0

  function closePopover() {
    if (!popover) return
    popover.remove()
    popover = null
    trigger.setAttribute('aria-expanded', 'false')
  }

  function openPopover() {
    if (popover) { closePopover(); return }
    popover = document.createElement('div')
    popover.className = 'kb-picker-popover'
    popover.setAttribute('role', 'listbox')
    popover.innerHTML = `<div class="kb-picker-list">${cases
      .map((c, i) => `
        <button type="button" role="option" data-index="${i}"
                class="${i === current ? 'is-active' : ''}" aria-selected="${i === current}">
          <span>${String(i + 1).padStart(2, '0')}</span><strong>${c.label}</strong>${icons.check}
        </button>`)
      .join('')}</div>`
    popover.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-index]')
      if (!btn) return
      closePopover()
      onSelectCase(Number(btn.dataset.index))
    })
    picker.appendChild(popover)
    trigger.setAttribute('aria-expanded', 'true')
    popover.querySelector('button.is-active')?.focus()
  }

  trigger.addEventListener('click', openPopover)
  document.addEventListener('pointerdown', (e) => {
    if (popover && !picker.contains(e.target)) closePopover()
  })

  // 弹层开着的时候必须能用键盘走完，也必须能 Esc 关掉
  picker.addEventListener('keydown', (e) => {
    if (!popover) return
    const items = [...popover.querySelectorAll('button[data-index]')]
    if (e.key === 'Escape') { e.preventDefault(); closePopover(); trigger.focus(); return }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const here = items.indexOf(document.activeElement)
    const step = e.key === 'ArrowDown' ? 1 : -1
    const next = here < 0
      ? (step > 0 ? 0 : items.length - 1)
      : (here + step + items.length) % items.length
    items[next]?.focus()
  })

  prevBtn.addEventListener('click', () => onSelectCase(current - 1))
  nextBtn.addEventListener('click', () => onSelectCase(current + 1))
  el.querySelector('[data-role="home"]').addEventListener('click', onHome)
  el.querySelector('[data-role="in"]').addEventListener('click', () => onZoom(1.35))
  el.querySelector('[data-role="out"]').addEventListener('click', () => onZoom(1 / 1.35))
  el.querySelector('[data-role="search"]').addEventListener('click', onSearch)

  const helpBtn = el.querySelector('[data-role="help"]')
  helpBtn.addEventListener('click', () => {
    const on = helpBtn.getAttribute('aria-pressed') !== 'true'
    helpBtn.setAttribute('aria-pressed', String(on))
    onToggleHelp(on)
  })

  return {
    element: el,
    setCase(index) {
      current = index
      labelEl.textContent = cases[index].label
      indexEl.textContent = `${String(index + 1).padStart(2, '0')} / ${String(cases.length).padStart(2, '0')}`
      prevBtn.disabled = index === 0
      nextBtn.disabled = index === cases.length - 1
      closePopover()
    },
  }
}

export function createHelpNote(root, locale) {
  const t = strings(locale)
  const el = document.createElement('aside')
  el.className = 'kb-hint'
  el.innerHTML = `<p>${t.helpLine1}</p><p>${t.helpLine2}</p>`
  root.appendChild(el)
  return {
    element: el,
    setVisible(v) { el.hidden = !v },
  }
}
