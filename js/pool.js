/* TT Swim Race: the 3D pool (Three.js). A sunny outdoor 25 m pool with 6 lanes: tiled floor with lane lines and
   moving caustics, see-through water with ripples, red-white-blue lane ropes, numbered starting blocks at both
   ends, backstroke flags 5 m from each wall, a deck with umbrellas, palm trees and a lifeguard chair, a stand of
   cheering animal fans, the scoreboard, the podium, splashes and confetti. The pool runs along x (0 = the start
   wall, 25 = the far wall), the lanes along z. The camera looks from the +z side. */
(function () {
  'use strict';
  const T = THREE;
  const SW = (window.SW = window.SW || {});
  const { makeCanvas, toTexture, std, mesh, dotTexture, shade, rand, pick, FONT, roundRect } = Kit.gfx;

  const LEN = 25, LANES = 6, LW = 2.5, PW = LANES * LW, DECK = 0.25, DEPTH = 2;
  const laneZ = (i) => -PW / 2 + LW / 2 + i * LW;

  let renderer, scene, camera, waterTex, shineTex, causticTex, board, boardLines = [];
  const fans = [], splashes = [], confetti = [];
  const look = new T.Vector3(), camPos = new T.Vector3();
  let W = 1, H = 1, viewShift = { x: 0, y: 0 };

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputEncoding = T.sRGBEncoding;
    scene = new T.Scene();
    scene.background = skyTexture();
    scene.fog = new T.Fog('#cdeeff', 70, 160);
    camera = new T.PerspectiveCamera(42, 1, 0.1, 400);
    scene.add(new T.HemisphereLight('#e9f8ff', '#b9a27a', 0.85));
    const sun = new T.DirectionalLight('#fff4dc', 1.05);
    sun.position.set(-10, 30, 18);
    scene.add(sun);

    buildPool();
    buildDeck();
    buildRopes();
    buildBlocks();
    buildFlags();
    buildScenery();
    buildStand();
    buildBoard();
    buildPodium();
    buildParticles();
    resize(innerWidth, innerHeight);
  }

  function skyTexture() {
    const [c, g] = makeCanvas(16, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#3fb4f5');
    gr.addColorStop(0.55, '#9fdcff');
    gr.addColorStop(1, '#e8f8ff');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 256);
    return toTexture(c);
  }

  // ---------------------------------------------------------------- the pool
  function tileTexture(base, line, n) {
    const [c, g] = makeCanvas(256, 256);
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const s = 256 / n;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      g.fillStyle = shade(base, (((x * 7 + y * 13) % 5) - 2) * 0.012);
      g.fillRect(x * s + 1, y * s + 1, s - 2, s - 2);
    }
    g.strokeStyle = line;
    g.lineWidth = 2;
    for (let i = 0; i <= n; i++) {
      g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, 256); g.stroke();
      g.beginPath(); g.moveTo(0, i * s); g.lineTo(256, i * s); g.stroke();
    }
    return toTexture(c);
  }

  function buildPool() {
    const floorTex = tileTexture('#bdf0f7', '#9fdbe6', 8);
    floorTex.wrapS = floorTex.wrapT = T.RepeatWrapping;
    floorTex.repeat.set(LEN / 2, PW / 2);
    const floor = mesh(new T.PlaneGeometry(LEN, PW), std('#ffffff', { map: floorTex, roughness: 0.6 }), LEN / 2, -DEPTH, 0, scene, false);
    floor.rotation.x = -Math.PI / 2;
    // the walls inside the pool
    const wallTex = tileTexture('#d6f6fb', '#a6dde6', 8);
    wallTex.wrapS = wallTex.wrapT = T.RepeatWrapping;
    const wall = (w, h, x, z, ry, rep) => {
      const t = wallTex.clone();
      t.needsUpdate = true;
      t.repeat.set(rep, 1.2);
      const m = mesh(new T.PlaneGeometry(w, h), std('#ffffff', { map: t, roughness: 0.6 }), x, (DECK - DEPTH) / 2, z, scene, false);
      m.rotation.y = ry;
    };
    const wh = DECK + DEPTH;
    wall(LEN, wh, LEN / 2, -PW / 2, 0, LEN / 2);
    wall(LEN, wh, LEN / 2, PW / 2, Math.PI, LEN / 2);
    wall(PW, wh, 0, 0, Math.PI / 2, PW / 2);
    wall(PW, wh, LEN, 0, -Math.PI / 2, PW / 2);
    // lane lines on the floor (dark blue, with a T near each wall) and targets on the end walls
    const lineMat = std('#20407a', { roughness: 0.6 });
    for (let i = 0; i < LANES; i++) {
      const z = laneZ(i);
      const l = mesh(new T.PlaneGeometry(LEN - 4, 0.25), lineMat, LEN / 2, -DEPTH + 0.01, z, scene, false);
      l.rotation.x = -Math.PI / 2;
      for (const x of [2, LEN - 2]) {
        const tb = mesh(new T.PlaneGeometry(0.25, 1.0), lineMat, x, -DEPTH + 0.011, z, scene, false);
        tb.rotation.x = -Math.PI / 2;
      }
      for (const [x, ry] of [[0.01, Math.PI / 2], [LEN - 0.01, -Math.PI / 2]]) {
        const tw = mesh(new T.PlaneGeometry(0.25, 1.2), lineMat, x, -0.9, z, scene, false);
        tw.rotation.y = ry;
        const tc = mesh(new T.PlaneGeometry(0.8, 0.25), lineMat, x, -0.4, z, scene, false);
        tc.rotation.y = ry;
      }
    }
    // caustics: bright wobbly light on the floor, sliding slowly
    causticTex = causticTexture();
    causticTex.wrapS = causticTex.wrapT = T.RepeatWrapping;
    causticTex.repeat.set(LEN / 4, PW / 4);
    const caus = mesh(new T.PlaneGeometry(LEN, PW), new T.MeshBasicMaterial({ map: causticTex, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }), LEN / 2, -DEPTH + 0.02, 0, scene, false);
    caus.rotation.x = -Math.PI / 2;
    // the water: see-through blue, with a second layer of moving ripples on top
    waterTex = rippleTexture(0.22);
    waterTex.wrapS = waterTex.wrapT = T.RepeatWrapping;
    waterTex.repeat.set(LEN / 6, PW / 6);
    const water = mesh(new T.PlaneGeometry(LEN, PW), std('#2bb8ec', { map: waterTex, transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0.05, depthWrite: false }), LEN / 2, 0, 0, scene, false);
    water.rotation.x = -Math.PI / 2;
    water.renderOrder = 2;
    shineTex = rippleTexture(0.6);
    shineTex.wrapS = shineTex.wrapT = T.RepeatWrapping;
    shineTex.repeat.set(LEN / 9, PW / 9);
    const shine = mesh(new T.PlaneGeometry(LEN, PW), new T.MeshBasicMaterial({ map: shineTex, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }), LEN / 2, 0.01, 0, scene, false);
    shine.rotation.x = -Math.PI / 2;
    shine.renderOrder = 3;
  }

  function rippleTexture(alpha) {
    const [c, g] = makeCanvas(256, 256);
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#ffffff';
    g.globalAlpha = 0.0;
    g.fillRect(0, 0, 256, 256);
    g.globalAlpha = alpha;
    g.strokeStyle = '#ffffff';
    g.lineCap = 'round';
    const r = Kit.gfx.rand;
    for (let i = 0; i < 70; i++) {
      const x = r(0, 256), y = r(0, 256), w = r(14, 46);
      g.lineWidth = r(1.5, 4);
      for (const dx of [0, -256, 256]) for (const dy of [0, -256, 256]) {
        g.beginPath();
        g.moveTo(x + dx - w / 2, y + dy);
        g.quadraticCurveTo(x + dx, y + dy - r(3, 8), x + dx + w / 2, y + dy);
        g.stroke();
      }
    }
    return toTexture(c);
  }

  function causticTexture() {
    const [c, g] = makeCanvas(256, 256);
    g.strokeStyle = 'rgba(255,255,255,0.9)';
    g.lineJoin = 'round';
    const pts = [];
    for (let i = 0; i < 26; i++) pts.push([rand(0, 256), rand(0, 256)]);
    for (const [x, y] of pts) {
      g.lineWidth = rand(2, 5);
      for (const dx of [0, -256, 256]) for (const dy of [0, -256, 256]) {
        g.beginPath();
        const n = 6, rr = rand(16, 30);
        for (let k = 0; k <= n; k++) {
          const a = (k / n) * Math.PI * 2, q = rr * (0.7 + 0.3 * Math.sin(k * 2.3 + x));
          const px = x + dx + Math.cos(a) * q, py = y + dy + Math.sin(a) * q;
          if (k) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.stroke();
      }
    }
    return toTexture(c);
  }

  // ---------------------------------------------------------------- the deck around it
  function buildDeck() {
    const tex = tileTexture('#efe3cc', '#dccdb2', 4);
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    const slab = (x0, x1, z0, z1) => {
      const t = tex.clone();
      t.needsUpdate = true;
      t.repeat.set((x1 - x0) / 2, (z1 - z0) / 2);
      mesh(new T.BoxGeometry(x1 - x0, 0.5, z1 - z0), std('#ffffff', { map: t, roughness: 0.85 }), (x0 + x1) / 2, DECK - 0.25, (z0 + z1) / 2, scene, false);
    };
    slab(-10, LEN + 10, PW / 2, 22);
    slab(-10, LEN + 10, -26, -PW / 2);
    slab(-10, 0, -PW / 2, PW / 2);
    slab(LEN, LEN + 10, -PW / 2, PW / 2);
    // the white rounded edge around the water
    const edge = std('#ffffff', { roughness: 0.5 });
    const rim = (w, d, x, z) => mesh(new T.BoxGeometry(w, 0.12, d), edge, x, DECK + 0.02, z, scene, false);
    rim(LEN + 0.6, 0.3, LEN / 2, PW / 2 + 0.15);
    rim(LEN + 0.6, 0.3, LEN / 2, -PW / 2 - 0.15);
    rim(0.3, PW, -0.15, 0);
    rim(0.3, PW, LEN + 0.15, 0);
    // grass beyond the deck (four big pieces around it, so none of it shows through the water)
    const grassMat = std('#7fcf5a', { roughness: 1 });
    for (const [x0, x1, z0, z1] of [[-200, LEN + 200, 22, 200], [-200, LEN + 200, -200, -26], [-200, -10, -26, 22], [LEN + 10, LEN + 200, -26, 22]]) {
      const gr = mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), grassMat, (x0 + x1) / 2, -0.01, (z0 + z1) / 2, scene, false);
      gr.rotation.x = -Math.PI / 2;
    }
  }

  // ---------------------------------------------------------------- lane ropes: red near the walls, blue and white between
  function buildRopes() {
    const per = Math.round(LEN / 0.24);
    const geo = new T.SphereGeometry(0.1, 8, 6);
    geo.scale(1.25, 0.85, 0.85);
    const inst = new T.InstancedMesh(geo, std('#ffffff', { roughness: 0.4 }), per * (LANES - 1));
    const m = new T.Matrix4(), col = new T.Color();
    let k = 0;
    for (let r = 1; r < LANES; r++) {
      const z = -PW / 2 + r * LW;
      for (let i = 0; i < per; i++) {
        const x = (i + 0.5) * (LEN / per);
        m.makeTranslation(x, 0.03, z);
        inst.setMatrixAt(k, m);
        const nearWall = x < 5 || x > LEN - 5;
        col.set(nearWall ? (i % 2 ? '#ffffff' : '#e8323c') : i % 2 ? '#ffffff' : '#2f6fe0');
        inst.setColorAt(k, col);
        k++;
      }
    }
    scene.add(inst);
  }

  // ---------------------------------------------------------------- numbered starting blocks at both ends
  function numberTexture(n, bg) {
    const [c, g] = makeCanvas(64, 64);
    g.fillStyle = bg;
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#ffffff';
    g.font = `48px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(String(n), 32, 36);
    return toTexture(c);
  }
  const blocks = [];
  function buildBlocks() {
    const post = std('#c9d2db', { metalness: 0.4, roughness: 0.4 });
    for (let i = 0; i < LANES; i++) {
      const z = laneZ(i);
      for (const [x, dir] of [[-0.55, 1], [LEN + 0.55, -1]]) {
        const g = new T.Group();
        g.position.set(x, DECK, z);
        g.rotation.y = dir > 0 ? 0 : Math.PI;
        mesh(new T.BoxGeometry(0.12, 0.55, 0.5), post, -0.15, 0.27, 0, g);
        const top = mesh(new T.BoxGeometry(0.7, 0.1, 0.62), std('#2f6fe0', { roughness: 0.5 }), 0, 0.6, 0, g);
        top.rotation.z = -0.12;
        const plate = mesh(new T.PlaneGeometry(0.42, 0.42), new T.MeshBasicMaterial({ map: numberTexture(i + 1, '#e8323c') }), -0.22, 0.32, 0, g, false);
        plate.rotation.y = -Math.PI / 2;
        scene.add(g);
        blocks.push({ lane: i, x, dir });
      }
    }
  }
  const blockTop = DECK + 0.64;

  // ---------------------------------------------------------------- backstroke flags 5 m from each wall
  function buildFlags() {
    const cols = ['#e8323c', '#ffffff', '#2f6fe0', '#ffd400'];
    const pole = std('#e9eef2', { metalness: 0.5, roughness: 0.4 });
    for (const x of [5, LEN - 5]) {
      for (const z of [-PW / 2 - 0.9, PW / 2 + 0.9]) mesh(new T.CylinderGeometry(0.06, 0.06, 2.4, 8), pole, x, DECK + 1.2, z, scene);
      const rope = mesh(new T.BoxGeometry(0.02, 0.02, PW + 1.8), std('#ffffff'), x, DECK + 2.3, 0, scene, false);
      rope.visible = true;
      const tri = new T.BufferGeometry();
      tri.setAttribute('position', new T.Float32BufferAttribute([0, 0, -0.16, 0, 0, 0.16, 0, -0.38, 0], 3));
      tri.computeVertexNormals();
      let k = 0;
      for (let z = -PW / 2 - 0.6; z <= PW / 2 + 0.6; z += 0.45) {
        const f = new T.Mesh(tri, new T.MeshBasicMaterial({ color: cols[k++ % cols.length], side: T.DoubleSide }));
        f.position.set(x, DECK + 2.29, z);
        scene.add(f);
      }
    }
  }

  // ---------------------------------------------------------------- umbrellas, palm trees, a lifeguard chair
  function umbrella(x, z, c1, c2) {
    const g = new T.Group();
    g.position.set(x, DECK, z);
    mesh(new T.CylinderGeometry(0.05, 0.05, 2.4, 6), std('#ffffff'), 0, 1.2, 0, g);
    const segs = 8;
    for (let i = 0; i < segs; i++) {
      const cone = new T.Mesh(new T.ConeGeometry(1.6, 0.6, segs, 1, true, (i / segs) * Math.PI * 2, (Math.PI * 2) / segs), std(i % 2 ? c1 : c2, { side: T.DoubleSide, roughness: 0.7 }));
      cone.position.y = 2.55;
      g.add(cone);
    }
    // a lounge chair under it
    const chair = std('#ffffff', { roughness: 0.6 }), towel = std(c1, { roughness: 0.9 });
    const seat = mesh(new T.BoxGeometry(1.7, 0.08, 0.6), chair, 0.9, 0.35, 0.8, g);
    mesh(new T.BoxGeometry(1.5, 0.03, 0.5), towel, 0.85, 0.4, 0.8, g, false);
    const back = mesh(new T.BoxGeometry(0.7, 0.08, 0.6), chair, 1.95, 0.6, 0.8, g);
    back.rotation.z = 0.7;
    for (const lx of [0.2, 1.6]) for (const lz of [0.55, 1.05]) mesh(new T.BoxGeometry(0.05, 0.35, 0.05), chair, lx, 0.17, lz, g);
    seat.castShadow = false;
    scene.add(g);
  }
  function palm(x, z, h) {
    const g = new T.Group();
    g.position.set(x, 0, z);
    const bark = std('#a77b4a', { roughness: 0.9 });
    let px = 0, py = 0;
    for (let i = 0; i < 6; i++) {
      const seg = mesh(new T.CylinderGeometry(0.2 - i * 0.015, 0.24 - i * 0.015, h / 6, 7), bark, px, py + h / 12, 0, g);
      seg.rotation.z = -0.05 * i;
      px += 0.08 * i;
      py += h / 6;
    }
    const leaf = std('#3fae4a', { roughness: 0.8, side: T.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const l = mesh(new T.BoxGeometry(2.4, 0.05, 0.55), leaf, px, py, 0, g);
      const a = (i / 7) * Math.PI * 2;
      l.geometry.translate(1.2, 0, 0);
      l.rotation.set(0, a, -0.45);
    }
    for (let i = 0; i < 3; i++) mesh(new T.SphereGeometry(0.16, 8, 6), std('#6b4a2a'), px + Math.cos(i * 2) * 0.2, py - 0.15, Math.sin(i * 2) * 0.2, g);
    scene.add(g);
  }
  function buildScenery() {
    const cols = [['#ff3d7f', '#ffffff'], ['#ffd400', '#ff8a1f'], ['#18d4ff', '#ffffff'], ['#3fe0b0', '#ffffff']];
    [-6, 3, 11, 19, 28].forEach((x, i) => umbrella(x, -11.5, ...cols[i % cols.length]));
    palm(-8, -12, 7); palm(LEN + 7, -12.5, 8); palm(-8.5, 12, 6.5); palm(LEN + 8, 12, 7.5); palm(-14, 0, 8); palm(LEN + 13, -2, 7);
    // the lifeguard chair (with a red rescue float)
    const g = new T.Group();
    g.position.set(LEN / 2, DECK, -9.4);
    const wood = std('#ffffff', { roughness: 0.6 });
    for (const x of [-0.45, 0.45]) for (const z of [-0.35, 0.35]) { const leg = mesh(new T.BoxGeometry(0.08, 2.2, 0.08), wood, x, 1.1, z, g); leg.rotation.x = z * 0.15; }
    mesh(new T.BoxGeometry(1.1, 0.1, 0.8), wood, 0, 2.2, 0, g);
    mesh(new T.BoxGeometry(1.1, 0.8, 0.1), wood, 0, 2.6, -0.4, g);
    for (let y = 0.4; y < 2.1; y += 0.45) mesh(new T.BoxGeometry(0.9, 0.06, 0.06), wood, 0, y, 0.38, g);
    const ring = mesh(new T.TorusGeometry(0.32, 0.1, 8, 16), std('#e8323c'), 0.62, 1.6, 0.42, g);
    ring.rotation.y = Math.PI / 2;
    const flag = mesh(new T.BoxGeometry(0.5, 0.35, 0.02), std('#e8323c'), 0.3, 3.4, -0.4, g, false);
    mesh(new T.CylinderGeometry(0.02, 0.02, 1.2, 5), wood, 0, 3.2, -0.4, g, false);
    flag.position.x = 0.26;
    scene.add(g);
    // a hedge behind the near deck and soft clouds in the sky
    const hedge = std('#4fae47', { roughness: 1 });
    for (let x = -14; x < LEN + 16; x += 2.2) mesh(new T.BoxGeometry(2.3, 1.0, 1.0), hedge, x, 0.5, 22.6, scene, false);
    const cloudTex = Kit.gfx.radialTexture(128, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.6)'], [1, 'rgba(255,255,255,0)']]);
    for (let i = 0; i < 9; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: cloudTex, depthWrite: false, fog: false }));
      s.position.set(rand(-60, 90), rand(28, 48), rand(-110, -70));
      s.scale.set(rand(22, 40), rand(8, 13), 1);
      scene.add(s);
    }
  }

  // ---------------------------------------------------------------- the stand of animal fans behind the far deck
  function buildStand() {
    const step = std('#5b6c8f', { roughness: 0.8 }), seat = std('#ffd400', { roughness: 0.7 });
    for (let r = 0; r < 5; r++) {
      const z = -17 - r * 1.2, y = 0.5 + r * 0.6;
      mesh(new T.BoxGeometry(LEN + 16, 0.6 + r * 0.6, 1.2), step, LEN / 2, (0.6 + r * 0.6) / 2, z, scene, false);
      mesh(new T.BoxGeometry(LEN + 16, 0.12, 0.4), seat, LEN / 2, y + 0.65 - 0.5 + 0.06, z + 0.3, scene, false);
    }
    // the fans: blocky animals (a bunny, bear, duck, cat, panda, pig) bouncing in their seats
    const kinds = [
      { c: '#f4f1ec', ear: 'long' }, { c: '#a8754a', ear: 'round' }, { c: '#ffd84a', ear: 'none', beak: '#ff9a1f' },
      { c: '#ff9f43', ear: 'cat' }, { c: '#ffffff', ear: 'round', dark: '#222' }, { c: '#ffb3c4', ear: 'cat' },
    ];
    const shirts = ['#ff3d7f', '#18d4ff', '#ffd400', '#3fe0b0', '#9b6bff', '#ff8a1f', '#ffffff'];
    for (let r = 0; r < 5; r++) for (let x = -6.5; x < LEN + 7; x += rand(1.05, 1.6)) {
      if (Math.random() < 0.12) continue;
      const k = pick(kinds), g = new T.Group();
      const body = mesh(new T.BoxGeometry(0.5, 0.55, 0.36), std(pick(shirts), { roughness: 0.8 }), 0, 0.28, 0, g, false);
      const head = new T.Group();
      head.position.y = 0.78;
      g.add(head);
      const fur = std(k.c, { roughness: 0.8 });
      mesh(new T.BoxGeometry(0.44, 0.4, 0.4), fur, 0, 0, 0, head, false);
      const dark = std(k.dark || '#2a1a12');
      for (const sx of [-1, 1]) {
        mesh(new T.BoxGeometry(0.07, 0.07, 0.02), dark, sx * 0.1, 0.04, 0.205, head, false);
        if (k.ear === 'long') mesh(new T.BoxGeometry(0.09, 0.36, 0.06), fur, sx * 0.1, 0.36, 0, head, false);
        else if (k.ear === 'round') mesh(new T.BoxGeometry(0.13, 0.12, 0.06), k.dark ? dark : fur, sx * 0.17, 0.24, 0, head, false);
        else if (k.ear === 'cat') { const e = mesh(new T.ConeGeometry(0.08, 0.16, 4), fur, sx * 0.14, 0.27, 0, head, false); e.rotation.y = Math.PI / 4; }
      }
      if (k.beak) mesh(new T.BoxGeometry(0.18, 0.07, 0.12), std(k.beak), 0, -0.06, 0.24, head, false);
      const arms = [-1, 1].map((sx) => mesh(new T.BoxGeometry(0.12, 0.42, 0.12).translate(0, 0.18, 0), fur, sx * 0.32, 0.45, 0, g, false));
      g.position.set(x, 0.65 + r * 0.6, -17 - r * 1.2 + 0.1);
      g.userData = { y0: g.position.y, ph: rand(0, 6.28), sp: rand(5, 8), arms, body };
      scene.add(g);
      fans.push(g);
    }
  }

  // ---------------------------------------------------------------- the scoreboard over the stand
  function buildBoard() {
    const [c] = makeCanvas(1024, 384);
    const tex = toTexture(c);
    const g = new T.Group();
    g.position.set(LEN / 2, 8.6, -24.5);
    mesh(new T.BoxGeometry(14.6, 5.8, 0.4), std('#14121f', { roughness: 0.6 }), 0, 0, -0.1, g, false);
    mesh(new T.PlaneGeometry(14, 5.25), new T.MeshBasicMaterial({ map: tex }), 0, 0, 0.12, g, false);
    for (const x of [-5, 5]) mesh(new T.BoxGeometry(0.35, 6, 0.35), std('#7d8aa6'), x, -5.5, -0.2, g, false);
    scene.add(g);
    board = { c, tex };
    drawBoard();
  }
  function drawBoard(lines) {
    if (lines) boardLines = lines;
    const { c, tex } = board, g = c.getContext('2d');
    g.fillStyle = '#0d1430';
    g.fillRect(0, 0, 1024, 384);
    g.strokeStyle = '#ffd400';
    g.lineWidth = 8;
    roundRect(g, 10, 10, 1004, 364, 22);
    g.stroke();
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#ffd400';
    g.font = `64px ${FONT}`;
    g.fillText(window.SW_TITLE || 'TT Swim Race', 512, 78);
    g.font = `44px ${FONT}`;
    const rows = boardLines.length ? boardLines : [['🏊', Kit.lang.t('WELCOME!'), '']];
    rows.slice(0, 4).forEach((r, i) => {
      const y = 160 + i * 58;
      g.fillStyle = i === 0 && rows.length > 1 ? '#7df7c8' : '#ffffff';
      g.textAlign = 'left';
      g.font = `40px ${Kit.gfx.EMOJI_FONT}`;
      g.fillText(r[0], 90, y);
      g.font = `40px ${FONT}`;
      g.fillText(r[1], 160, y);
      g.textAlign = 'right';
      g.fillText(r[2], 940, y);
    });
    tex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the podium (west deck, behind the blocks)
  const PODIUM = { x: -5, z: 2.5 };
  const podiumSpots = [];
  function buildPodium() {
    const g = new T.Group();
    g.position.set(PODIUM.x, DECK, PODIUM.z);
    const steps = [[0, 1.0, '#ffd400', 1], [-1.3, 0.7, '#cfd8e3', 2], [1.3, 0.45, '#e39a5b', 3]];
    for (const [x, h, col, n] of steps) {
      mesh(new T.BoxGeometry(1.3, h, 1.2), std(col, { roughness: 0.5 }), x, h / 2, 0, g);
      const p = mesh(new T.PlaneGeometry(0.6, 0.6), new T.MeshBasicMaterial({ map: numberTexture(n, shade(col, -0.35)) }), x, h / 2, 0.61, g, false);
      p.userData.n = n;
      podiumSpots[n - 1] = new T.Vector3(PODIUM.x + x, DECK + h, PODIUM.z);
    }
    scene.add(g);
  }

  // ---------------------------------------------------------------- splashes and confetti
  const dropTex = () => dotTexture();
  function buildParticles() {
    const tex = dropTex();
    for (let i = 0; i < 220; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: '#ffffff', transparent: true, depthWrite: false }));
      s.visible = false;
      s.renderOrder = 4;
      scene.add(s);
      splashes.push({ s, v: new T.Vector3(), life: 0, max: 1, size: 0.2 });
    }
    const cols = ['#ff3d7f', '#ffd400', '#18d4ff', '#3fe0b0', '#9b6bff', '#ff8a1f', '#ffffff'].map((c) => new T.MeshBasicMaterial({ color: c, side: T.DoubleSide }));
    const geo = new T.PlaneGeometry(0.12, 0.2);
    for (let i = 0; i < 160; i++) {
      const m = new T.Mesh(geo, cols[i % cols.length]);
      m.visible = false;
      scene.add(m);
      confetti.push({ m, v: new T.Vector3(), w: new T.Vector3(), life: 0 });
    }
  }
  let sIdx = 0;
  // a splash of n drops at (x, y, z); power scales how far they fly
  function splash(x, y, z, n, power = 1, spread = 0.3) {
    for (let i = 0; i < n; i++) {
      const p = splashes[sIdx++ % splashes.length];
      p.s.visible = true;
      p.s.position.set(x + rand(-spread, spread), y + rand(0, 0.1), z + rand(-spread, spread));
      p.v.set(rand(-1, 1) * power, rand(1.2, 3) * power, rand(-1, 1) * power);
      p.life = 0;
      p.max = rand(0.4, 0.8);
      p.size = rand(0.12, 0.28) * Math.min(1.6, 0.6 + power * 0.5);
      p.s.material.opacity = 0.9;
    }
  }
  function burst(at, n = 120) {
    for (let i = 0; i < n; i++) {
      const p = confetti[i % confetti.length];
      p.m.visible = true;
      p.m.position.set(at.x + rand(-1.5, 1.5), at.y + rand(2.5, 4), at.z + rand(-1, 1));
      p.v.set(rand(-2.5, 2.5), rand(1, 5), rand(-1.5, 2.5));
      p.w.set(rand(-8, 8), rand(-8, 8), rand(-8, 8));
      p.life = rand(3, 4.5);
    }
  }

  let cheer = 0, time = 0;
  function update(dt) {
    time += dt;
    waterTex.offset.x = (waterTex.offset.x + dt * 0.02) % 1;
    waterTex.offset.y = (waterTex.offset.y + dt * 0.012) % 1;
    shineTex.offset.x = (shineTex.offset.x - dt * 0.015) % 1;
    shineTex.offset.y = (shineTex.offset.y + dt * 0.02) % 1;
    causticTex.offset.x = (causticTex.offset.x + dt * 0.03) % 1;
    causticTex.offset.y = Math.sin(time * 0.3) * 0.05;
    cheer = Math.max(0, cheer - dt);
    for (const f of fans) {
      const u = f.userData, k = cheer > 0 ? 1 : 0.25;
      f.position.y = u.y0 + Math.abs(Math.sin(time * u.sp + u.ph)) * 0.18 * k;
      const up = cheer > 0 ? 2.7 + Math.sin(time * 9 + u.ph) * 0.3 : 0.3 + Math.sin(time * 2 + u.ph) * 0.15;
      u.arms[0].rotation.z = up;
      u.arms[1].rotation.z = -up;
    }
    for (const p of splashes) {
      if (!p.s.visible) continue;
      p.life += dt;
      if (p.life >= p.max || p.s.position.y < -0.2) { p.s.visible = false; continue; }
      p.v.y -= 9.8 * dt;
      p.s.position.addScaledVector(p.v, dt);
      const u = p.life / p.max;
      p.s.material.opacity = 0.9 * (1 - u);
      p.s.scale.setScalar(p.size * (1 + u));
    }
    for (const p of confetti) {
      if (!p.m.visible) continue;
      p.life -= dt;
      if (p.life <= 0) { p.m.visible = false; continue; }
      p.v.y = Math.max(p.v.y - 6 * dt, -1.6);
      p.v.x *= 0.99;
      p.m.position.addScaledVector(p.v, dt);
      p.m.rotation.x += p.w.x * dt;
      p.m.rotation.y += p.w.y * dt;
      p.m.rotation.z += p.w.z * dt;
    }
  }

  // ---------------------------------------------------------------- the camera
  // shift (in 0..1 of the screen) moves the picture's centre, so the menus can sit beside the characters
  function resize(w, h) {
    W = w; H = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 58 : w / h < 1.3 ? 50 : 42;
    applyShift();
  }
  function applyShift() {
    if (viewShift.x || viewShift.y) camera.setViewOffset(W, H, -viewShift.x * W, -viewShift.y * H, W, H);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function shift(x, y) {
    if (x === viewShift.x && y === viewShift.y) return;
    viewShift = { x, y };
    applyShift();
  }
  // ease the camera toward a position and a point to look at (k = 1 snaps)
  function aim(pos, at, k) {
    camPos.lerp(pos, k);
    look.lerp(at, k);
    camera.position.copy(camPos);
    camera.lookAt(look);
  }
  function render() { renderer.render(scene, camera); }

  SW.pool = {
    LEN, LANES, LW, PW, DECK, laneZ, blockTop, PODIUM, podiumSpots,
    init, update, render, resize, shift, aim, splash, burst, drawBoard,
    cheer: (s) => { cheer = Math.max(cheer, s || 2); },
    get scene() { return scene; }, get camera() { return camera; }, get renderer() { return renderer; },
  };
})();
