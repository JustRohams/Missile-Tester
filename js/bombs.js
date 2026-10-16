import * as THREE from 'three';

export const BOMBS = [
  { id:'mk84',   name:'MK-84 General Purpose',
    mass:'925 kg', explosive:'Tritonal (429 kg)', tnt:'~1.1 tons',
    pen:'2 m concrete',
    radii:[24, 46, 82, 140], model:'mk84', color:0x4b6b3a, length:3.8, radius:0.23 },

  { id:'daisy',  name:'BLU-82 Daisy Cutter',
    mass:'6,800 kg', explosive:'Ammonium Nitrate / Al (5,700 kg)', tnt:'~7 tons',
    pen:'5 m soil',
    radii:[70, 130, 240, 400], model:'daisy', color:0x3a4a2c, length:5.7, radius:0.45 },

  { id:'moab',   name:'GBU-43/B MOAB',
    mass:'9,800 kg', explosive:'H-6 (8,500 kg)', tnt:'~11 tons',
    pen:'10 m soil',
    radii:[95, 175, 320, 540], model:'moab', color:0x525c3a, length:9.1, radius:0.52 },

  { id:'mop',    name:'GBU-57 MOP',
    mass:'13,600 kg', explosive:'AFX-757 (2,400 kg)', tnt:'~110 tons',
    pen:'60 m reinforced concrete',
    radii:[60, 120, 240, 420], model:'mop', color:0x2b2f36, length:6.2, radius:0.4 },

  { id:'littleboy', name:'Little Boy (Mk-I)',
    mass:'4,400 kg', explosive:'Uranium-235 gun-type', tnt:'~15 kilotons',
    pen:'Air-burst 580 m',
    radii:[380, 750, 1400, 2400], model:'bigboy', color:0x3d3d40, length:3.0, radius:0.35 },

  { id:'fatman', name:'Fat Man (Mk-III)',
    mass:'4,600 kg', explosive:'Plutonium-239 implosion', tnt:'~21 kilotons',
    pen:'Air-burst 500 m',
    radii:[450, 900, 1650, 2800], model:'fatman', color:0x5a5548, length:3.25, radius:0.76 },

  { id:'b61',    name:'B61-12 Tactical Nuclear',
    mass:'825 kg', explosive:'Thermonuclear variable yield', tnt:'~50 kilotons',
    pen:'Earth-penetrating',
    radii:[700, 1400, 2600, 4400], model:'nuclear', color:0x23272e, length:3.58, radius:0.17 },

  { id:'tsar',   name:'Tsar Bomba (AN-602)',
    mass:'27,000 kg', explosive:'Thermonuclear 3-stage', tnt:'~50 megatons',
    pen:'Air-burst 4 km',
    radii:[3500, 7000, 14000, 24000], model:'tsar', color:0x2a2a2c, length:8, radius:1.05 }
];

export function getBomb(id) {
  return BOMBS.find(b => b.id === id) || BOMBS[0];
}

export function createBombModel(def) {
  const g = new THREE.Group();
  const L = def.length, R = def.radius;

  const mat = new THREE.MeshStandardMaterial({
    color: def.color, roughness: 0.62, metalness: 0.45,
    flatShading: false
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x111317, roughness: 0.75, metalness: 0.3
  });
  const noseMat = new THREE.MeshStandardMaterial({
    color: 0x2a2c30, roughness: 0.4, metalness: 0.7
  });

  switch (def.model) {
    case 'mop':
    case 'nuclear':
      buildCylinder(g, L, R, mat, noseMat, darkMat, 0.55);
      break;
    case 'moab':
    case 'daisy':
      buildCylinder(g, L, R, mat, noseMat, darkMat, 0.32, true);
      break;
    case 'mk84':
      buildTeardrop(g, L, R, mat, noseMat, darkMat);
      break;
    case 'fatman':
      buildFatMan(g, L, R, mat, noseMat, darkMat);
      break;
    case 'bigboy':
    case 'tsar':
      buildLong(g, L, R, mat, noseMat, darkMat);
      break;
  }

  g.rotation.x = 0;
  return g;
}

function buildCylinder(g, L, R, mat, noseMat, darkMat, noseRatio=0.3, gridFins=false) {
  const bodyLen = L * (1 - noseRatio);
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, bodyLen, 20),
    mat
  );
  body.rotation.x = Math.PI / 2;
  body.position.z = -bodyLen / 2 + R;
  g.add(body);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.05, R, L * noseRatio, 20),
    noseMat
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = bodyLen / 2 - R + (L * noseRatio) / 2 - R;
  nose.position.z = -R + bodyLen + (L * noseRatio) / 2;
  g.add(nose);

  const finCount = gridFins ? 4 : 4;
  for (let i = 0; i < finCount; i++) {
    const fin = makeFin(R * 1.8, L * 0.2, darkMat);
    fin.rotation.z = (i / finCount) * Math.PI * 2;
    fin.position.z = -L / 2 + R + 0.2;
    g.add(fin);
  }

  for (const z of [-bodyLen * 0.25, bodyLen * 0.15]) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.02, R * 1.02, L * 0.03, 20),
      darkMat
    );
    band.rotation.x = Math.PI / 2;
    band.position.z = z;
    g.add(band);
  }
}

function buildTeardrop(g, L, R, mat, noseMat, darkMat) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.7, R, L * 0.75, 20),
    mat
  );
  body.rotation.x = Math.PI / 2;
  body.position.z = -L * 0.05;
  g.add(body);

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.75, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    noseMat
  );
  nose.rotation.x = Math.PI / 2;
  nose.position.z = L * 0.32;
  g.add(nose);

  for (let i = 0; i < 4; i++) {
    const fin = makeFin(R * 2.2, L * 0.18, darkMat);
    fin.rotation.z = (i / 4) * Math.PI * 2;
    fin.position.z = -L / 2 + R;
    g.add(fin);
  }
}

function buildFatMan(g, L, R, mat, noseMat, darkMat) {
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(R, 22, 16),
    mat
  );
  body.scale.set(1, 1, 1.35);
  g.add(body);

  for (let i = 0; i < 4; i++) {
    const fin = makeBoxFin(R * 1.9, L * 0.3, darkMat);
    fin.rotation.z = (i / 4) * Math.PI * 2;
    fin.position.z = -R * 0.9;
    g.add(fin);
  }
}

function buildLong(g, L, R, mat, noseMat, darkMat) {
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R * 0.9, L * 0.85, 22),
    mat
  );
  body.rotation.x = Math.PI / 2;
  body.position.z = -L * 0.02;
  g.add(body);

  const nose = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 0.15, R, L * 0.15, 22),
    noseMat
  );
  nose.rotation.x = -Math.PI / 2;
  nose.position.z = L * 0.4;
  g.add(nose);

  for (let i = 0; i < 4; i++) {
    const fin = makeFin(R * 2.3, L * 0.2, darkMat);
    fin.rotation.z = (i / 4) * Math.PI * 2;
    fin.position.z = -L * 0.36;
    g.add(fin);
  }
}

function makeFin(h, d, mat) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(d, 0);
  shape.lineTo(d * 0.7, h);
  shape.lineTo(d * 0.15, h * 0.95);
  shape.lineTo(0, h * 0.2);
  shape.lineTo(0, 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false });
  const m = new THREE.Mesh(geo, mat);
  m.position.x = 0;
  m.rotation.y = Math.PI / 2;
  return m;
}

function makeBoxFin(h, d, mat) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(d, 0.06, h),
    mat
  );
  m.position.y = h * 0.5;
  return m;
}