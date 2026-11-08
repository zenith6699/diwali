# Happy Diwali — 3D surprise

Interactive 3D Diwali story (Three.js): lit street, couple, fireworks that write names, temple, gift room, sky lanterns.

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
- `src/assets/boy.glb` and `girl.glb` are Ready Player Me style avatars taken from a public tutorial repo (wass08/r3f-virtual-girlfriend-frontend and a three.js example). Their licence is not stated, so keep this repo for personal use or swap in your own avatars.
