/* TT Swim Race: the swimmers. Each one is a kit person (Kit.people.build) in swim trunks and goggles, barefoot,
   inside a holder group that the game moves around the pool. Modes:
   - stand: on the deck, a block or the podium, doing a pose (wave, peace, boxing, jumpshot, cheer, ready);
   - dive: off the block into the water (sw.u goes 0 to 1), pivoting on the feet, arms over the head;
   - swim: lying in the water, freestyle (face down) or backstroke (face up). Each stroke the game hands us swings
     one arm round once; the body rolls with it, the legs flutter (much faster in a turbo kick), a breath turns the
     head to the side;
   - rest: standing in the water at the wall, head and shoulders out, doing a pose.
   The person faces -z when standing; lying, the head points along the holder's -z (freestyle) or +z (backstroke),
   and the holder's yaw turns that toward the way he's swimming. */
(function () {
  'use strict';
  const T = THREE;
  const SW = (window.SW = window.SW || {});
  const P = Kit.people;
  const { std, mesh, emojiTexture } = Kit.gfx;

  const TRUNKS = { teddy: '#e53935', tommy: '#ffb02e', foxy: '#3fbf8a', froggy: '#3d6ad6' };
  const SCALE = { teddy: 0.9, tommy: 0.8, foxy: 0.86, froggy: 0.82 };
  const REACH = 1.02; // from the body's middle to the hands out in front (and to the feet behind), at scale 1
  const PI = Math.PI;
  const ease = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
  const sstep = (a, b, x) => { const u = Math.max(0, Math.min(1, (x - a) / (b - a))); return u * u * (3 - 2 * u); };

  function swimLook(entry) {
    const l = Object.assign({}, entry.look);
    Object.assign(l, { shirt: 'tee', top: l.skin, bottom: TRUNKS[entry.id] || '#2f6fe0', shorts: true, shoes: l.skin });
    delete l.print; delete l.pack; delete l.headphones; delete l.hat; delete l.belly;
    return l;
  }

  function goggles(p, color) {
    const strap = std('#1b1a22', { roughness: 0.5 }), lens = std(color, { roughness: 0.15, metalness: 0.3, emissive: color, emissiveIntensity: 0.25 });
    mesh(new T.BoxGeometry(0.52, 0.06, 0.48), strap, 0, 0.05, 0, p.head, false);
    for (const sx of [-1, 1]) mesh(new T.BoxGeometry(0.15, 0.1, 0.05), lens, sx * 0.11, 0.05, -0.25, p.head, false);
  }

  function create(id, opts = {}) {
    const entry = Kit.roster.get(id);
    const p = P.build(swimLook(entry));
    // barefoot: the white soles of the shoes go
    for (const leg of [p.legL, p.legR]) {
      const parts = leg.children.filter((c) => c.isMesh);
      if (parts.length >= 4) parts[parts.length - 1].visible = false;
    }
    goggles(p, TRUNKS[id] || '#2f6fe0');
    const sc = opts.scale || SCALE[id] || 0.85;
    p.root.scale.setScalar(sc);
    const holder = new T.Group();
    holder.add(p.root);
    let tag = null;
    if (opts.tag !== false) {
      tag = Kit.gfx.nameTag(entry.name, entry.tag || '#ffffff');
      tag.scale.multiplyScalar(0.55);
      holder.add(tag);
    }
    const ball = new T.Sprite(new T.SpriteMaterial({ map: emojiTexture('🏀'), depthWrite: false }));
    ball.scale.setScalar(0.5);
    ball.visible = false;
    holder.add(ball);
    return {
      id, entry, p, holder, sc, tag, ball, mode: 'stand', stroke: 'free', dir: 1, yaw: 0, u: 0, action: null, actT: 0,
      arm: [{ t: 9, dur: 0.6, power: 1 }, { t: 9, dur: 0.6, power: 1 }], breath: { t: 9, side: 1, ok: true }, ph: 0, kick: 1, time: 0, dip: 0,
    };
  }

  // one stroke of the left (side 0) or right (side 1) arm, taking dur seconds; power < 1 is a weak, missed one
  function stroke(sw, side, dur, power = 1) {
    const a = sw.arm[side];
    a.t = 0; a.dur = dur; a.power = power;
  }
  function breathe(sw, ok) {
    sw.breath.t = 0;
    sw.breath.ok = ok;
    sw.breath.side = -sw.breath.side;
  }
  function act(sw, action) { if (sw.action !== action) { sw.action = action; sw.actT = 0; } }

  const yawFor = (stroke, dir) => (stroke === 'back' ? (dir > 0 ? PI / 2 : -PI / 2) : dir > 0 ? -PI / 2 : PI / 2);
  // the body's middle when the hands are at x (kept inside the pool, so a turn happens at the wall)
  function bodyX(sw, x, dir) {
    const r = REACH * sw.sc;
    return Math.max(r, Math.min(SW.pool.LEN - r, x - dir * r));
  }

  function update(sw, dt) {
    const p = sw.p, sc = sw.sc, k = 1 - Math.exp(-14 * dt);
    sw.time += dt;
    sw.actT += dt;
    sw.arm[0].t += dt; sw.arm[1].t += dt; sw.breath.t += dt;
    sw.ph += dt * (11 + 22 * Math.max(0, sw.kick - 1));
    sw.ball.visible = false;
    if (sw.mode === 'swim' || sw.mode === 'glide') swimPose(sw, dt, k);
    else if (sw.mode === 'dive') divePose(sw, dt);
    else standPose(sw, dt, k);
    if (sw.tag) sw.tag.position.set(0, sw.mode === 'swim' || sw.mode === 'glide' ? 0.95 : 2.35 * sc, 0);
  }

  function standPose(sw, dt, k) {
    const p = sw.p;
    p.root.rotation.set(0, 0, 0);
    p.root.position.set(0, 0, 0);
    p.rig.rotation.set(0, 0, 0);
    p.head.rotation.y = 0;
    const a = sw.action || 'stand';
    const ph = sw.time * 7;
    if (a === 'ready') {
      // take your marks: bent over, arms hanging toward the water
      P.pose(p, 0, 'stand', k);
      p.hips.rotation.x += (1.05 - p.hips.rotation.x) * k;
      p.armL.rotation.x += (1.1 - p.armL.rotation.x) * k;
      p.armR.rotation.x += (1.1 - p.armR.rotation.x) * k;
      p.hips.position.y = p.hipY - 0.12;
    } else if (a === 'cheer') {
      P.pose(p, ph, 'jump', k);
      p.root.position.y = Math.abs(Math.sin(sw.time * 6)) * 0.25;
    } else if (a === 'jumpshot') {
      // Teddy's 🏀 jump shot: up, shoot at the top, and the ball flies off
      const u = (sw.actT % 1.3) / 1.3;
      P.pose(p, ph, u < 0.15 ? 'stand' : 'jumpshot', u < 0.15 ? k : 1 - Math.exp(-24 * dt));
      p.root.position.y = Math.max(0, Math.sin(Math.min(1, Math.max(0, (u - 0.12) / 0.6)) * PI)) * 0.7;
      sw.ball.visible = true;
      const b = Math.max(0, (u - 0.45) / 0.55);
      sw.ball.position.set(0, (2.45 + b * 2.6 - b * b * 1.4) * sw.sc + p.root.position.y, -b * 1.6 * sw.sc);
    } else if (a === 'stand') {
      P.pose(p, ph * 0.3, 'stand', k);
      p.hips.position.y = p.hipY + Math.sin(sw.time * 2) * 0.01;
    } else P.pose(p, ph, a, k);
  }

  function divePose(sw, dt) {
    const p = sw.p, sc = sw.sc, u = sw.u;
    const tilt = sstep(0.05, 0.75, u);
    p.root.rotation.set(-PI / 2 * tilt - 0.45 * Math.sin(PI * sstep(0.3, 1, u)), 0, 0);
    p.root.position.set(0, -0.08 * tilt, REACH * sc * tilt);
    p.rig.rotation.set(0, 0, 0);
    p.hips.rotation.set(0, 0, 0);
    p.hips.position.y = p.hipY;
    p.head.rotation.set(0, 0, 0);
    const arms = u < 0.12 ? 1.1 : PI;
    p.armL.rotation.set(arms, 0, 0);
    p.armR.rotation.set(arms, 0, 0);
    p.legL.rotation.set(0.1, 0, 0);
    p.legR.rotation.set(0.1, 0, 0);
    if (p.fingers) for (const f of p.fingers) f.visible = false;
  }

  function swimPose(sw, dt, k) {
    const p = sw.p, sc = sw.sc, back = sw.stroke === 'back';
    p.root.rotation.set(back ? PI / 2 : -PI / 2, 0, 0);
    p.root.position.set(0, back ? -0.16 : -0.1, (back ? -1 : 1) * REACH * sc);
    p.hips.rotation.set(0, 0, 0);
    p.hips.position.y = p.hipY;
    if (p.fingers) for (const f of p.fingers) f.visible = false;
    let roll = 0;
    [p.armL, p.armR].forEach((arm, i) => {
      const a = sw.arm[i];
      let ang = PI;
      if (sw.mode === 'swim' && a.t < a.dur) {
        const u = ease(a.t / a.dur), full = PI * 2 * u * (a.power < 1 ? 0.5 : 1);
        ang = back ? PI + full : PI - full;
        if (a.power < 1 && u > 0.5) ang = back ? PI + PI * (1 - u) * 2 * 0.5 : PI - PI * (1 - u) * 2 * 0.5;
        roll += (i ? 1 : -1) * Math.sin(PI * (a.t / a.dur)) * 0.45;
      }
      arm.rotation.x = ang;
      arm.rotation.z = (i ? 1 : -1) * 0.12;
    });
    p.rig.rotation.y += (roll * (back ? -1 : 1) - p.rig.rotation.y) * k;
    // a breath: freestyle turns the head to the side for a moment; backstroke just puffs
    const b = sw.breath;
    p.head.rotation.y = !back && b.t < 0.55 ? b.side * Math.sin((PI * b.t) / 0.55) * 1.1 : 0;
    p.head.rotation.x = back ? 0.1 : -0.25;
    const amp = sw.mode === 'glide' ? 0.12 : 0.32;
    p.legL.rotation.x = Math.sin(sw.ph) * amp;
    p.legR.rotation.x = -Math.sin(sw.ph) * amp;
    p.legL.rotation.z = p.legR.rotation.z = 0;
  }

  // put a swimmer in the water at x (where his hands are), lane z, heading dir; dip (0..1) sinks him a little
  function placeSwim(sw, x, z, dir, dt) {
    const y = -0.45 * sw.dip;
    sw.holder.position.set(bodyX(sw, x, dir), y, z);
    const want = yawFor(sw.stroke, dir);
    if (sw.dir !== dir) { sw.dir = dir; sw.dip = 1; }
    let d = want - sw.yaw;
    while (d > PI) d -= 2 * PI;
    while (d < -PI) d += 2 * PI;
    sw.yaw += d * (dt == null ? 1 : 1 - Math.exp(-10 * dt));
    sw.holder.rotation.set(0, sw.yaw, 0);
    sw.dip = Math.max(0, sw.dip - (dt || 0) * 2.2);
  }
  function placeStand(sw, x, y, z, yaw) {
    sw.holder.position.set(x, y, z);
    sw.yaw = yaw;
    sw.holder.rotation.set(0, yaw, 0);
  }
  // world point of the hands / the feet, for splashes
  const tmp = new T.Vector3();
  function hand(sw, side) { sw.holder.updateMatrixWorld(true); return P.handWorld(sw.p, side ? 1 : -1, tmp).clone(); }
  function feet(sw) {
    const r = REACH * sw.sc;
    return new T.Vector3(sw.holder.position.x - sw.dir * r * 0.95, 0.02, sw.holder.position.z);
  }

  SW.swimmer = { create, update, stroke, breathe, act, placeSwim, placeStand, yawFor, bodyX, hand, feet, SCALE, REACH };
})();
