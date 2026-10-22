/* TT Swim Race: calling your brother (Kit.roster.buddyFor: Tommy for Teddy, Teddy for Tommy). T, Enter or his face
   button, any time in a race, as often as you like.
   - Freestyle and backstroke: he pops up out of the water beside you at his buddyScale, says hello with his
     signature move (Teddy: boxing combo or 🏀 jump shot, taking turns; Tommy: the Y with ✌️), tosses you a treat
     (🍦 💧 🧃 🍪 🍉 🍌: your air is full again), says "TOMMY SAYS: TURBO KICK!", jumps in behind you and kicks
     like crazy for 5 seconds: a turbo kick (a faster glide and bigger strokes). Then he pops out with a splash.
   - The relay: he's your team-mate, already at the pool (waiting on his block, or resting at the wall after his
     leg), so he does his signature move from there, tosses the treat across and gives the turbo kick the same way.
   Calling again while he's there tosses another treat and starts the 5 seconds again. */
(function () {
  'use strict';
  const T = THREE;
  const SW = (window.SW = window.SW || {});
  const { pick, emojiTexture } = Kit.gfx;
  const TREATS = [['🍦', 'ICE CREAM'], ['💧', 'WATER'], ['🧃', 'JUICE BOX'], ['🍪', 'COOKIE'], ['🍉', 'WATERMELON'], ['🍌', 'BANANA']];
  const POP = 0.35, SIG = 1.4, TOSS = 0.6, DIVE = 0.5;

  let api = null;
  const own = {};     // the visiting brothers we made (solo races), one each
  const treats = [];  // flying treats
  let visit = null;   // { li, kid, buddy (swimmer), mate (relay), state, t, calls }
  const texCache = {};

  function init(a) { api = a; }

  function buddyModel(id) {
    if (!own[id]) {
      const e = Kit.roster.get(id);
      own[id] = SW.swimmer.create(id, { scale: e.buddyScale || 0.8 });
      own[id].holder.visible = false;
      api.scene.add(own[id].holder);
    }
    return own[id];
  }

  function clear() {
    for (const id in own) own[id].holder.visible = false;
    for (const tr of treats) api.scene.remove(tr.s);
    treats.length = 0;
    visit = null;
  }

  // player 0 calls his brother. Returns false when there's nothing to do (race not on).
  function call(li) {
    const lane = api.lane(li);
    if (!lane || lane.state === 'done') return false;
    const kid = lane.who;
    const id = Kit.roster.buddyFor(kid);
    if (visit && visit.li === li) {
      visit.calls++;
      if (visit.state === 'kick' || visit.mate) {
        toss(visit);
        say(visit);
        api.turbo(li);
        if (visit.state === 'kick') visit.t = 0;
      } else visit.extra = (visit.extra || 0) + 1;
      return true;
    }
    const v = { li, kid, id, state: 'pop', t: 0, calls: 1, extra: 0 };
    const mate = api.relayMate(li, id);
    if (mate) {
      v.mate = mate;
      v.state = 'sig';
      SW.swimmer.act(mate, sigMove(id, v.calls));
    } else {
      v.buddy = buddyModel(id);
      v.buddy.holder.visible = true;
      v.buddy.mode = 'stand';
      SW.swimmer.act(v.buddy, 'cheer');
    }
    visit = v;
    api.sfx('buddy');
    return true;
  }

  let sigCount = 0;
  function sigMove(id, n) {
    const e = Kit.roster.get(id), list = (e && e.signature) || ['wave'];
    return list[sigCount++ % list.length];
  }

  function say(v) { api.toast(`${Kit.roster.get(v.id).name} SAYS: TURBO KICK!`, 'buddy'); }

  function toss(v) {
    const [emoji, label] = pick(TREATS);
    if (!texCache[emoji]) texCache[emoji] = emojiTexture(emoji);
    const s = new T.Sprite(new T.SpriteMaterial({ map: texCache[emoji], depthWrite: false }));
    s.scale.setScalar(0.7);
    const from = (v.mate || v.buddy).holder.position.clone();
    from.y += v.mate && v.mate.holder.position.y < 0 ? 1.6 : 2.0;
    api.scene.add(s);
    treats.push({ s, from, t: 0, li: v.li, emoji, label, who: Kit.roster.get(v.id).name });
  }

  function update(dt) {
    for (let i = treats.length - 1; i >= 0; i--) {
      const tr = treats[i];
      tr.t += dt;
      const u = Math.min(1, tr.t / TOSS), to = api.swimmerPos(tr.li);
      tr.s.position.lerpVectors(tr.from, to, u);
      tr.s.position.y += Math.sin(Math.PI * u) * 2.2;
      tr.s.material.rotation = u * 6;
      if (u >= 1) {
        api.scene.remove(tr.s);
        treats.splice(i, 1);
        api.treat(tr.li, tr.emoji, tr.label, tr.who);
      }
    }
    const v = visit;
    if (!v) return;
    v.t += dt;
    const lane = api.lane(v.li);
    if (v.mate) {
      // the relay: from his spot
      if (v.state === 'sig' && v.t >= SIG) { v.state = 'toss'; v.t = 0; toss(v); }
      else if (v.state === 'toss' && v.t >= TOSS) { v.state = 'done'; say(v); api.turbo(v.li); api.sfx('turbo'); SW.swimmer.act(v.mate, api.mateIdle(v.mate)); visit = null; }
      return;
    }
    const b = v.buddy, sw = api.swimmerOf(v.li), sp = sw.holder.position;
    // he pops up out of the water right beside you (on the camera's side of your lane), up to his chest
    const z = sp.z + SW.pool.LW * 0.45, x = Math.max(0.8, Math.min(SW.pool.LEN - 0.8, sp.x + sw.dir * 0.6));
    if (v.state === 'pop' || v.state === 'sig' || v.state === 'toss') {
      b.mode = 'stand';
      const rest = -1.5 * b.sc, s = v.state === 'pop' ? Math.min(1, v.t / POP) : 1;
      SW.swimmer.placeStand(b, x, rest - (1 - s) * 1.6 + (v.state === 'pop' ? Math.sin(Math.PI * s) * 0.5 : 0), z, Math.PI);
      b.holder.scale.setScalar(1);
      if (v.state === 'pop' && v.t < dt * 1.5) SW.pool.splash(x, 0.05, z, 16, 1.2, 0.4);
      if (v.state === 'pop' && v.t >= POP) { v.state = 'sig'; v.t = 0; SW.swimmer.act(b, sigMove(v.id, v.calls)); }
      else if (v.state === 'sig' && v.t >= SIG) { v.state = 'toss'; v.t = 0; SW.swimmer.act(b, 'wave'); toss(v); for (let i = 0; i < v.extra; i++) setTimeout(() => visit === v && toss(v), 250 * (i + 1)); }
      else if (v.state === 'toss' && v.t >= TOSS) { v.state = 'dive'; v.t = 0; say(v); b.from = b.holder.position.clone(); }
    } else if (v.state === 'dive') {
      const u = Math.min(1, v.t / DIVE), dir = sw.dir;
      const to = new T.Vector3(sp.x - dir * 1.9, 0, sp.z);
      b.mode = 'dive';
      b.u = u;
      b.stroke = 'free';
      b.holder.position.lerpVectors(b.from, to, u);
      b.holder.position.y += Math.sin(Math.PI * u) * 0.9;
      b.holder.rotation.set(0, SW.swimmer.yawFor('free', dir), 0);
      b.yaw = b.holder.rotation.y;
      if (u >= 1) { v.state = 'kick'; v.t = 0; api.turbo(v.li); api.sfx('turbo'); SW.pool.splash(to.x, 0, to.z, 14, 1.2); }
    } else if (v.state === 'kick') {
      b.mode = 'glide';
      b.stroke = 'free';
      b.kick = 3;
      b.dir = sw.dir;
      // right behind your feet, pushing
      const fx = sp.x - sw.dir * (SW.swimmer.REACH * (sw.sc + b.sc) + 0.1);
      b.holder.position.set(fx, -0.05, sp.z);
      b.yaw = SW.swimmer.yawFor('free', sw.dir);
      b.holder.rotation.set(0, b.yaw, 0);
      if (Math.random() < dt * 30) SW.pool.splash(fx - sw.dir * 0.9, 0.05, sp.z, 2, 0.7, 0.25);
      if (v.t >= SW.sim.BUDDY_SECS || !lane || lane.state === 'done' || lane.state === 'dive') {
        SW.pool.splash(fx, 0, sp.z, 12, 1);
        b.holder.visible = false;
        b.kick = 1;
        visit = null;
      }
    }
    if (b && b.holder.visible) SW.swimmer.update(b, dt);
  }

  SW.buddy = { init, call, update, clear, TREATS, get visit() { return visit; } };
})();
