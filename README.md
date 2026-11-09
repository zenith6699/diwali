# Happy Diwali — 3D surprise

Interactive 3D Diwali story (Three.js + Theatre.js): lit street, couple with sparklers, fireworks that write names, temple, gift room, sky lanterns. Cinematic camera sequences (Theatre.js), 8D spatial audio and a looping music track (`src/assets/music.mp3`).

## Open it
Open `index.html` in Chrome / Edge / Safari with hardware acceleration on (needs WebGL2). With GitHub Pages enabled it works straight from the repo.

## Personalise
In `template.html` edit `window.CONFIG = { to: "Jaanu", from: "Tumhara apna", message: "" }`, then rebuild.

## Rebuild
```
npm install
node build.mjs     # writes dist.html
cp dist.html index.html && cp dist.html build/index.html   # build/ is what Render publishes
```

## Notes
- Phones: the page opens the greeting card immediately while the 3D street loads; if a tab ever crashes it resumes where it left off in a lighter mode.
- Past bug (fixed): an invisible finale "Phir se dekho" button sat on top of the "Light the phuljhadi" button and reloaded the page on tap.
- `src/assets/boy.glb` and `girl.glb` are Ready Player Me style avatars taken from a public tutorial repo (wass08/r3f-virtual-girlfriend-frontend and a three.js example). Their licence is not stated, so keep this repo for personal use or swap in your own avatars.

## Latest changes
- Fireworks: "Happy Diwali" with his name below it
- Love letter ends with her name
- Redesigned clay diyas, realistic rabbit, quiff hair for the boy
- Fireworks camera stays behind the couple and tilts up for the Happy Diwali text
- Names: letter greets her, signed by him, ends with her name
- Girl: glasses removed, original skin tone
