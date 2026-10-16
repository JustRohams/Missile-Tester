# 💥 MissileTester

**B-2 Spirit strike simulator** — a web-based 3D air-strike simulator built with
**Three.js**. Features a massive procedurally-generated city, a fully modeled
B-2 flying-wing bomber, eight famous bombs, and cinematic multi-phase explosions.

🔗 **Repository:** [github.com/JustRohams/MissileTester](https://github.com/JustRohams/MissileTester)
👤 **Author:** [@JustRohams](https://github.com/JustRohams)

![Three.js](https://img.shields.io/badge/three.js-0.160-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Dependencies](https://img.shields.io/badge/dependencies-none-success)

---

## ✨ Features

- ☀️ **Bright daylight city** — 4.2 × 4.2 km footprint, 2,000+ buildings,
  taller downtown core with lower-rise suburbs
- ✈️ **Fully modeled B-2 Spirit** — sawtooth trailing edge, glass cockpit,
  pulsing engine glow, blinking nav lights, engine contrails
- 🎯 **Click-to-target system** — pick any point on the city to drop a red
  target marker with a vertical beam and pulsing ring
- 💣 **8 famous bombs** — each with a unique procedural 3D model and real
  specifications
- 🎬 **Cinematic 8-phase explosion** — flash → fireball → shockwave →
  mushroom stem → mushroom cap → ballistic debris → smoke → persistent crater
- 🔴 **Blast-radius rings** — four color-coded damage zones expand outward
- 📊 **Live damage report** — complete destruction, heavy/moderate damage,
  broken windows, plus a running tally of building states
- 🎥 **Cinematic camera** — chase-cam for the plane approach, optional
  bomb-follow mode, wide shot, and pullback at impact
- ⏱️ **Altitude selector** — 600 m / 2 km / 14 km
- ⏩ **Simulation speed** — 0.1× / 0.3× / 1×
- ♻️ **One-click city reset** — restore all buildings and clear scorch marks
- 🎨 **Material Symbols** — Google's official icon set throughout the UI

---

## 🎮 How to Use

1. Open **Settings** to choose your bomb, altitude, and simulation speed.
2. Click anywhere on the city to designate a target.
3. Press **Throw**.
4. The B-2 makes its approach, releases the bomb at the correct ballistic
   point, and detonates on impact.

---

## 📁 Project Structure

```
MissileTester/
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── main.js        (render loop, state machine, cinematic camera)
│   ├── city.js        (city generation + damage system)
│   ├── b2.js          (bomber model + flight animation)
│   ├── bombs.js       (bomb database + procedural models)
│   ├── explosion.js   (explosion, rings, and impact-dust animations)
│   └── ui.js          (DOM bindings + stats renderer)
├── README.md
└── LICENSE
```

---

## 🚀 Running Locally

The code uses native **ES Modules**, so it must be served over HTTP
(opening with `file://` will fail because of CORS restrictions).

```bash
# Using Python
python -m http.server 8080

# Using Node
npx serve .
```

Then open: `http://localhost:8080`

---

## 💣 Available Bombs

| Bomb                 | Mass      | TNT Equivalent | Penetration              |
|----------------------|-----------|----------------|--------------------------|
| MK-84                | 925 kg    | ~1.1 tons      | 2 m concrete             |
| BLU-82 Daisy Cutter  | 6,800 kg  | ~7 tons        | 5 m soil                 |
| GBU-43/B MOAB        | 9,800 kg  | ~11 tons       | 10 m soil                |
| GBU-57 MOP           | 13,600 kg | ~110 tons      | 60 m reinforced concrete |
| Little Boy           | 4,400 kg  | ~15 kilotons   | air-burst                |
| Fat Man              | 4,600 kg  | ~21 kilotons   | air-burst                |
| B61-12               | 825 kg    | ~50 kilotons   | earth-penetrating        |
| Tsar Bomba           | 27,000 kg | ~50 megatons   | air-burst                |

Each entry in `js/bombs.js` also defines the four blast radii
(`[total, heavy, moderate, light]` in meters) used for the damage system
and the on-screen statistics panel.

---

## 🛠️ Technologies Used

- **Three.js 0.160** — loaded via ESM import maps
- **InstancedMesh** — renders 2,000+ buildings in a single draw call
- **CanvasTexture** — persistent scorch marks and debris baked into the
  ground plane
- **AdditiveBlending** — layered glow for fire, shockwave, and beams
- **PointLight** — dynamic illumination at each explosion center
- **OrbitControls** — smooth camera orbit / zoom / pan (auto-disabled
  during cinematic sequences)
- **Google Material Symbols** — vector iconography

---

## ⚙️ Animation Details

| Animation          | Description                                                            |
|--------------------|------------------------------------------------------------------------|
| **B-2 flight**     | Subtle banking and pitch/roll wobble, engine pulse, blinking nav lights, tapered contrails |
| **Bomb release**   | Inherits forward velocity, initial tumble, then aerodynamic stabilization along the velocity vector |
| **Bomb trail**     | Continuous smoke puff emitter behind the falling bomb                   |
| **Explosion (1)**  | White sphere flash — 4× scale-up and fade within 0.14 s                 |
| **Explosion (2)**  | Expanding fireball with white-hot core; colour shifts yellow → red      |
| **Explosion (3)**  | Horizontal shockwave ring, expanding on the ground                      |
| **Explosion (4/5)**| Mushroom stem + cap with eased growth over ~4 s                         |
| **Explosion (6)**  | Up to 180 ballistic debris cubes with random rotation                   |
| **Explosion (7)**  | Up to 90 smoke puffs that rise, grow, and fade                          |
| **Impact dust**    | 60 ground-hugging dust puffs that rush outward from the impact point    |
| **Blast rings**    | Four delayed rings (red → orange → yellow → blue) expanding outward     |
| **Camera**         | Cinematic mode transitions: plane chase → bomb chase / wide shot → pullback |

---

## 📜 License

MIT © [JustRohams](https://github.com/JustRohams) — see [LICENSE](./LICENSE) for details.