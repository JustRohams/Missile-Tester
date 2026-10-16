import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildCity, resetCity, damageCity, city } from './city.js';
import { createB2, updateB2 } from './b2.js';
import { BOMBS, createBombModel } from './bombs.js';
import { spawnExplosion, spawnRings, spawnImpactDust } from './explosion.js';
import { initUI, renderStats } from './ui.js';

const PLANE_SCALE = 1.8;
const BOMB_SCALE  = 2.2;

const state = {
  selectedBomb: BOMBS[0],
  altitude: 600,
  speedMult: 1,
  followBomb: false,
  showRings: false,
  cinematicEnabled: true,
  phase: 'idle',                        // idle | flying | bombing | cinematic | exploding
  target: new THREE.Vector3(0, 0, 0),

  plane: null,
  planeStart: new THREE.Vector3(),
  planeEnd: new THREE.Vector3(),
  planeSpeed: 160,
  planeProgress: 0,
  planeTotalDist: 1,
  planeContrailTimer: 0,

  bombMesh: null,
  bombVel: new THREE.Vector3(),
  bombTimeMult: 4,
  bombTumble: 0,
  bombSmokeTimers: { next: 0 },
  bombSmokePuffs: [],

  currentExplosion: null,
  currentRings: null,
  currentDust: null,
  cameraShake: 0,

  cameraMode: 'orbit',
  camCineT: 0,
  camCineDur: 0.4,
  camCineStart: new THREE.Vector3(),
  camCineEnd: new THREE.Vector3(),
  camLookStart: new THREE.Vector3(),
  camLookEnd: new THREE.Vector3(),

  impactPos: new THREE.Vector3(),
  impactData: null
};

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb3ca);
scene.fog = new THREE.Fog(0x9fb3ca, 2500, 11000);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 1, 30000);
camera.position.set(1200, 650, 1200);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.maxPolarAngle = Math.PI / 2 - 0.04;
controls.minDistance = 8;
controls.maxDistance = 8000;
controls.target.set(0, 0, 0);

scene.add(new THREE.HemisphereLight(0xd6e6ff, 0x5a6270, 1.35));

const sun = new THREE.DirectionalLight(0xfff2d8, 2.6);
sun.position.set(2200, 2600, -800);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 200;
sun.shadow.camera.far = 6500;
sun.shadow.camera.left = -2600;
sun.shadow.camera.right = 2600;
sun.shadow.camera.top = 2600;
sun.shadow.camera.bottom = -2600;
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.5;
scene.add(sun);

scene.add(new THREE.AmbientLight(0xb8c8e0, 0.55));

{
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 14000;
    const th = Math.random() * Math.PI * 2;
    const ph = Math.acos(2 * Math.random() - 1) * 0.45;
    pos[i*3]   = r * Math.sin(ph) * Math.cos(th);
    pos[i*3+1] = Math.abs(r * Math.cos(ph)) + 600;
    pos[i*3+2] = r * Math.sin(ph) * Math.sin(th);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0xffffff, size: 9, sizeAttenuation: true,
    transparent: true, opacity: 0.5, depthWrite: false
  })));
}

buildCity(scene);

state.plane = createB2();
state.plane.visible = false;
state.plane.scale.setScalar(PLANE_SCALE);  
scene.add(state.plane);

const targetMarker = new THREE.Group();
{
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xff2222, transparent: true, opacity: 0.55,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.6, 3.2, 120, 16, 1, true), beamMat
  );
  beam.position.y = 60;
  targetMarker.add(beam);
  targetMarker.userData.beamMat = beamMat;

  const discMat = new THREE.MeshBasicMaterial({
    color: 0xff3322, transparent: true, opacity: 0.9,
    side: THREE.DoubleSide, depthWrite: false
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(7, 42), discMat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.4;
  targetMarker.add(disc);

  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xff5a3a, transparent: true, opacity: 0.7,
    side: THREE.DoubleSide, depthWrite: false
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(8, 9, 52), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.5;
  targetMarker.add(ring);
  targetMarker.userData.ring = ring;
  targetMarker.userData.ringMat = ringMat;
}
targetMarker.visible = false;
scene.add(targetMarker);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

canvas.addEventListener('pointerdown', (e) => {
  if (state.phase !== 'idle') return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObject(city.group, true);
  if (hits.length) {
    const p = hits[0].point;
    state.target.set(p.x, 0, p.z);
    targetMarker.position.set(p.x, 0, p.z);
    targetMarker.visible = true;
    ui.setHint(false);
    ui.setThrowEnabled(true);
  }
});

const ui = initUI({
  bombs: BOMBS,
  onBombChange(b) { state.selectedBomb = b; },
  onAltitudeChange(a) { state.altitude = a; },
  onSpeedChange(s) { state.speedMult = s; },

  onFollowToggle(v) {
    state.followBomb = v;
    if (v && state.phase === 'bombing' && state.bombMesh) {
      const offset = new THREE.Vector3(52, 40, 52);
      controls.target.copy(state.bombMesh.position);
      camera.position.copy(state.bombMesh.position).add(offset);
      state.cameraMode = 'bomb-follow';
      controls.enabled = true;
    } else if (!v && state.cameraMode === 'bomb-follow') {
      state.cameraMode = 'static-wide';
      controls.enabled = false;
    }
  },

  onCinematicToggle(v) {
    state.cinematicEnabled = v;
    if (!v) ui.hideCinematic();
  },

  onRingsToggle(v) { state.showRings = v; },

  onThrow() { startStrike(); },

  onReset() {
    resetCity();
    ui.setStats('');
    ui.setHint(true, 'Click on the city to select a target');
    ui.setThrowEnabled(false);
    ui.hideCinematic();
    state.phase = 'idle';
    state.cameraMode = 'orbit';
    state.plane.visible = false;
    controls.enabled = true;
  }
});

function startStrike() {
  if (state.phase !== 'idle') return;
  state.phase = 'flying';
  ui.setThrowEnabled(false);
  ui.setHint(false);
  ui.hideCinematic();

  const alt = state.altitude;
  const planeSpeed = 160;
  const g = 9.81;
  const tFall = Math.sqrt(2 * alt / g);
  const releaseDist = planeSpeed * tFall;
  const approachDist = 700;

  const start = state.target.clone().add(
    new THREE.Vector3(0, alt, -(releaseDist + approachDist))
  );
  const end = state.target.clone().add(
    new THREE.Vector3(0, alt, -releaseDist)
  );

  state.plane.position.copy(start);
  state.plane.rotation.set(0, 0, 0);
  state.plane.visible = true;

  state.planeStart.copy(start);
  state.planeEnd.copy(end);
  state.planeSpeed = planeSpeed;
  state.planeProgress = 0;
  state.planeTotalDist = start.distanceTo(end);

  state.cameraMode = 'plane-cinematic';
  controls.enabled = true;                            
  controls.target.copy(state.plane.position);
  camera.position.copy(state.plane.position).add(
    new THREE.Vector3(75, 55, -140)
  );
}

function dropBomb() {
  const bomb = state.selectedBomb;
  const mesh = createBombModel(bomb);
  mesh.position.copy(state.plane.position);
  mesh.scale.setScalar(BOMB_SCALE);  
  scene.add(mesh);

  state.bombMesh = mesh;
  state.bombVel.set(0, 0, state.planeSpeed * 0.85);
  state.phase = 'bombing';
  state.bombTumble = 0;
  state.bombSmokeTimers.next = 0;
  state.bombSmokePuffs.length = 0;

  const alt = state.altitude;
  const realT = Math.sqrt(2 * alt / 9.81);
  const desired = Math.max(2.5, Math.min(realT / 5.5, 8));
  state.bombTimeMult = realT / desired;

  if (state.followBomb) {
    state.cameraMode = 'bomb-follow';
    controls.enabled = true;
    const offset = new THREE.Vector3(52, 40, 52);
    controls.target.copy(state.bombMesh.position);
    camera.position.copy(state.bombMesh.position).add(offset);
  } else {
    state.cameraMode = 'static-wide';
    controls.enabled = false;
  }
}

function detonate() {
  const bomb = state.selectedBomb;
  const pos = state.bombMesh.position.clone();
  pos.y = 0;

  scene.remove(state.bombMesh);
  state.bombMesh = null;

  const cnt = damageCity(pos.x, pos.z, bomb.radii);

  if (state.showRings) {
    if (state.currentRings) state.currentRings = null;
    state.currentRings = spawnRings(scene, pos, bomb.radii, state.speedMult);
  }

  state.currentDust = spawnImpactDust(scene, pos, bomb.radii[0], state.speedMult);

  const isNuke = /nuclear|kiloton|megaton/i.test(bomb.tnt);
  state.currentExplosion = spawnExplosion(scene, {
    position: pos,
    radii: bomb.radii,
    tnt: parseTntValue(bomb.tnt),
    isNuke,
    onFlash: (p) => ui.triggerFlash(p)
  });

  state.cameraShake = 0.95;
  state.impactPos.copy(pos);

  if (state.cinematicEnabled) {
    ui.setStats('');
    state.phase = 'cinematic';

    state.camCineStart.copy(camera.position);
    state.camLookStart.copy(controls.target);

    const aerialHeight = Math.max(500, bomb.radii[0] * 3.5);
    state.camCineEnd.set(pos.x, aerialHeight, pos.z + aerialHeight * 0.18);
    state.camLookEnd.copy(pos);

    state.camCineT = 0;
    state.camCineDur = 0.4;
    state.cameraMode = 'impact-topdown';
    controls.enabled = false;

    startCinematicTyping(bomb, cnt, pos);
  } else {
    ui.setStats(renderStats(bomb.radii, cnt));
    ui.hideCinematic();
    state.phase = 'exploding';
    state.cameraMode = 'pullback';
    controls.enabled = false;

    setTimeout(() => {
      if (state.phase === 'exploding') {
        state.phase = 'idle';
        state.cameraMode = 'orbit';
        controls.enabled = true;
        ui.setThrowEnabled(true);
        ui.setHint(true, 'Click on the city to select a target');
      }
    }, 3200);
  }
}

function startCinematicTyping(bomb, cnt, pos) {
  const destroyed = cnt[4];
  const heavy = cnt[3];
  const moderate = cnt[2];

  const lines = [
    { text: '> STRIKE CONFIRMED',               cls: 'header' },
    { text: '> --------------------------------', cls: 'sep' },
    { text: `> WEAPON ............... ${bomb.name}` },
    { text: `> MASS ................. ${bomb.mass}` },
    { text: `> YIELD ................ ${bomb.tnt}` },
    { text: `> RELEASE ALTITUDE ..... ${state.altitude} m` },
    { text: `> BLAST RADIUS ......... ~${Math.round(bomb.radii[0])} m`, cls: 'alert' },
    { text: `> IMPACT COORDS ........ ${pos.x.toFixed(0)} , ${pos.z.toFixed(0)}` },
    { text: '> --------------------------------', cls: 'sep' },
    { text: `> BUILDINGS DESTROYED .. ${destroyed}` },
    { text: `> BUILDINGS HEAVY DAMG . ${heavy}` },
    { text: `> BUILDINGS MOD DAMG ... ${moderate}` },
    { text: '> --------------------------------', cls: 'sep' },
    { text: '> MISSION COMPLETE',                 cls: 'header' }
  ];

  ui.showCinematic(lines, {
    speed: 22,
    gap: 160,
    onComplete: () => {
      setTimeout(() => {
        ui.hideCinematic();
        state.cameraMode = 'pullback';
      }, 900);

      setTimeout(() => {
        state.phase = 'idle';
        state.cameraMode = 'orbit';
        controls.enabled = true;
        ui.setThrowEnabled(true);
        ui.setHint(true, 'Click on the city to select a target');
      }, 4200);
    }
  });
}

function parseTntValue(str) {
  if (/megaton/i.test(str)) return 50_000_000;
  if (/kiloton/i.test(str)) return 20_000;
  const m = str.match(/([\d,.]+)\s*tons?/i);
  if (m) return parseFloat(m[1].replace(/,/g, ''));
  return 1;
}

const smokePuffGeo = new THREE.SphereGeometry(1, 10, 8);

const bombSmokeGroup = new THREE.Group();
scene.add(bombSmokeGroup);

function spawnBombSmoke() {
  if (!state.bombMesh) return;
  const mat = new THREE.MeshBasicMaterial({
    color: 0xcccccc, transparent: true, opacity: 0.55, depthWrite: false
  });
  const mesh = new THREE.Mesh(smokePuffGeo, mat);
  mesh.position.copy(state.bombMesh.position);
  const scale = 1.6 + Math.random() * 1.4;
  mesh.scale.setScalar(scale);
  mesh.userData = {
    age: 0,
    life: 1.7,
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 3,
      0.6 + Math.random() * 1.2,
      (Math.random() - 0.5) * 3
    ),
    growth: 4 + Math.random() * 3
  };
  bombSmokeGroup.add(mesh);
  state.bombSmokePuffs.push(mesh);
}

function updateBombSmoke(dt) {
  for (let i = state.bombSmokePuffs.length - 1; i >= 0; i--) {
    const p = state.bombSmokePuffs[i];
    p.userData.age += dt;
    if (p.userData.age >= p.userData.life) {
      bombSmokeGroup.remove(p);
      p.material.dispose();
      state.bombSmokePuffs.splice(i, 1);
      continue;
    }
    p.position.addScaledVector(p.userData.vel, dt);
    const t = p.userData.age / p.userData.life;
    const s = p.scale.x + p.userData.growth * dt;
    p.scale.setScalar(s);
    p.material.opacity = (1 - t) * 0.55;
  }
}

const planeSmokeGroup = new THREE.Group();
scene.add(planeSmokeGroup);
const planeSmokePuffs = [];

const ENGINE_LOCAL = [
  new THREE.Vector3(-2.2, 1.42, -7.95),
  new THREE.Vector3( 2.2, 1.42, -7.95)
];

function spawnPlaneSmoke() {
  if (!state.plane || !state.plane.visible) return;
  state.plane.updateMatrixWorld();

  for (const local of ENGINE_LOCAL) {
    const world = local.clone().applyMatrix4(state.plane.matrixWorld);

    const mat = new THREE.MeshBasicMaterial({
      color: 0xf4f6fa, transparent: true, opacity: 0.0, depthWrite: false
    });
    const mesh = new THREE.Mesh(smokePuffGeo, mat);
    mesh.position.copy(world);
    const s0 = 1.2 + Math.random() * 0.7;
    mesh.scale.setScalar(s0);

    const backward = new THREE.Vector3(0, 0.1, -1).applyQuaternion(state.plane.quaternion);
    backward.multiplyScalar(8 + Math.random() * 4);

    mesh.userData = {
      age: 0,
      life: 4.5 + Math.random() * 1.5,
      vel: backward.add(new THREE.Vector3(
        (Math.random() - 0.5) * 2.2,
        0.4 + Math.random() * 0.7,
        (Math.random() - 0.5) * 2.2
      )),
      growth: 2.5 + Math.random() * 2.0,
      peakOpacity: 0.28 + Math.random() * 0.12
    };
    planeSmokeGroup.add(mesh);
    planeSmokePuffs.push(mesh);
  }
}

function updatePlaneSmoke(dt) {
  for (let i = planeSmokePuffs.length - 1; i >= 0; i--) {
    const p = planeSmokePuffs[i];
    p.userData.age += dt;
    if (p.userData.age >= p.userData.life) {
      planeSmokeGroup.remove(p);
      p.material.dispose();
      planeSmokePuffs.splice(i, 1);
      continue;
    }
    p.position.addScaledVector(p.userData.vel, dt);
    p.userData.vel.multiplyScalar(0.985);

    const t = p.userData.age / p.userData.life;

    const fadeIn  = Math.min(1, p.userData.age / 0.25);
    const fadeOut = 1 - Math.pow(t, 1.4);
    const opacity = fadeIn * fadeOut * p.userData.peakOpacity;

    const s = p.scale.x + p.userData.growth * dt;
    p.scale.setScalar(s);
    p.material.opacity = opacity;
  }
}

function clearPlaneSmoke() {
  for (const p of planeSmokePuffs) {
    planeSmokeGroup.remove(p);
    p.material.dispose();
  }
  planeSmokePuffs.length = 0;
}

const _tmpV = new THREE.Vector3();

function updateCamera(rawDt) {
  const mode = state.cameraMode;

  if (mode === 'orbit') return;

  if (mode === 'plane-cinematic' && state.plane) {
    const prevTarget = controls.target.clone();
    controls.target.lerp(state.plane.position, 0.16);
    const delta = controls.target.clone().sub(prevTarget);
    camera.position.add(delta);
    return;                                             
  }
  
  if (mode === 'bomb-follow' && state.bombMesh) {
    const prevTarget = controls.target.clone();
    controls.target.lerp(state.bombMesh.position, 0.32);
    const delta = controls.target.clone().sub(prevTarget);
    camera.position.add(delta);
    return;                                           
  }

  if (mode === 'static-wide') {
    _tmpV.copy(state.target).add(new THREE.Vector3(180, 160, 220));
    camera.position.lerp(_tmpV, 0.04);
    controls.target.lerp(state.target, 0.06);
    return;
  }

  if (mode === 'impact-topdown') {
    state.camCineT += rawDt / state.camCineDur;
    const p = Math.min(1, state.camCineT);
    const e = 1 - Math.pow(1 - p, 3);
    camera.position.lerpVectors(state.camCineStart, state.camCineEnd, e);
    controls.target.lerpVectors(state.camLookStart, state.camLookEnd, e);

    if (p >= 1) {
      const t = performance.now() / 1000;
      const radius = state.camCineEnd.y * 0.18;
      camera.position.x = state.impactPos.x + Math.sin(t * 0.35) * radius;
      camera.position.z = state.impactPos.z + Math.cos(t * 0.35) * radius;
      camera.position.y = state.camCineEnd.y + Math.sin(t * 0.2) * 30;
      controls.target.copy(state.impactPos);
    }
    return;
  }

  if (mode === 'pullback') {
    const dir = camera.position.clone().sub(state.impactPos).normalize();
    _tmpV.copy(state.impactPos).add(dir.multiplyScalar(420));
    _tmpV.y = Math.max(260, _tmpV.y);
    camera.position.lerp(_tmpV, 0.035);
    controls.target.lerp(state.impactPos, 0.05);
    return;
  }
}

const clock = new THREE.Clock();
let elapsed = 0;

function animate() {
  requestAnimationFrame(animate);
  const rawDt = Math.min(clock.getDelta(), 0.05);
  elapsed += rawDt;
  const simDt = rawDt * state.speedMult;

  if (state.phase === 'flying' && state.plane) {
    state.planeProgress += state.planeSpeed * simDt;
    const p = Math.min(1, state.planeProgress / state.planeTotalDist);
    state.plane.position.copy(state.planeStart.clone().lerp(state.planeEnd, p));
    state.plane.rotation.z = Math.sin(elapsed * 1.4) * 0.025;
    state.plane.rotation.x = Math.sin(elapsed * 0.9) * 0.012;
    if (p >= 1) dropBomb();
  }

  if ((state.phase === 'bombing' || state.phase === 'cinematic' || state.phase === 'exploding')
      && state.plane && state.plane.visible) {
    state.plane.position.z += state.planeSpeed * simDt;
    const dist = state.plane.position.distanceTo(state.planeEnd);
    if (dist > 3200) {
      state.plane.visible = false;
      clearPlaneSmoke();
    }
  }

  if (state.plane.visible) {
    state.planeContrailTimer -= rawDt;
    if (state.planeContrailTimer <= 0) {
      spawnPlaneSmoke();
      state.planeContrailTimer = 0.045;
    }
  }
  updatePlaneSmoke(rawDt);

  if (state.phase === 'bombing' && state.bombMesh) {
    const dt = simDt * state.bombTimeMult;
    state.bombVel.y -= 9.81 * dt;
    state.bombMesh.position.addScaledVector(state.bombVel, dt);

    state.bombTumble += dt;
    const stab = Math.min(1, state.bombTumble / 1.2);
    const pitchTarget = -Math.atan2(
      -state.bombVel.y,
      Math.hypot(state.bombVel.x, state.bombVel.z)
    ) * 0.85;
    const wobble = (1 - stab) * Math.sin(state.bombTumble * 7) * 1.6;
    state.bombMesh.rotation.x = pitchTarget + wobble;
    state.bombMesh.rotation.z = (1 - stab) * Math.sin(state.bombTumble * 5) * 0.8;
    state.bombMesh.rotation.y = (1 - stab) * Math.cos(state.bombTumble * 6) * 0.5;

    state.bombSmokeTimers.next -= rawDt;
    if (state.bombSmokeTimers.next <= 0 && state.altitude > 200) {
      spawnBombSmoke();
      state.bombSmokeTimers.next = 0.04;
    }

    if (state.bombMesh.position.y <= 0.6) {
      state.bombMesh.position.y = 0.6;
      detonate();
    }
  }

  updateBombSmoke(rawDt);

  if (state.currentExplosion) {
    state.currentExplosion.update(rawDt, state.speedMult);
    if (state.currentExplosion.done) state.currentExplosion = null;
  }
  if (state.currentRings) {
    if (!state.currentRings.update()) state.currentRings = null;
  }
  if (state.currentDust) {
    if (!state.currentDust.update()) state.currentDust = null;
  }

  if (targetMarker.visible) {
    const pulse = 1 + Math.sin(elapsed * 4) * 0.18;
    targetMarker.userData.ring.scale.setScalar(pulse);
    targetMarker.userData.ringMat.opacity = 0.4 + Math.sin(elapsed * 4) * 0.25;
    targetMarker.userData.beamMat.opacity = 0.45 + Math.sin(elapsed * 6) * 0.2;
  }

  if (state.plane.visible) {
    updateB2(state.plane, rawDt, elapsed, { throttle: 1 });
  }

  updateCamera(rawDt);

  if (state.cameraShake > 0) {
    const shake = state.cameraShake * 6;
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
    camera.position.z += (Math.random() - 0.5) * shake;
    state.cameraShake *= Math.pow(0.002, rawDt);
    if (state.cameraShake < 0.004) state.cameraShake = 0;
  }

  controls.update();
  renderer.render(scene, camera);
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

setTimeout(() => ui.setLoaderHidden(), 450);
animate();