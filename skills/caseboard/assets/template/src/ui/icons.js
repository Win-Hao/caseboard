// 线稿图标。统一 24 视框、无填充、round 端点——和打字机字体是一套语言。

const svg = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`

export const icons = {
  prev: svg('<path d="M15 5 8 12l7 7"/>'),
  next: svg('<path d="M9 5l7 7-7 7"/>'),
  chevronDown: svg('<path d="M6 9l6 6 6-6"/>'),
  check: svg('<path d="M4 12.5 9 17.5 20 6.5"/>'),
  home: svg('<path d="M4 11 12 4l8 7"/><path d="M6.5 9.5V20h11V9.5"/>'),
  zoomIn: svg('<circle cx="11" cy="11" r="6.5"/><path d="M11 8.5v5M8.5 11h5M15.8 15.8 20 20"/>'),
  zoomOut: svg('<circle cx="11" cy="11" r="6.5"/><path d="M8.5 11h5M15.8 15.8 20 20"/>'),
  search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M15.8 15.8 20 20"/>'),
  info: svg('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.8v.6"/>'),
  arrowRight: svg('<path d="M5 12h13M13 7l5 5-5 5"/>'),
  link: svg('<path d="M10 13a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7L11.5 6"/><path d="M14 11a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7L12.5 18"/>'),
}
