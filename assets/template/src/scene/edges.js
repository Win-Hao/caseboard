// 边缘类型枚举。单独一个文件，不 import three——
// check.mjs（Node 里跑）经由 cards/index.js 的校验用到它，
// 放在 geometry.js 里会把整个 three 拖进 Node 侧，npm install 没跑完就没法 check。
//
// 六种边缘（几何实现在 geometry.js）：
//   clean       直角矩形。印刷品、卡纸。
//   ripped      四边全部撕裂，振幅大。从整页上撕下来的。
//   torn-top    只有上边撕裂。从便签本上撕下来的。
//   deckle      细密毛边，振幅是 ripped 的三分之一。手工纸、打字纸。
//   perforated  规则半圆齿孔，绕一圈。邮票／连续纸／票据。
//   notched     四角切角。档案卡的分类裁角。

export const EDGES = ['clean', 'ripped', 'torn-top', 'deckle', 'perforated', 'notched']
