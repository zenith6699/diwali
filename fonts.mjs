import fs from 'fs';
const base = 'node_modules/@fontsource/';
const LAT = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD,U+2665,U+2726,U+2728';
const DEV = 'U+0900-097F,U+1CD0-1CF9,U+200C-200D,U+20A8,U+20B9,U+25CC,U+A830-A839,U+A8E0-A8FF';
const list = [
  ['Cormorant Garamond', 'cormorant-garamond', 'latin', 500, 'italic', LAT],
  ['Cormorant Garamond', 'cormorant-garamond', 'latin', 700, 'italic', LAT],
  ['Cormorant Garamond', 'cormorant-garamond', 'latin', 700, 'normal', LAT],
  ['DM Sans', 'dm-sans', 'latin', 400, 'normal', LAT],
  ['DM Sans', 'dm-sans', 'latin', 600, 'normal', LAT],
  ['Kalam', 'kalam', 'latin', 400, 'normal', LAT], ['Kalam', 'kalam', 'latin', 700, 'normal', LAT],
  ['Kalam', 'kalam', 'devanagari', 400, 'normal', DEV], ['Kalam', 'kalam', 'devanagari', 700, 'normal', DEV],
  ['Yatra One', 'yatra-one', 'latin', 400, 'normal', LAT], ['Yatra One', 'yatra-one', 'devanagari', 400, 'normal', DEV],
];
let css = '', total = 0;
for (const [fam, dir, sub, w, st, range] of list) {
  const f = `${base}${dir}/files/${dir}-${sub}-${w}-${st}.woff2`;
  const b = fs.readFileSync(f); total += b.length;
  css += `@font-face{font-family:'${fam}';font-style:${st};font-weight:${w};font-display:swap;src:url(data:font/woff2;base64,${b.toString('base64')}) format('woff2');unicode-range:${range}}\n`;
}
fs.writeFileSync('fonts.css', css);
console.log('fonts', (total / 1024).toFixed(0), 'KB raw');
