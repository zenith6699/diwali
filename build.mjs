import { build } from 'esbuild';
import fs from 'fs';
const r = await build({ entryPoints: ['src/main.js'], bundle: true, minify: true, format: 'iife', target: 'es2020', write: false, legalComments: 'none', loader: { '.glb': 'base64' } });
const js = r.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync('template.html', 'utf8').replace('/*FONTS*/', () => fs.readFileSync('fonts.css', 'utf8')).replace('/*BUNDLE*/', () => js);
fs.writeFileSync('dist.html', html);
console.log('built', (html.length / 1024).toFixed(0) + ' KB');
