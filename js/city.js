import * as THREE from 'three';

const CITY_SIZE = 4200;
const GRID = 46;
const BLOCK = CITY_SIZE / GRID;

export const city = {
  group: null,
  instanced: null,
  damageTex: null,
  canvas: null,
  ctx: null,
  buildingData: [],
  stateCount: [0, 0, 0, 0, 0]
};

export function buildCity(scene) {
  city.group = new THREE.Group();
  scene.add(city.group);

  const groundGeo = new THREE.PlaneGeometry(CITY_SIZE * 3, CITY_SIZE * 3);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x556070, roughness: 0.95, metalness: 0.0
  });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  city.group.add(ground);

  const streetMat = new THREE.MeshStandardMaterial({
    color: 0x2a3038, roughness: 0.92, metalness: 0.02
  });
  const streets = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE * 2.6, CITY_SIZE * 2.6),
    streetMat
  );
  streets.rotation.x = -Math.PI / 2;
  streets.position.y = 0.01;
  city.group.add(streets);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  boxGeo.translate(0, 0.5, 0);

  const maxInstances = GRID * GRID;
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.55,
    metalness: 0.28,
    emissive: 0x0a0d14,
    emissiveIntensity: 0.08
  });

  city.instanced = new THREE.InstancedMesh(boxGeo, mat, maxInstances);
  city.instanced.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  city.instanced.castShadow = true;
  city.instanced.receiveShadow = true;

  const colorAttr = new THREE.InstancedBufferAttribute(
    new Float32Array(maxInstances * 3), 3
  );
  city.instanced.instanceColor = colorAttr;

  city.buildingData = [];
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  let idx = 0;
  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const cx = (i - GRID / 2 + 0.5) * BLOCK;
      const cz = (j - GRID / 2 + 0.5) * BLOCK;

      if ((i === 12 && j === 12) || (i === 32 && j === 30)) continue;

      const distToCenter = Math.hypot(i - GRID/2, j - GRID/2) / (GRID/2);
      const centerBoost = Math.max(0, 1 - distToCenter) ** 2;

      const w = BLOCK * (0.42 + Math.random() * 0.22);
      const d = BLOCK * (0.42 + Math.random() * 0.22);
      const baseH = 20 + Math.random() * 55;
      const h = baseH + centerBoost * (110 + Math.random() * 170);

      dummy.position.set(cx, 0, cz);
      dummy.scale.set(w, h, d);
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      city.instanced.setMatrixAt(idx, dummy.matrix);

      const t = Math.random();
      if (t < 0.5) {
        color.setHSL(0.58, 0.10, 0.62 + Math.random() * 0.12);
      } else if (t < 0.8) {
        color.setHSL(0.09, 0.14, 0.66 + Math.random() * 0.10);
      } else {
        color.setHSL(0.55, 0.20, 0.68 + Math.random() * 0.12);
      }
      city.instanced.setColorAt(idx, color);

      city.buildingData.push({
        i: idx, x: cx, z: cz,
        w, d, h,
        baseColor: color.clone(),
        state: 0
      });
      idx++;
    }
  }
  city.instanced.count = idx;
  city.instanced.instanceMatrix.needsUpdate = true;
  if (city.instanced.instanceColor) city.instanced.instanceColor.needsUpdate = true;
  city.group.add(city.instanced);

  const cnvSize = 2048;
  const cnv = document.createElement('canvas');
  cnv.width = cnv.height = cnvSize;
  const ctx = cnv.getContext('2d');
  ctx.clearRect(0, 0, cnvSize, cnvSize);
  const tex = new THREE.CanvasTexture(cnv);
  tex.anisotropy = 8;

  const markMat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, depthWrite: false
  });
  const markMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CITY_SIZE, CITY_SIZE), markMat
  );
  markMesh.rotation.x = -Math.PI / 2;
  markMesh.position.y = 0.05;
  city.group.add(markMesh);

  city.canvas = cnv; city.ctx = ctx; city.damageTex = tex;

  city.stateCount = [city.buildingData.length, 0, 0, 0, 0];

  return city.group;
}

function worldToCanvas(x, z) {
  const u = (x / CITY_SIZE) + 0.5;
  const v = (z / CITY_SIZE) + 0.5;
  return [u * city.canvas.width, v * city.canvas.height];
}

export function resetCity() {
  const { instanced, buildingData } = city;
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  for (const b of buildingData) {
    b.state = 0;
    dummy.position.set(b.x, 0, b.z);
    dummy.scale.set(b.w, b.h, b.d);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    instanced.setMatrixAt(b.i, dummy.matrix);
    instanced.setColorAt(b.i, c.copy(b.baseColor));
  }
  instanced.instanceMatrix.needsUpdate = true;
  instanced.instanceColor.needsUpdate = true;
  city.stateCount = [buildingData.length, 0, 0, 0, 0];

  city.ctx.clearRect(0, 0, city.canvas.width, city.canvas.height);
  city.damageTex.needsUpdate = true;
}

export function damageCity(x, z, radii) {
  const [r0, r1, r2, r3] = radii;
  const dummy = new THREE.Object3D();
  const c = new THREE.Color();
  const { instanced, buildingData } = city;

  for (const b of buildingData) {
    const d = Math.hypot(b.x - x, b.z - z);
    let newState = b.state;

    if (d < r0) newState = Math.max(newState, 4);
    else if (d < r1) newState = Math.max(newState, 3);
    else if (d < r2) newState = Math.max(newState, 2);
    else if (d < r3) newState = Math.max(newState, 1);

    if (newState === b.state) continue;
    b.state = newState;

    let hMul = 1, wMul = 1, tiltX = 0, tiltZ = 0, yOff = 0;
    if (newState === 1) hMul = 1;
    if (newState === 2) { hMul = 0.70; wMul = 1.02; }
    if (newState === 3) {
      hMul = 0.32; wMul = 1.08;
      tiltX = (Math.random() - .5) * .10;
      tiltZ = (Math.random() - .5) * .10;
      yOff = -hMul * 2;
    }
    if (newState === 4) {
      hMul = 0.06; wMul = 1.18;
      tiltX = (Math.random() - .5) * .28;
      tiltZ = (Math.random() - .5) * .28;
    }

    dummy.position.set(
      b.x + (Math.random() - .5) * (newState >= 3 ? 3 : 0),
      yOff,
      b.z + (Math.random() - .5) * (newState >= 3 ? 3 : 0)
    );
    dummy.scale.set(b.w * wMul, b.h * hMul, b.d * wMul);
    dummy.rotation.set(tiltX, 0, tiltZ);
    dummy.updateMatrix();
    instanced.setMatrixAt(b.i, dummy.matrix);

    const base = b.baseColor.clone();
    if (newState === 1) base.lerp(new THREE.Color(0x9fc8ff), 0.15);
    if (newState === 2) base.lerp(new THREE.Color(0x5a4a38), 0.35);
    if (newState === 3) base.lerp(new THREE.Color(0x2a2018), 0.62);
    if (newState === 4) base.lerp(new THREE.Color(0x0a0806), 0.88);
    instanced.setColorAt(b.i, base);
  }

  instanced.instanceMatrix.needsUpdate = true;
  instanced.instanceColor.needsUpdate = true;

  const ctx = city.ctx;
  const [px, py] = worldToCanvas(x, z);
  const pxPerMeter = city.canvas.width / CITY_SIZE;
  const R = r0 * pxPerMeter;

  const g1 = ctx.createRadialGradient(px, py, R * 0.1, px, py, R * 2.2);
  g1.addColorStop(0, 'rgba(0,0,0,0.95)');
  g1.addColorStop(0.35, 'rgba(20,10,5,0.75)');
  g1.addColorStop(0.75, 'rgba(40,25,15,0.28)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(px, py, R * 2.2, 0, Math.PI * 2); ctx.fill();

  const g2 = ctx.createRadialGradient(px, py, 0, px, py, R);
  g2.addColorStop(0, 'rgba(255,200,130,0.55)');
  g2.addColorStop(0.4, 'rgba(60,20,5,0.85)');
  g2.addColorStop(1, 'rgba(0,0,0,0.95)');
  ctx.fillStyle = g2;
  ctx.beginPath(); ctx.arc(px, py, R, 0, Math.PI * 2); ctx.fill();

  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = Math.random() * R * 2.1;
    ctx.fillStyle =
      `rgba(${20 + Math.random()*50|0},${15 + Math.random()*35|0},${10 + Math.random()*25|0},${0.4+Math.random()*0.5})`;
    ctx.beginPath();
    ctx.arc(px + Math.cos(a) * rr, py + Math.sin(a) * rr,
      1 + Math.random() * 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  city.damageTex.needsUpdate = true;

  const sc = [0, 0, 0, 0, 0];
  for (const b of buildingData) sc[b.state]++;
  city.stateCount = sc;
  return sc;
}