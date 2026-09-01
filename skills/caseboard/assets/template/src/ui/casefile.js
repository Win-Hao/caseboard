// 左下角的证据吊牌 + 底边的文件夹标签。
//
// 吊牌：图钉挂一张牛皮纸 tag，正面是案卷号和两枚工具印（搜索/回全景），
// 背面是操作速查。翻面只由 ? 印章触发（悬停即翻、点击钉住）——
// 整卡 hover 翻面会让正面的按钮永远点不到。
// 标签：一个案卷一个折角 tab，当前页抬起。只有一个案卷时整排隐藏。

import { icons } from './icons.js'
import { strings } from '../core/i18n.js'

export function createCaseFile(root, { locale, cases, onSelectCase, onHome, onSearch }) {
  const t = strings(locale)
  const pad2 = (n) => String(n + 1).padStart(2, '0')

  /* ── 文件夹标签 ── */
  const tabs = document.createElement('nav')
  tabs.className = 'kb-tabs'
  tabs.setAttribute('aria-label', t.caseWord)
  tabs.hidden = cases.length <= 1
  tabs.innerHTML = cases
    .map((c, i) => `
      <button type="button" class="kb-tab" data-index="${i}">
        <span>${pad2(i)}</span>${c.label}
      </button>`)
    .join('')
  tabs.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-index]')
    if (btn) onSelectCase(Number(btn.dataset.index))
  })
  root.appendChild(tabs)

  /* ── 证据吊牌 ── */
  const tag = document.createElement('section')
  tag.className = 'kb-tag'
  tag.innerHTML = `
    <span class="kb-tag-pin" aria-hidden="true"></span>
    <div class="kb-tag-card">
      <div class="kb-tag-face kb-tag-front">
        <span class="kb-tag-hole" aria-hidden="true"></span>
        <span class="kb-tag-stamp">${t.caseWord}</span>
        <strong class="kb-tag-no" data-role="index">№ 01 / ${String(cases.length).padStart(2, '0')}</strong>
        <span class="kb-tag-label" data-role="label"></span>
        <div class="kb-tag-tools">
          <button type="button" data-role="search" aria-label="${t.search}" title="${t.search} (⌘K)">${icons.search}</button>
          <button type="button" data-role="home" aria-label="${t.home}" title="${t.home} (0)">${icons.home}</button>
          <button type="button" data-role="flip" aria-label="${t.helpTitle}" aria-pressed="false" title="${t.helpTitle}">?</button>
        </div>
      </div>
      <div class="kb-tag-face kb-tag-back">
        <span class="kb-tag-hole" aria-hidden="true"></span>
        <p>${t.helpLine1}</p>
        <p>${t.helpLine2}</p>
        <div class="kb-tag-tools">
          <button type="button" data-role="flip-back" aria-label="${t.helpTitle}" title="${t.helpTitle}">?</button>
        </div>
      </div>
    </div>`
  root.appendChild(tag)

  const indexEl = tag.querySelector('[data-role="index"]')
  const labelEl = tag.querySelector('[data-role="label"]')
  const flipBtn = tag.querySelector('[data-role="flip"]')

  let pinnedFlip = false
  const applyFlip = (on) => {
    tag.classList.toggle('is-flipped', on)
    flipBtn.setAttribute('aria-pressed', String(on))
  }
  flipBtn.addEventListener('click', () => { pinnedFlip = !pinnedFlip; applyFlip(pinnedFlip) })
  tag.querySelector('[data-role="flip-back"]').addEventListener('click', () => { pinnedFlip = false; applyFlip(false) })
  flipBtn.addEventListener('pointerenter', () => { if (!pinnedFlip) applyFlip(true) })
  tag.addEventListener('pointerleave', () => { if (!pinnedFlip) applyFlip(false) })

  tag.querySelector('[data-role="search"]').addEventListener('click', onSearch)
  tag.querySelector('[data-role="home"]').addEventListener('click', onHome)

  return {
    element: tag,
    setCase(index) {
      indexEl.textContent = `№ ${pad2(index)} / ${String(cases.length).padStart(2, '0')}`
      labelEl.textContent = cases[index].label
      for (const btn of tabs.querySelectorAll('.kb-tab')) {
        const active = Number(btn.dataset.index) === index
        btn.classList.toggle('is-active', active)
        if (active) btn.setAttribute('aria-current', 'true')
        else btn.removeAttribute('aria-current')
      }
      // 换案卷时轻轻晃一下，像刚挂上去
      tag.classList.remove('is-swinging')
      void tag.offsetWidth
      tag.classList.add('is-swinging')
    },
  }
}
