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

## 3D model: "TRON: Uprising - ArgonCity Light Cycle"

- **Author:** TheTinDog (https://sketchfab.com/simysimes)
- **Source:** https://sketchfab.com/3d-models/tron-uprising-argoncity-light-cycle-a4c0e652c9a443868c3551e12f4bffee
- **License:** CC BY 4.0 (http://creativecommons.org/licenses/by/4.0/). The author must be credited. Original license
  file: `public/models/light-cycle/LICENSE.txt`.
- **Credit on the site:** bottom-right corner of both grids (`Hud.tsx` in `src/components/sections/MatrixGrid/`).
- **Changes:** re-packed as `public/models/light-cycle/light-cycle.glb` (WebP texture, quantised geometry: 1.9 MB down to
  0.87 MB). The red-orange glow is recoloured at runtime: white on the trunk, then the colour of each lane the cycle
  rides into (`COLORS` in `src/components/sections/MatrixGrid/worlds.ts`).

This work is based on "TRON: Uprising - ArgonCity Light Cycle"
(https://sketchfab.com/3d-models/tron-uprising-argoncity-light-cycle-a4c0e652c9a443868c3551e12f4bffee) by TheTinDog
(https://sketchfab.com/simysimes) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/).

## Fonts (SIL Open Font License 1.1)

- **Orbitron** by The League of Moveable Type / Matt McInerney (titles on the grid). License: `public/fonts/Orbitron-OFL.txt`.
- **Share Tech Mono** by Carrois Type Design (text on the grid). License: `public/fonts/ShareTechMono-OFL.txt`.
- Files taken from the Fontsource packages (`@fontsource/orbitron`, `@fontsource/share-tech-mono`), Latin subset.

## Libraries

- [three.js](https://threejs.org/) (MIT)
- [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) (MIT)
- [@react-three/drei](https://github.com/pmndrs/drei) (MIT). `<Html transform occlude="blending">` puts the
  pill choice on the 3D screen.
- [troika-three-text](https://github.com/protectwise/troika) (MIT), through drei's `<Text>`: the text on the grid panels.
- [zustand](https://github.com/pmndrs/zustand) (MIT): shared state between the grid scene and its on-screen controls.
- [html-to-image](https://github.com/bubkoo/html-to-image) (MIT). Captures the screen's HTML as a texture when a pill
  is clicked, so the dive effect can process it.

## References (inspiration only, no footage or assets used)

- The dive into the screen after a pill is clicked is modelled on _Tron: Legacy_ (2010), the "Sam enters the Grid"
  scene (https://www.youtube.com/watch?v=sfrZ7_nNhsA, 0:44 to 0:47): the light swells, the frame breaks into blocky
  streaks stretching out from the centre, the colour shifts to cyan, a dark streaked tunnel, then black.
- The code rain follows the look of _The Matrix_ (1999) titles: mirrored half-width katakana and digits.
- The grids, light cycle, light trail, lane lights and the exit portal follow _Tron_ (1982) / _Tron: Legacy_ (2010).

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

# Editing the grids (/projectChoice and /experienceChoice)

The blue pill dives into the projects grid, the red pill into the experience grid. Both are the same component
(`src/components/sections/MatrixGrid/`), set up by `world:` in the page's content file.

| Grid                                               | Left lane (colour)    | Right lane (colour)       | Straight ahead (colour)                       |
| -------------------------------------------------- | --------------------- | ------------------------- | --------------------------------------------- |
| `projects` (`content/pages/projectChoice.md`)      | Game projects (blue)  | Software projects (green) | All projects, rides off to `/projects` (pink) |
| `experience` (`content/pages/experienceChoice.md`) | Work experience (red) | Education (yellow)        | none                                          |

| What                                                            | Where                                                                                                                   |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Lane names, sign text, colours, which items go in which lane    | `WORLDS` and `COLORS` in `src/components/sections/MatrixGrid/worlds.ts`                                                 |
| Add, remove or retarget the straight lane                       | `straight` in a world in `worlds.ts` (`href` is the page it rides to; delete `straight` to remove the lane)             |
| Which projects appear, and in which lane                        | `content/pages/projects/*.md`: `filter: game` goes left, anything else goes right                                       |
| Which work / education entries appear, and in which lane        | `content/pages/workXP/*.md`: `filter: education` goes right (Education), anything else goes left (Work experience)      |
| Add another school or course                                    | copy `content/pages/workXP/3-Dalhousie.md` and keep `filter: education`                                                 |
| Order of the panels                                             | newest `startdate` first (`getAllProjectsSorted` / `getAllWorkXPSorted` in `src/utils/static-props-resolvers.ts`)       |
| Use the old flat "Choose your path" page instead                | `content/pages/projectChoice.md`: change `type: MatrixGrid` to `type: ProjectChoiceSection`                             |
| Where the red pill goes                                         | `url` in `content/pages/pillOptions/work-experience.md` (now `/experienceChoice`; the old Tron-disk page was `/workXP`) |
| Positions, spacing, signs, exit portal, panel sizes, cameras    | `WORLD` in `src/components/sections/MatrixGrid/layout.ts`                                                               |
| Light cycle speed, how fast its colour changes, chase camera    | `BIKE` in the same file (`colorChange` is the colour fade time in seconds)                                              |
| Intro timing (rain turning into the grid)                       | `INTRO` in `timeline.ts`                                                                                                |
| Panel look and text, signs, exit portal                         | `Panels.tsx`                                                                                                            |
| Lane lines on the floor                                         | `Environment.tsx`                                                                                                       |
| Buttons and labels on top of the scene                          | `Hud.tsx`, styles in `src/css/main.css` (section "The grid in 3D")                                                      |
| Look at the scene from anywhere while tuning (development only) | browser console: `window.__gridCamera = { position: [x, y, z], look: [x, y, z] }`, `delete window.__gridCamera` to stop |

Controls: arrow keys (Up at the fork takes the straight lane), mouse wheel, swipes, clicking panels and signs, Enter to
open, Esc to go back. The address bar follows the bike (`?lane=game&project=3-Gambit`, `?lane=education`), so a link
opens straight at that item. Without WebGL the old flat pages are shown (for the experience grid: two buttons leading to
`/workXP?filter=work` and `/workXP?filter=education`), and a plain list of the items is always in the page for screen
readers.
