export function initUI(handlers) {
  const $ = id => document.getElementById(id);

  const bombSelect = $('bombSelect');
  const settingsCard = $('settingsCard');

  for (const b of handlers.bombs) {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    bombSelect.appendChild(opt);
  }

  function showBombInfo(b) {
    $('biName').textContent = b.name;
    $('biMass').textContent = b.mass;
    $('biExp').textContent  = b.explosive;
    $('biTnt').textContent  = b.tnt;
    $('biPen').textContent  = b.pen;
  }
  showBombInfo(handlers.bombs[0]);

  bombSelect.addEventListener('change', () => {
    const b = handlers.bombs.find(x => x.id === bombSelect.value);
    showBombInfo(b);
    handlers.onBombChange?.(b);
  });

  $('throwBtn').addEventListener('click', () => handlers.onThrow?.());

  $('settingsBtn').addEventListener('click', () => {
    settingsCard.classList.toggle('open');
    handlers.onSettingsToggle?.(settingsCard.classList.contains('open'));
  });
  $('closeSettings').addEventListener('click', () =>
    settingsCard.classList.remove('open'));

  $('altSelect').addEventListener('change', e =>
    handlers.onAltitudeChange?.(parseFloat(e.target.value)));

  $('speedSelect').addEventListener('change', e =>
    handlers.onSpeedChange?.(parseFloat(e.target.value)));

  const followBtn = $('followToggle');
  followBtn.addEventListener('click', () => {
    const on = followBtn.getAttribute('aria-checked') !== 'true';
    followBtn.setAttribute('aria-checked', String(on));
    handlers.onFollowToggle?.(on);
  });

  const cineBtn = $('cinematicToggle');
  cineBtn.addEventListener('click', () => {
    const on = cineBtn.getAttribute('aria-checked') !== 'true';
    cineBtn.setAttribute('aria-checked', String(on));
    handlers.onCinematicToggle?.(on);
  });

  const ringsBtn = $('ringsToggle');
  ringsBtn.addEventListener('click', () => {
    const on = ringsBtn.getAttribute('aria-checked') !== 'true';
    ringsBtn.setAttribute('aria-checked', String(on));
    handlers.onRingsToggle?.(on);
  });

  $('resetBtn').addEventListener('click', () => handlers.onReset?.());

  const cineRoot = document.getElementById('cinematic');
  const cineLines = document.getElementById('cineLines');
  let cineActive = false;
  let cineTimers = [];

  function clearCineTimers() {
    for (const t of cineTimers) clearTimeout(t);
    cineTimers = [];
  }

  function typeLine(el, text, speed, onDone) {
    el.classList.add('typing');
    let i = 0;
    const tick = () => {
      if (i >= text.length) {
        el.classList.remove('typing');
        onDone && onDone();
        return;
      }
      el.textContent += text[i++];
      const ch = text[i - 1];
      const delay = (ch === '.' || ch === ':' || ch === '!')
        ? speed * 5
        : speed + Math.random() * 14;
      cineTimers.push(setTimeout(tick, delay));
    };
    tick();
  }

  function showCinematic(lines, opts = {}) {
    clearCineTimers();
    cineLines.innerHTML = '';
    cineRoot.classList.remove('hidden');
    void cineRoot.offsetWidth;
    cineRoot.classList.add('visible');
    cineActive = true;

    const speed = opts.speed || 24;
    const gap = opts.gap || 220;

    let idx = 0;
    function nextLine() {
      if (idx >= lines.length) {
        if (opts.onComplete) cineTimers.push(setTimeout(opts.onComplete, gap));
        return;
      }
      const line = lines[idx++];
      const el = document.createElement('div');
      el.className = 'cine-line' + (line.cls ? ' ' + line.cls : '');
      cineLines.appendChild(el);
      typeLine(el, line.text, speed, () => {
        cineTimers.push(setTimeout(nextLine, gap));
      });
    }
    cineTimers.push(setTimeout(nextLine, 150));
  }

  function hideCinematic() {
    clearCineTimers();
    cineRoot.classList.remove('visible');
    cineActive = false;
    cineTimers.push(setTimeout(() => {
      cineRoot.classList.add('hidden');
      cineLines.innerHTML = '';
    }, 550));
  }

  return {
    setThrowEnabled(v) { $('throwBtn').disabled = !v; },
    setHint(show, text) {
      const h = $('hint');
      if (text) h.textContent = text;
      h.classList.toggle('hide', !show);
    },
    setLoaderHidden() { $('loader').classList.add('hide'); },
    setStats(html) {
      const s = $('stats');
      s.innerHTML = html;
      s.classList.toggle('hidden', !html);
    },
    triggerFlash(power) {
      const f = document.getElementById('flash');
      f.style.setProperty('--fx', '50%');
      f.style.setProperty('--fy', '50%');
      f.style.opacity = Math.min(1, power);
      f.classList.add('on');
      setTimeout(() => f.classList.remove('on'), 60);
    },
    showCinematic,
    hideCinematic,
    isCinematicActive: () => cineActive
  };
}

export function renderStats(radii, cnt) {
  const names = [
    'Complete destruction',
    'Heavy damage',
    'Moderate damage',
    'Broken windows'
  ];
  const cls = ['c1', 'c2', 'c3', 'c4'];
  const TH  = ['35', '20', '8', '2'];

  const r = radii, c = cnt;

  const rings = r.map((v, i) =>
    `<div class="row">
      <span class="dot ${cls[i]}"><i class="mi fill">circle</i></span>
      <span>${names[i]}: <b>~${Math.round(v)} m</b> (${TH[i]} kPa)</span>
    </div>`
  ).join('');

  const counters = [
    ['Intact',          c[0]],
    ['Windows broken',  c[1]],
    ['Moderate damage', c[2]],
    ['Heavy damage',    c[3]],
    ['Destroyed',       c[4]]
  ].map(([k, v]) => `<div class="row"><span>${k}:</span><b>${v}</b></div>`).join('');

  return `
    <div class="stat-title">Blast radii</div>
    ${rings}
    <hr>
    <div class="stat-title">Casualties</div>
    ${counters}
  `;
}