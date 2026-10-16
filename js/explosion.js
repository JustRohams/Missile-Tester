import * as THREE from 'three';

export function spawnExplosion(scene, opts) {
  const { position, radii, tnt, isNuke, onFlash } = opts;

  const group = new THREE.Group();
  group.position.copy(position);
  scene.add(group);

  const [r0] = radii;
  const R = Math.max(r0, 20);

  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const flash = new THREE.Mesh(new THREE.SphereGeometry(R * 1.1, 22, 16), flashMat);
  flash.position.y = R * 0.4;
  group.add(flash);

  if (onFlash) onFlash(Math.min(1, Math.log10(tnt + 1) / 3));

  const fireMat = new THREE.MeshBasicMaterial({
    color: 0xffb84a, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const fireball = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), fireMat);
  fireball.position.y = R * 0.6;
  group.add(fireball);

  const coreMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c8, transparent: true, opacity: 1,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 18), coreMat);
  core.position.copy(fireball.position);
  group.add(core);

  const shockMat = new THREE.MeshBasicMaterial({
    color: 0xffd9a0, transparent: true, opacity: 0.9,
    side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false
  });
  const shockwave = new THREE.Mesh(
    new THREE.RingGeometry(0.9, 1.0, 96), shockMat
  );
  shockwave.rotation.x = -Math.PI / 2;
  shockwave.position.y = 0.35;
  group.add(shockwave);

  const stemMat = new THREE.MeshStandardMaterial({
    color: 0x6b5844, roughness: 1, metalness: 0,
    transparent: true, opacity: 0.9
  });
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(1, 1.4, 1, 22, 1, true),
    stemMat
  );
  group.add(stem);

  const capMat = new THREE.MeshStandardMaterial({
    color: 0x7a6850, roughness: 1, metalness: 0,
    transparent: true, opacity: 0.9
  });
  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 20, 0, Math.PI * 2, 0, Math.PI / 2),
    capMat
  );
  cap.scale.y = 0.5;
  group.add(cap);

  const light = new THREE.PointLight(0xffaa66, 0, 4000, 1);
  light.position.set(0, R * 0.8, 0);
  group.add(light);

  const debrisCount = Math.min(180, 40 + Math.floor(Math.log10(tnt + 1) * 40));
  const debrisGeo = new THREE.BoxGeometry(1, 1, 1);
  const debrisMat = new THREE.MeshStandardMaterial({ color: 0x2b2620, roughness: 0.9 });
  const debris = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
  debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  group.add(debris);

  const debrisData = [];
  for (let i = 0; i < debrisCount; i++) {
    const ang = Math.random() * Math.PI * 2;
    const up = Math.random() * 0.6 + 0.4;
    const speed = (0.4 + Math.random() * 0.9) * R * 0.9;
    debrisData.push({
      pos: new THREE.Vector3(0, 1, 0),
      vel: new THREE.Vector3(
        Math.cos(ang) * speed,
        up * speed,
        Math.sin(ang) * speed
      ),
      rot: new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3),
      rotSpeed: new THREE.Vector3(
        (Math.random() - .5) * 8,
        (Math.random() - .5) * 8,
        (Math.random() - .5) * 8
      ),
      size: 0.5 + Math.random() * 1.8
    });
  }

  const smokeCount = isNuke ? 90 : 42;
  const smokeGeo = new THREE.SphereGeometry(1, 12, 10);
  const smokeGroup = new THREE.Group();
  group.add(smokeGroup);

  const smokePuffs = [];
  for (let i = 0; i < smokeCount; i++) {
    const m = new THREE.Mesh(smokeGeo, new THREE.MeshBasicMaterial({
      color: 0x1a1410, transparent: true, opacity: 0.55, depthWrite: false
    }));
    m.userData = {
      age: -Math.random() * 1.2,
      life: 0.6 + Math.random() * 0.4,
      delay: Math.random() * 1.4,
      vel: new THREE.Vector3(
        (Math.random() - .5) * R * 0.35,
        R * (0.15 + Math.random() * 0.55),
        (Math.random() - .5) * R * 0.35
      ),
      targetSize: R * (0.5 + Math.random() * 1.3) * (isNuke ? 1.4 : 1)
    };
    m.position.set(
      (Math.random() - .5) * R * 0.5,
      Math.random() * R * 0.3,
      (Math.random() - .5) * R * 0.5
    );
    m.scale.setScalar(0.001);
    smokeGroup.add(m);
    smokePuffs.push(m);
  }

  const startTime = performance.now() / 1000;
  const totalLife = isNuke ? 8.0 : 5.0;

  const flashDur  = 0.14;
  const fireDur   = 1.20;
  const shockDur  = 0.90;
  const stemStart = 0.30, stemDur = 2.90;
  const capStart  = 0.80, capDur  = 3.70;
  const debrisDur = 2.20;

  const capTargetR   = R * (isNuke ? 2.4 : 1.8);
  const stemTargetH  = R * (isNuke ? 3.5 : 2.2);
  const stemTargetR  = R * (isNuke ? 0.9 : 0.7);

  let done = false;
  const api = { group, update, get done() { return done; } };

  function update(dt, timeScale = 1) {
    if (done) return;
    const t = (performance.now() / 1000 - startTime) * timeScale;

    const fp = Math.min(1, t / flashDur);
    flashMat.opacity = 1 - fp;
    flash.scale.setScalar(1 + fp * 3);
    flash.visible = fp < 1;

    const lightP = Math.max(0, 1 - t / 0.9);
    light.intensity = lightP * (isNuke ? 900 : 300) * (1 + Math.random() * 0.2);
    light.distance = R * 12;

    const fbp = Math.min(1, t / fireDur);
    const ease = 1 - Math.pow(1 - fbp, 2.2);
    const fsize = R * (0.35 + ease * 1.15);
    fireball.scale.setScalar(fsize);
    core.scale.setScalar(fsize * 0.55);
    fireMat.color.setHSL(
      THREE.MathUtils.lerp(0.08, 0.02, fbp),
      THREE.MathUtils.lerp(0.95, 0.85, fbp),
      THREE.MathUtils.lerp(0.62, 0.25, fbp)
    );
    fireMat.opacity = Math.max(0, 1 - Math.pow(fbp, 1.6));
    coreMat.opacity = Math.max(0, 1 - fbp * 1.3);
    fireball.visible = fbp < 1;
    core.visible = fbp < 0.7;

    const sp = Math.min(1, t / shockDur);
    const shockR = R * (0.4 + sp * 3.2);
    shockwave.scale.setScalar(shockR);
    shockMat.opacity = Math.max(0, (1 - sp) * 0.95);
    shockwave.visible = sp < 1;

    if (t > stemStart) {
      const mp = Math.min(1, (t - stemStart) / stemDur);
      const mpE = 1 - Math.pow(1 - mp, 2);
      stem.scale.set(stemTargetR * mpE, stemTargetH * mpE, stemTargetR * mpE);
      stem.position.y = (stemTargetH * mpE) / 2;
      stem.material.opacity = Math.min(0.85, mpE * 0.9);
      stem.visible = mp < 1;
    }

    if (t > capStart) {
      const cp = Math.min(1, (t - capStart) / capDur);
      const cpE = 1 - Math.pow(1 - cp, 1.8);
      cap.scale.set(capTargetR * cpE, capTargetR * 0.5 * cpE, capTargetR * cpE);
      cap.position.y = stemTargetH * Math.min(1, cpE * 1.15);
      cap.material.opacity = Math.min(0.85, cpE * 0.9);
      cap.visible = cp < 1;
    }

    if (t < debrisDur) {
      const gravity = 9.81 * 0.35;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < debrisCount; i++) {
        const d = debrisData[i];
        d.vel.y -= gravity * dt * 2.2;
        d.pos.addScaledVector(d.vel, dt * 1.6);
        if (d.pos.y < 0.4) { d.pos.y = 0.4; d.vel.set(0, 0, 0); }
        d.rot.x += d.rotSpeed.x * dt;
        d.rot.y += d.rotSpeed.y * dt;
        d.rot.z += d.rotSpeed.z * dt;
        dummy.position.copy(d.pos);
        dummy.rotation.copy(d.rot);
        const fade = 1 - t / debrisDur;
        dummy.scale.setScalar(d.size * Math.max(0.05, fade));
        dummy.updateMatrix();
        debris.setMatrixAt(i, dummy.matrix);
      }
      debris.instanceMatrix.needsUpdate = true;
      debris.visible = true;
    } else debris.visible = false;

    for (const m of smokePuffs) {
      m.userData.age += dt;
      const a = m.userData.age - m.userData.delay;
      if (a <= 0) { m.visible = false; continue; }
      const life = m.userData.life * 3.2;
      const p = Math.min(1, a / life);
      if (p >= 1) { m.visible = false; continue; }
      m.visible = true;
      m.position.addScaledVector(m.userData.vel, dt * 0.35);
      m.userData.vel.multiplyScalar(0.985);
      const size = m.userData.targetSize * (0.3 + p * 0.9);
      m.scale.setScalar(size);
      m.material.opacity = (1 - p) * 0.55;
      m.material.color.setHSL(0.07, 0.35, 0.06 + p * 0.12);
    }

    if (t > totalLife && !done) {
      done = true;
      scene.remove(group);
      disposeGroup(group);
    }
  }

  return api;
}

function disposeGroup(g) {
  g.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(m => m.dispose());
      else o.material.dispose();
    }
  });
}

export function spawnRings(scene, center, radii, timeScale = 1) {
  const group = new THREE.Group();
  group.position.copy(center);
  scene.add(group);

  const colors = [0xff2222, 0xff8a2a, 0xffd94a, 0x59c6ff];
  const rings = radii.map((r, i) => {
    const mat = new THREE.MeshBasicMaterial({
      color: colors[i], transparent: true, opacity: 0,
      side: THREE.DoubleSide, depthWrite: false
    });
    const m = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 96), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.6 + i * 0.15;
    m.scale.setScalar(0.001);
    m.userData = { targetR: r, delay: i * 0.35, dur: 1.3 };
    group.add(m);
    return m;
  });

  const start = performance.now() / 1000;
  const total = 4 * 0.35 + 1.3 + 0.4;

  return {
    update() {
      const t = (performance.now() / 1000 - start) * timeScale;
      let alive = false;
      for (const m of rings) {
        const a = t - m.userData.delay;
        if (a < 0) { m.material.opacity = 0; continue; }
        const p = Math.min(1, a / m.userData.dur);
        if (p < 1) alive = true;
        const ease = 1 - Math.pow(1 - p, 3);
        m.scale.setScalar(0.001 + ease * m.userData.targetR);
        m.material.opacity = p < 1 ? (1 - p) * 0.85 : 0;
      }
      if (!alive && t > total) {
        scene.remove(group);
        disposeGroup(group);
        return false;
      }
      return true;
    }
  };
}

export function spawnImpactDust(scene, center, radius, timeScale = 1) {
  const group = new THREE.Group();
  group.position.copy(center);
  scene.add(group);

  const COUNT = 60;
  const geo = new THREE.SphereGeometry(1, 10, 8);
  const puffs = [];

  for (let i = 0; i < COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xa89880, transparent: true, opacity: 0, depthWrite: false
    });
    const m = new THREE.Mesh(geo, mat);
    const ang = (i / COUNT) * Math.PI * 2 + Math.random() * 0.2;
    m.position.set(Math.cos(ang) * 4, 1, Math.sin(ang) * 4);
    group.add(m);

    puffs.push({
      mesh: m,
      ang,
      speed: radius * (0.8 + Math.random() * 0.4),
      life: 2.4 + Math.random() * 0.8,
      age: 0,
      size: radius * (0.08 + Math.random() * 0.06)
    });
  }

  const start = performance.now() / 1000;

  return {
    update() {
      const t = (performance.now() / 1000 - start) * timeScale;
      let alive = false;
      for (const p of puffs) {
        p.age += 1 / 60;
        const life = p.life;
        if (p.age > life) {
          p.mesh.visible = false;
          continue;
        }
        alive = true;
        const pr = p.age / life;
        const r = 4 + p.speed * Math.pow(pr, 0.7);
        p.mesh.position.x = Math.cos(p.ang) * r;
        p.mesh.position.z = Math.sin(p.ang) * r;
        p.mesh.position.y = 1 + Math.sin(pr * Math.PI) * radius * 0.08;
        const s = p.size * (0.6 + pr * 1.6);
        p.mesh.scale.setScalar(s);
        p.mesh.material.opacity = (1 - pr) * 0.55;
      }
      if (!alive) {
        scene.remove(group);
        disposeGroup(group);
        return false;
      }
      return true;
    }
  };
}