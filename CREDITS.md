# Credits and third-party assets

## 3D model: "Computer Terminal"

- **Author:** Chris Sweetwood (https://sketchfab.com/ChrisSweetwood)
- **Source:** https://sketchfab.com/3d-models/computer-terminal-b3a26b00c5b04eedad0a1cdca884130f
- **License:** CC BY-SA 4.0 (http://creativecommons.org/licenses/by-sa/4.0/). The author must be credited, and
  modified versions must keep the same license. The original license file is at
  `public/models/computer-terminal/LICENSE.txt`.
- **Credit on the site:** shown in the bottom-left corner of the home page (`Credit` in
  `src/components/sections/ComputerScene/ComputerCanvas.tsx`). Keep it there or move it to the footer, but do not
  remove it.

This work is based on "Computer Terminal"
(https://sketchfab.com/3d-models/computer-terminal-b3a26b00c5b04eedad0a1cdca884130f) by Chris Sweetwood
(https://sketchfab.com/ChrisSweetwood) licensed under CC-BY-SA-4.0 (http://creativecommons.org/licenses/by-sa/4.0/).

### Changes made to the model

- Converted `scene.gltf` + textures into one file, `public/models/computer-terminal/computer-terminal.glb`, with the
  textures re-encoded as WebP (14.5 MB down to 1.1 MB). The meshes and node names are unchanged.
- The roughness/metalness texture was downsized from 2048 px to 1024 px.

To rebuild it from the original Sketchfab download (for example after re-downloading at a different quality):

```sh
npx @gltf-transform/cli resize scene.gltf r.gltf --width 1024 --height 1024 --pattern "*metallicRoughness*"
npx @gltf-transform/cli webp r.gltf w.glb --quality 88 --slots "baseColorTexture"
npx @gltf-transform/cli webp w.glb computer-terminal.glb --quality 92
```

### Changes made to the gltfjsx component

`src/components/three/ComputerTerminal.tsx` started as the https://gltf.pmnd.rs/ output for `scene.gltf`. It now:

- loads the optimized `.glb` above;
- uses the exact root scale from the file (`0.0040354`, gltfjsx rounded it to `0.004`) so the screen lines up;
- hides the magazine-ad backdrop plane by default (`<ComputerTerminal showBackdrop />` brings it back);
- draws the baked floor shadow in black instead of blue;
- exports `SCREEN`, the position and size of the CRT glass, so HTML can be placed on it.

## Libraries

- [three.js](https://threejs.org/) (MIT)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) (MIT)
- [@react-three/drei](https://github.com/pmndrs/drei) (MIT). `<Html transform occlude="blending">` puts the
  pill choice on the 3D screen.
- [html-to-image](https://github.com/bubkoo/html-to-image) (MIT). Captures the screen's HTML as a texture when a pill
  is clicked, so the dive effect can process it.

## References (inspiration only, no footage or assets used)

- The dive into the screen after a pill is clicked is modelled on _Tron: Legacy_ (2010), the "Sam enters the Grid"
  scene (https://www.youtube.com/watch?v=sfrZ7_nNhsA, 0:44 to 0:47): the light swells, the frame breaks into blocky
  streaks stretching out from the centre, the colour shifts to cyan, a dark streaked tunnel, then black.
- The code rain follows the look of _The Matrix_ (1999) titles: mirrored half-width katakana and digits.

---

# Editing the 3D home page

| What                                                            | Where                                                                                                  |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Use the old flat page instead                                   | `content/pages/index.md`: change `type: ComputerScene` to `type: MatrixPillChoice`                     |
| Camera fly-in, framing, mouse drift, lights, colours            | knobs at the top of `src/components/sections/ComputerScene/ComputerCanvas.tsx`                         |
| What appears on the screen                                      | `Screen` in the same file, plus `PillsRender` in `src/components/sections/MatrixPillChoice/index.tsx`  |
| Screen styling (CRT scanlines, power-on, font sizes, mobile)    | `src/css/main.css`, section "3D computer"                                                              |
| Code rain in the 3D scene (density, brightness, colours)        | `src/components/three/MatrixRain3D.tsx` (props + `DEFAULTS`), `RAIN_INTENSITY` in `ComputerCanvas.tsx` |
| Code rain on the screen (off by default)                        | `src/components/three/MatrixCodeRain.tsx`, turn on with `SCREEN_RAIN` in `ComputerCanvas.tsx`          |
| Dive into the screen after a pill click (timing, look, colours) | `DIVE` at the top of `src/components/sections/ComputerScene/ScreenDive.tsx`                            |
| Scrub the dive while tuning (development only)                  | browser console: `window.__diveProgress = 0.5` before clicking a pill, then change the number          |

If WebGL is unavailable or the model fails to load, the home page falls back to the flat `MatrixPillChoice` automatically.
