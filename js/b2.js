import * as THREE from 'three';

export function createB2() {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2c3038, roughness: 0.52, metalness: 0.62
  });
  const upperMat = new THREE.MeshStandardMaterial({
    color: 0x363b45, roughness: 0.48, metalness: 0.58
  });
  const lowerMat = new THREE.MeshStandardMaterial({
    color: 0x1e2127, roughness: 0.58, metalness: 0.55
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0d1015, roughness: 0.35, metalness: 0.72
  });
  const panelMat = new THREE.MeshStandardMaterial({
    color: 0x1a1e25, roughness: 0.48, metalness: 0.66
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x05101c, roughness: 0.04, metalness: 0.96,
    emissive: 0x132435, emissiveIntensity: 0.7
  });
  const sensorMat = new THREE.MeshStandardMaterial({
    color: 0x15181d, roughness: 0.25, metalness: 0.9
  });

  const shape = new THREE.Shape();
  shape.moveTo(0, 10.6);                                   // nose tip
  shape.bezierCurveTo( 3.0,  9.2, 10.0,  3.0, 24.0, -5.8); // right LE
  shape.lineTo( 19.0, -7.9);                               // outer sawtooth
  shape.lineTo( 12.0, -6.7);
  shape.lineTo(  4.2, -9.4);                               // inner sawtooth
  shape.lineTo(  0.0, -8.5);                               // center notch
  shape.lineTo( -4.2, -9.4);
  shape.lineTo(-12.0, -6.7);
  shape.lineTo(-19.0, -7.9);
  shape.lineTo(-24.0, -5.8);                               // left wingtip
  shape.bezierCurveTo(-10.0, 3.0, -3.0, 9.2, 0, 10.6);     // left LE

  const bodyGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 1.45,
    bevelEnabled: true,
    bevelThickness: 0.55,
    bevelSize: 0.75,
    bevelOffset: 0,
    bevelSegments: 5,
    curveSegments: 6
  });
  bodyGeo.rotateX(-Math.PI / 2);
  bodyGeo.translate(0, 1.0, 0);
  bodyGeo.computeVertexNormals();

  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.castShadow = true;
  body.receiveShadow = true;
  g.add(body);

  {
    const panelShape = new THREE.Shape();
    panelShape.moveTo(0, 8.8);
    panelShape.bezierCurveTo(2.5, 7.6, 8.5, 2.2, 17.0, -3.6);
    panelShape.lineTo(11.0, -5.2);
    panelShape.lineTo(0, -4.8);
    panelShape.lineTo(-11.0, -5.2);
    panelShape.lineTo(-17.0, -3.6);
    panelShape.bezierCurveTo(-8.5, 2.2, -2.5, 7.6, 0, 8.8);

    const panelGeo = new THREE.ExtrudeGeometry(panelShape, {
      depth: 0.14, bevelEnabled: true,
      bevelThickness: 0.05, bevelSize: 0.06,
      bevelSegments: 2, curveSegments: 4
    });
    panelGeo.rotateX(-Math.PI / 2);
    panelGeo.translate(0, 1.82, 0);
    const panelMesh = new THREE.Mesh(panelGeo, upperMat);
    panelMesh.castShadow = true;
    g.add(panelMesh);
  }

  {
    const shellGeo = new THREE.SphereGeometry(2.05, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    shellGeo.scale(1, 0.52, 1.55);
    const shell = new THREE.Mesh(shellGeo, panelMat);
    shell.position.set(0, 1.85, 6.3);
    shell.castShadow = true;
    g.add(shell);
  }
  {
    const winGeo = new THREE.BoxGeometry(0.82, 0.28, 0.9);
    for (let i = 0; i < 4; i++) {
      const x = -1.35 + i * 0.9;
      const w = new THREE.Mesh(winGeo, glassMat);
      w.position.set(x, 2.18, 6.55);
      w.rotation.x = -0.22;
      g.add(w);
    }
    const sepGeo = new THREE.BoxGeometry(0.06, 0.32, 0.94);
    for (let i = 0; i < 3; i++) {
      const x = -0.9 + i * 0.9;
      const s = new THREE.Mesh(sepGeo, darkMat);
      s.position.set(x, 2.19, 6.55);
      s.rotation.x = -0.22;
      g.add(s);
    }
  }

  for (const sx of [-2.35, 2.35]) {
    const shape2 = new THREE.Shape();
    shape2.moveTo(-0.9,  0.55);
    shape2.lineTo( 0.9,  0.65);
    shape2.lineTo( 0.75, -0.55);
    shape2.lineTo(-0.75, -0.55);
    shape2.lineTo(-0.9,  0.55);
    const geo2 = new THREE.ExtrudeGeometry(shape2, {
      depth: 0.55, bevelEnabled: false
    });
    geo2.rotateX(-Math.PI / 2);
    const intake = new THREE.Mesh(geo2, darkMat);
    intake.position.set(sx, 1.75, -0.6);
    g.add(intake);

    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(1.85, 0.22, 1.25),
      panelMat
    );
    lip.position.set(sx, 1.72, -0.6);
    g.add(lip);
  }

  {
    const bay = new THREE.Mesh(
      new THREE.BoxGeometry(6.6, 0.35, 1.6),
      darkMat
    );
    bay.position.set(0, 1.35, -7.2);
    g.add(bay);

    for (const sx of [-2.2, 2.2]) {
      const ex = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.55, 0.35),
        new THREE.MeshBasicMaterial({ color: 0x1b1d22 })
      );
      ex.position.set(sx, 1.42, -7.85);
      g.add(ex);
    }
  }

  {
    const lineMat = new THREE.MeshBasicMaterial({ color: 0x181b20 });
    for (const z of [4.0, 1.5, -1.0, -3.5]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(28, 0.02, 0.055),
        lineMat
      );
      strip.position.set(0, 1.79, z);
      g.add(strip);
    }
    for (const x of [-6, 0, 6]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.02, 12),
        lineMat
      );
      strip.position.set(x, 1.79, 0);
      g.add(strip);
    }
    for (const sx of [-14, 14]) {
      const strip = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.02, 0.05),
        lineMat
      );
      strip.position.set(sx, 1.72, -3.5);
      g.add(strip);
    }
  }

  {
    const sensor = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 0.22, 0.55),
      sensorMat
    );
    sensor.position.set(0, 1.55, 9.4);
    g.add(sensor);

    const pitot = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6),
      sensorMat
    );
    pitot.rotation.x = Math.PI / 2;
    pitot.position.set(0, 1.55, 10.5);
    g.add(pitot);
  }

  for (const [x, z, s] of [[-5, -2, 0.28], [5, -2, 0.28], [0, 1.5, 0.34]]) {
    const bump = new THREE.Mesh(
      new THREE.SphereGeometry(s, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      panelMat
    );
    bump.position.set(x, 1.78, z);
    g.add(bump);
  }

  const navL = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff2020, transparent: true })
  );
  navL.position.set(-23.6, 1.15, -4.8);
  g.add(navL);

  const navR = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0x20ff40, transparent: true })
  );
  navR.position.set(23.6, 1.15, -4.8);
  g.add(navR);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xfff2c8, transparent: true })
  );
  beacon.position.set(0, 2.05, 2.5);
  g.add(beacon);

  g.userData.navLights = [navL, navR];
  g.userData.beacon = beacon;

  const exhaustGlowMat = new THREE.MeshBasicMaterial({
    color: 0xff9a3a, transparent: true, opacity: 0.0,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const exhausts = [];
  for (const sx of [-2.2, 2.2]) {
    const e = new THREE.Mesh(new THREE.CircleGeometry(0.85, 20), exhaustGlowMat);
    e.rotation.x = Math.PI / 2;
    e.position.set(sx, 1.42, -7.95);
    g.add(e);
    exhausts.push(e);
  }
  g.userData.exhaustGlowMat = exhaustGlowMat;
  g.userData.exhausts = exhausts;

  const contrailGroup = new THREE.Group();
  const contrailMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.24,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  for (const sx of [-2.2, 2.2]) {
    const trail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 1.6, 70, 10, 1, true),
      contrailMat.clone()
    );
    trail.rotation.x = Math.PI / 2;
    trail.position.set(sx, 1.42, -43);
    contrailGroup.add(trail);
  }
  g.add(contrailGroup);
  g.userData.contrailGroup = contrailGroup;

  return g;
}

export function updateB2(b2, dt, t, opts) {
  const { exhaustGlowMat, navLights, exhausts, contrailGroup, beacon } = b2.userData;

  const pulse = 0.35 + Math.sin(t * 22) * 0.12 + Math.random() * 0.06;
  exhaustGlowMat.opacity = pulse * (opts.throttle ?? 1);
  for (const e of exhausts) e.scale.setScalar(0.85 + pulse * 0.4);

  const blink = (Math.sin(t * 4) > 0.3) ? 1 : 0.15;
  if (navLights) {
    navLights[0].material.opacity = blink;
    navLights[1].material.opacity = blink;
  }
  if (beacon) {
    beacon.material.opacity = (Math.sin(t * 6) > 0.7) ? 1 : 0.1;
  }

  if (contrailGroup) {
    contrailGroup.children.forEach((c, i) => {
      c.material.opacity = 0.20 + Math.sin(t * 3 + i) * 0.06;
    });
  }
}