/* TT Swim Race: the page. Home (pick a race, who swims, each brother's level), the race (countdown, the beat strips
   and pads, the swimmers, the camera, your brother's turbo kick or the 2-player high five), pause, the podium and
   results, the keys and taps, and window.game for tests. The rules live in js/sim.js; this file only feeds them
   presses and draws what happens. */
(function () {
  'use strict';
  const T = THREE;
  const SW = window.SW, S = Kit.sound, sim = SW.sim, sfx = SW.sfx;
  const $ = (id) => document.getElementById(id);
  const KEY = 'swimTT.v1';
  const KIDS = ['teddy', 'tommy'];
  const MEDAL = ['🥇', '🥈', '🥉', '4️⃣'];

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  const store = Object.assign({ event: 'free', who: 'teddy', levels: { teddy: 'easy', tommy: 'easy' }, best: {}, wins: {} }, load());
  function save() { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }

  const G = {
    state: 'loading', W: null, players: [], racers: [], models: {}, faces: {}, faceImg: {}, pops: [], pads: [],
    manual: false, auto: null, last: 0, frameT: 0, cd: 0, overT: 0, celebrate: [], high5: 0, sound: false,
  };
  let ui = {}, L = null;

  // ---------------------------------------------------------------- home
  function buildHome() {
    const title = window.SW_TITLE, words = title.split(' ');
    ui.logo.querySelector('small').textContent = words.slice(0, -1).join(' ');
    ui.logo.querySelector('big').textContent = words.slice(-1)[0];
    ui.events.innerHTML = '';
    for (const ev of sim.EVENTS) {
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.ev = ev.id;
      b.setAttribute('role', 'radio');
      b.style.setProperty('--tile', { free: '#18d4ff', back: '#9b6bff', relay: '#3fe0b0' }[ev.id]);
      b.innerHTML = `<span class="emo">${ev.icon}</span><span class="nm">${ev.name}</span><span class="sub">${ev.id === 'relay' ? '2 × 25 M' : '50 M'}</span><span class="best"></span>`;
      tap(b, () => { if (store.event === ev.id && G.state === 'home') go(); else pickEvent(ev.id); });
      ui.events.appendChild(b);
    }
    for (const b of ui.who.querySelectorAll('button')) {
      const imgs = b.querySelectorAll('img');
      if (b.dataset.who === 'both') { imgs[0].src = G.faces.teddy; imgs[1].src = G.faces.tommy; } else imgs[0].src = G.faces[b.dataset.who];
      tap(b, () => pickWho(b.dataset.who));
    }
    ui.lvls.innerHTML = '';
    for (const id of KIDS) {
      const d = document.createElement('div');
      d.className = 'lvl';
      d.dataset.kid = id;
      d.innerHTML = `<img alt="" src="${G.faces[id]}"><button data-l="easy" aria-label="Easy"><span>🐣</span>EASY</button><button data-l="normal" aria-label="Normal"><span>🔥</span>NORMAL</button>`;
      for (const b of d.querySelectorAll('button')) tap(b, () => pickLevel(id, b.dataset.l));
      ui.lvls.appendChild(d);
    }
    tap(ui.goBtn, go);
    renderHome();
  }

  function kidsOf(who) { return who === 'both' ? KIDS.slice() : [who]; }
  function bestKey(event, level, ids) { return `${event}:${level}:${ids.join('+')}`; }
  const fmt = (t) => (t == null ? '' : t.toFixed(2));

  function renderHome() {
    for (const b of ui.events.children) {
      const on = b.dataset.ev === store.event;
      b.classList.toggle('on', on);
      b.setAttribute('aria-checked', on);
      const kids = kidsOf(store.who), ev = sim.EV[b.dataset.ev];
      let rows;
      if (ev.legs === 2) {
        const team = store.who === 'both' ? KIDS : [kids[0], Kit.roster.buddyFor(kids[0])];
        const lv = team.map((id) => store.levels[store.who === 'both' ? id : kids[0]]);
        rows = [[team[0], bestKey(ev.id, lv.every((v) => v === lv[0]) ? lv[0] : 'mixed', team)]];
      } else rows = kids.map((id) => [id, bestKey(ev.id, store.levels[id], [id])]);
      b.querySelector('.best').innerHTML = rows.filter(([, k]) => store.best[k]).map(([id, k]) => `<div>${kids.length > 1 && ev.legs === 1 ? `<img alt="" src="${G.faces[id]}">` : ''}🏅 ${fmt(store.best[k])}</div>`).join('');
    }
    for (const b of ui.who.querySelectorAll('button')) b.classList.toggle('on', b.dataset.who === store.who);
    for (const d of ui.lvls.children) {
      d.classList.toggle('hidden', !kidsOf(store.who).includes(d.dataset.kid));
      for (const b of d.querySelectorAll('button')) b.classList.toggle('on', b.dataset.l === store.levels[d.dataset.kid]);
    }
    placeHome();
  }
  function pickEvent(id) { store.event = id; save(); sfx('click'); renderHome(); }
  function pickWho(w) { store.who = w; save(); sfx('click'); renderHome(); }
  function pickLevel(id, l) { store.levels[id] = l; save(); sfx('click'); renderHome(); }

  // the kids on the deck by the pool, waving at you; the one who'll swim does his signature move
  function placeHome() {
    if (G.state !== 'home') return;
    const spots = { teddy: [10.5, 9.7], tommy: [12.1, 9.8], foxy: [9.6, 8.1], froggy: [13.1, 8.0] };
    for (const id in G.models) {
      const m = G.models[id], s = spots[id];
      m.holder.visible = true;
      m.mode = 'stand';
      SW.swimmer.placeStand(m, s[0], SW.pool.DECK, s[1], Math.PI + (s[0] - 11.3) * -0.08);
      const me = kidsOf(store.who).includes(id);
      SW.swimmer.act(m, id === 'tommy' ? (me ? 'peace' : 'wave') : id === 'teddy' ? (me ? 'boxing' : 'wave') : id === 'froggy' ? 'cheer' : 'wave');
    }
  }

  function goHome() {
    G.state = 'home';
    G.W = null;
    SW.buddy.clear();
    clearPads();
    for (const el of [ui.hud, ui.pause, ui.results, ui.buddyBtn, ui.high5Btn, ui.bigCount]) el.classList.add('hidden');
    ui.home.classList.remove('hidden');
    SW.pool.drawBoard([]);
    G.celebrate = [];
    G.players = [];
    layout();
    renderHome();
    S.music('title');
  }

  // ---------------------------------------------------------------- the race
  function go() { start(store.event, { who: store.who, levels: Object.assign({}, store.levels) }); }

  function start(event, o = {}) {
    initSound();
    const who = o.who || store.who, levels = Object.assign({}, store.levels, o.levels || {});
    const ids = kidsOf(who);
    const players = ids.map((id) => ({ id, level: levels[id] }));
    G.event = event;
    G.who = who;
    G.levels = levels;
    G.seed = o.seed != null ? o.seed : (Math.random() * 1e9) | 0;
    const W = (G.W = sim.create({ event, players, seed: G.seed, buddyFor: Kit.roster.buddyFor }));
    const first = Math.floor((SW.pool.LANES - W.lanes.length) / 2);
    for (const id in G.models) G.models[id].holder.visible = false;
    G.racers = W.lanes.map((lane, i) => ({ lane, pl: first + i, z: SW.pool.laneZ(first + i), models: lane.team.map((id) => G.models[id]), foam: 0 }));
    G.players = players.map((p, pi) => Object.assign({}, p, { pi, li: W.lanes.findIndex((l) => l.ctrl.includes(pi)) }));
    G.pops = players.map(() => null);
    G.cd = 0;
    G.overT = 0;
    G.dived = false;
    G.celebrate = [];
    SW.buddy.clear();
    for (const r of G.racers) {
      r.models.forEach((m, leg) => {
        m.holder.visible = true;
        m.kick = 1;
        m.dip = 0;
        m.arm.forEach((a) => (a.t = 9));
        if (leg === 0 && W.ev.start === 'wall') {
          m.mode = 'glide';
          m.stroke = 'back';
          m.dir = 1;
          SW.swimmer.placeSwim(m, 0, r.z, 1);
        } else {
          m.mode = 'stand';
          m.stroke = W.ev.stroke;
          const far = leg === 1;
          SW.swimmer.placeStand(m, far ? SW.pool.LEN + 0.42 : -0.42, SW.pool.blockTop, r.z, far ? Math.PI / 2 : -Math.PI / 2);
          SW.swimmer.act(m, far ? 'wave' : 'stand');
        }
        SW.swimmer.update(m, 0.016);
      });
    }
    SW.pool.drawBoard(W.lanes.map((l, i) => [String(G.racers[i].pl + 1), l.team.map((id) => Kit.roster.get(id).name).join(' & '), '']));
    for (const el of [ui.home, ui.pause, ui.results]) el.classList.add('hidden');
    ui.hud.classList.remove('hidden');
    buildMap();
    buildPads();
    const solo1 = players.length === 1;
    ui.buddyBtn.classList.toggle('hidden', !solo1);
    ui.high5Btn.classList.toggle('hidden', solo1);
    if (solo1) ui.buddyFace.src = G.faces[Kit.roster.buddyFor(players[0].id)];
    G.state = 'race';
    layout();
    S.music('pause');
    aimCamera(1, true);
  }

  // the race map at the top: everyone's face along the 50 m, with the turn (or the change-over) in the middle
  function buildMap() {
    ui.mapDots.innerHTML = '';
    G.racers.forEach((r, i) => {
      const img = document.createElement('img');
      img.alt = '';
      img.className = 'dot' + (r.lane.ctrl.some((c) => c >= 0) ? ' me' : '');
      img.style.top = `${(i / Math.max(1, G.racers.length - 1)) * 100}%`;
      r.dot = img;
      ui.mapDots.appendChild(img);
    });
    ui.mapMid.textContent = G.W.ev.legs === 2 ? '🤝' : '↩️';
  }

  function clearPads() { for (const p of G.pads) p.el.remove(); G.pads = []; }
  function buildPads() {
    clearPads();
    const two = G.players.length === 2;
    const keys = two ? [{ L: 'A', B: 'W', R: 'D' }, { L: '←', B: '↑', R: '→' }] : [{ L: '←', B: '↑', R: '→' }];
    G.players.forEach((p, pi) => {
      for (const b of ['L', 'B', 'R']) {
        const el = document.createElement('button');
        el.className = `pad pad${b}`;
        el.setAttribute('aria-label', { L: 'Left arm', B: 'Breathe', R: 'Right arm' }[b]);
        el.innerHTML = b === 'B' ? '<span class="emo">😮</span>' : `<span class="emo${b === 'L' ? ' flip' : ''}">✋</span><span class="arr">${b === 'L' ? '◀' : '▶'}</span>`;
        el.innerHTML += `<kbd>${keys[pi][b]}</kbd>`;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); initSound(); press(pi, b); });
        ui.pads.appendChild(el);
        G.pads.push({ el, pi, b });
      }
    });
  }

  function layout() {
    const w = innerWidth || 1, h = innerHeight || 1;
    G.Wd = w; G.Hd = h;
    SW.pool.resize(w, h);
    SW.hud.resize(w, h);
    const cs = getComputedStyle($('safe'));
    const safe = { l: parseFloat(cs.paddingLeft) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0 };
    if (G.state === 'home' || G.state === 'loading') {
      SW.pool.shift(w / h > 1.1 ? -0.3 : 0, w / h > 1.1 ? 0.04 : 0.3);
    } else if (G.state === 'results') {
      SW.pool.shift(w / h > 1.1 ? -0.28 : 0, w / h > 1.1 ? 0 : -0.3);
    } else SW.pool.shift(0, -0.1);
    if (!G.players.length) return;
    L = SW.hud.layout(G.players.length, w, h, safe);
    for (const p of G.pads) {
      const [x, y, s] = L.players[p.pi].pads[p.b];
      Object.assign(p.el.style, { left: x + 'px', top: y + 'px', width: s + 'px', height: s + 'px' });
    }
    const [bx, by, bs] = L.buddy;
    for (const el of [ui.buddyBtn, ui.high5Btn]) Object.assign(el.style, { left: bx + 'px', top: by + 'px', width: bs + 'px', height: bs + 'px' });
  }

  // a brother presses L, R or B
  function press(pi, b) {
    const p = G.players[pi], W = G.W;
    if (!p || !W || G.state !== 'race') return;
    flashPad(pi, b);
    const lane = W.lanes[p.li];
    if (lane.ctrl[lane.leg] !== pi) return; // the relay: not your leg yet (or any more)
    sim.press(W, p.li, b, simNow());
  }
  function simNow() {
    const W = G.W;
    const since = G.manual ? 0 : Math.max(0, Math.min(0.1, (performance.now() - G.frameT) / 1000));
    return W.t + W.acc + since;
  }
  function flashPad(pi, b) {
    for (const p of G.pads) if (p.pi === pi && p.b === b) {
      p.el.classList.add('down');
      clearTimeout(p.tm);
      p.tm = setTimeout(() => p.el.classList.remove('down'), 120);
    }
  }

  // ---------------------------------------------------------------- your brother, or a high five
  function callBuddy(pi = 0) {
    if (!G.W || G.state !== 'race') return;
    if (G.players.length === 2) return highFive();
    const p = G.players[pi];
    if (SW.buddy.call(p.li)) {
      ui.buddyBtn.classList.add('here');
      clearTimeout(ui.buddyBtn.tm);
      ui.buddyBtn.tm = setTimeout(() => ui.buddyBtn.classList.remove('here'), 7000);
    }
  }
  function highFive() {
    if (G.high5 > 0) return;
    G.high5 = 0.8;
    const W = G.W;
    toast('✋ HIGH FIVE! ✋', 'buddy');
    sfx('high5');
    const lanes = [...new Set(G.players.map((p) => p.li))];
    for (const li of lanes) { sim.turbo(W, li, sim.HIGH5_SECS); const m = swimmerOf(li); SW.pool.splash(m.holder.position.x, 0.1, m.holder.position.z, 10, 1.1); }
    SW.pool.cheer(1.5);
    G.h5sprite.visible = true;
    G.h5t = 0;
  }

  const swimmerOf = (li) => { const r = G.racers[li]; return r.models[Math.min(r.lane.leg, r.models.length - 1)]; };
  function swimmerPos(li) {
    const m = swimmerOf(li), v = m.holder.position.clone();
    v.y = Math.max(0.3, v.y + 0.5);
    return v;
  }

  // ---------------------------------------------------------------- toasts and the big countdown
  function toast(text, cls) {
    const d = document.createElement('div');
    d.className = 'toast ' + (cls || '');
    d.textContent = text;
    ui.toasts.appendChild(d);
    while (ui.toasts.children.length > 3) ui.toasts.firstChild.remove();
    setTimeout(() => d.remove(), 1900);
  }
  function bigCount(text, cls) {
    const el = ui.bigCount;
    el.classList.remove('hidden', 'anim', 'go', 'small');
    if (cls) el.classList.add(cls);
    el.textContent = text;
    void el.offsetWidth;
    el.classList.add('anim');
  }

  const COUNT = [[-2.3, 'TAKE YOUR MARKS!', 'small'], [-1.5, '3'], [-1.0, '2'], [-0.5, '1'], [0, 'GO!', 'go']];
  function countdown(W) {
    while (G.cd < COUNT.length && W.t >= COUNT[G.cd][0]) {
      const [, text, cls] = COUNT[G.cd++];
      bigCount(text, cls);
      if (G.cd === 1) {
        sfx('whistle');
        for (const r of G.racers) if (r.models[0].mode === 'stand') SW.swimmer.act(r.models[0], 'ready');
        const lv = G.players.map((p) => p.level);
        const hint = G.W.ev.stroke === 'back' ? 'ON YOUR BACK!' : null;
        if (lv.every((l) => l === 'easy')) toast('TAP ON THE BEAT!');
        else toast('LEFT, RIGHT... AND BREATHE!');
        if (hint) setTimeout(() => G.state === 'race' && toast(hint), 600);
      } else if (cls === 'go') sfx('go');
      else sfx('beep');
    }
  }

  // ---------------------------------------------------------------- one frame of the race
  function raceUpdate(dt) {
    const W = G.W;
    if (G.state === 'race') {
      if (G.auto) G.players.forEach((p, pi) => SW.checks.drive(W, p.li, pi, G.auto[pi], W.t + W.acc + dt + 0.01));
      sim.advance(W, dt);
      countdown(W);
      // once every brother is home, don't make them wait for the friends: finish the race (the same rules, at once)
      if (!W.over && G.players.every((p) => W.lanes[p.li].state === 'done')) {
        G.homeT = (G.homeT || 0) + dt;
        if (G.homeT > 2.2) for (let n = 0; !W.over && n < sim.LIMIT / sim.DT; n++) sim.step(W);
      } else G.homeT = 0;
    }
    for (const e of W.events.splice(0)) onEvent(W, e);
    for (const r of G.racers) placeRacer(W, r, dt);
    SW.buddy.update(dt);
    if (G.high5 > 0) G.high5 -= dt;
    if (G.h5sprite.visible) {
      G.h5t += dt;
      const ps = G.players.map((p) => swimmerOf(p.li).holder.position);
      G.h5sprite.position.set((ps[0].x + ps[1].x) / 2, 1.6 + G.h5t * 1.2, (ps[0].z + ps[1].z) / 2);
      G.h5sprite.material.opacity = Math.max(0, 1 - G.h5t / 1.1);
      G.h5sprite.scale.setScalar(1 + G.h5t * 0.8);
      if (G.h5t > 1.1) G.h5sprite.visible = false;
    }
    // the map and the clock
    for (const r of G.racers) r.dot.style.left = `${(r.lane.s / W.ev.dist) * 100}%`;
    for (const r of G.racers) if (r.dot.dataset.who !== r.lane.who) { r.dot.dataset.who = r.lane.who; r.dot.src = G.faces[r.lane.who]; }
    const mine = G.players.map((p) => W.lanes[p.li]);
    const shown = mine.length === 1 && mine[0].finishT != null ? mine[0].finishT : Math.max(0, W.t);
    ui.clock.textContent = W.t < 0 ? '0.0' : shown.toFixed(1);
    if (G.state === 'finish') {
      G.overT += dt;
      if (G.overT > 1.6) showResults();
    }
    aimCamera(1 - Math.exp(-3 * dt));
  }

  function onEvent(W, e) {
    const r = G.racers[e.li], lane = r.lane;
    const pi = G.players.findIndex((p) => p.li === e.li && (lane.ctrl[lane.leg] === p.pi || e.type === 'finish' || e.type === 'touch'));
    const m = r.models[Math.min(lane.leg, r.models.length - 1)];
    switch (e.type) {
      case 'swim': {
        const x = m.holder.position.x;
        SW.pool.splash(x, 0.05, r.z, 18, 1.3, 0.6);
        if (e.li === G.players[0].li || !G.dived) sfx('dive');
        G.dived = true;
        break;
      }
      case 'note': {
        const L = sim.lvl(lane);
        if (e.kind === 'B') SW.swimmer.breathe(m, e.grade !== 'miss');
        else {
          SW.swimmer.stroke(m, e.kind === 'L' ? 0 : 1, Math.max(0.5, Math.min(0.95, L.T * 1.15)), e.grade === 'miss' ? 0.5 : 1);
          if (e.grade !== 'miss') {
            const p = m.holder.position, d = m.dir;
            SW.pool.splash(p.x + d * 1.1 * m.sc, 0.05, p.z + (e.kind === 'L' ? -1 : 1) * 0.25 * d, e.grade === 'perfect' ? 7 : 4, 0.7, 0.15);
          }
        }
        if (pi >= 0) {
          const [text, color] = e.wrong ? ['WRONG ARM!', '#ff8fb5'] : SW.hud.GRADE[e.grade];
          G.pops[pi] = { text, color, t: W.t };
          if (e.grade === 'miss') sfx('miss');
          else if (e.kind === 'B') sfx('breath', e.grade);
          else sfx('stroke', e.grade);
          if (e.combo && e.combo % 10 === 0) toast(`🔥 ${e.combo} COMBO!`, 'combo');
        }
        break;
      }
      case 'splash':
        if (pi >= 0) { G.pops[pi] = { text: 'SPLASH!', color: '#9fdcff', t: W.t }; sfx('splash'); }
        SW.pool.splash(m.holder.position.x, 0.05, r.z, 3, 0.6, 0.3);
        break;
      case 'turn':
        SW.pool.splash(SW.pool.LEN - 0.4, 0.05, r.z, 16, 1.2, 0.5);
        if (pi >= 0) { sfx('turn'); toast('TURN!'); }
        break;
      case 'touch': {
        const m0 = r.models[0];
        m0.mode = 'stand';
        SW.swimmer.placeStand(m0, SW.pool.LEN - 0.6, -1.5 * m0.sc, r.z, Math.PI);
        SW.swimmer.act(m0, 'cheer');
        SW.pool.splash(SW.pool.LEN - 0.4, 0.05, r.z, 12, 1);
        if (pi >= 0) { sfx('touch'); toast(`GO, ${Kit.roster.get(lane.team[1]).name}!`, 'buddy'); }
        break;
      }
      case 'finish': {
        m.mode = 'stand';
        SW.swimmer.placeStand(m, 0.6, -1.5 * m.sc, r.z, Math.PI);
        const first = W.lanes.filter((l) => l.finishT != null).length === 1;
        SW.swimmer.act(m, first ? 'cheer' : 'wave');
        SW.pool.splash(0.4, 0.05, r.z, 12, 1);
        if (first) { SW.pool.cheer(3); sfx('cheer', true); }
        if (pi >= 0) {
          sfx('touch');
          const place = W.lanes.filter((l) => l.finishT != null).length;
          toast(`${MEDAL[place - 1] || ''} ${['1ST', '2ND', '3RD', '4TH'][place - 1]}!`, place === 1 ? 'combo' : '');
        }
        SW.pool.drawBoard(G.racers.map((rr) => [rr.lane.finishT != null ? MEDAL[order(W).indexOf(rr.lane)] || String(rr.pl + 1) : String(rr.pl + 1), rr.lane.team.map((id) => Kit.roster.get(id).name).join(' & '), rr.lane.finishT != null ? fmt(rr.lane.finishT) : '']));
        break;
      }
      case 'over':
        G.state = 'finish';
        G.overT = 0;
        clearPadsDown();
        break;
    }
  }
  const order = (W) => W.lanes.filter((l) => l.finishT != null).sort((a, b) => a.finishT - b.finishT);
  function clearPadsDown() { for (const p of G.pads) p.el.classList.remove('down'); }

  const sstep = (u) => u * u * (3 - 2 * u);
  function placeRacer(W, r, dt) {
    const lane = r.lane, leg = Math.min(lane.leg, r.models.length - 1), m = r.models[leg];
    const at = sim.where(W, lane);
    if (lane.state === 'dive') {
      const far = leg === 1, dir = far ? -1 : 1;
      const u = Math.max(0, Math.min(1, (W.t - lane.t0) / sim.DIVE.secs));
      m.mode = 'dive';
      m.u = u;
      m.stroke = W.ev.stroke;
      m.dir = dir;
      const fromX = far ? SW.pool.LEN + 0.42 : -0.42, toX = SW.swimmer.bodyX(m, at.x, dir);
      m.holder.position.set(fromX + (toX - fromX) * sstep(u), SW.pool.blockTop * (1 - u) + Math.sin(Math.PI * u) * 0.55, r.z);
      m.yaw = SW.swimmer.yawFor(W.ev.stroke, dir);
      m.holder.rotation.set(0, m.yaw, 0);
    } else if (lane.state === 'push' || lane.state === 'swim') {
      m.mode = lane.state === 'push' ? 'glide' : 'swim';
      m.stroke = W.ev.stroke;
      m.kick = lane.turbo > 0 ? 2.6 : 1;
      SW.swimmer.placeSwim(m, at.x, r.z, at.dir, dt);
      // the wake: little splashes at the feet, lots in a turbo kick
      r.foam += dt * (lane.turbo > 0 ? 40 : 3 + lane.v * 4);
      while (r.foam > 1) {
        r.foam -= 1;
        const f = SW.swimmer.feet(m);
        SW.pool.splash(f.x, 0.03, f.z, 1, lane.turbo > 0 ? 0.8 : 0.4, 0.2);
      }
    }
    for (const mm of r.models) SW.swimmer.update(mm, dt);
  }

  // the camera: from the side of the pool, following the brother (between the two when both swim)
  function aimCamera(k, snap) {
    const v = new T.Vector3(), at = new T.Vector3(), tall = G.Wd / G.Hd < 1;
    if (G.state === 'home') {
      v.set(11.3, 3.1, tall ? 21 : 17.6);
      at.set(11.3, 1.2, 9.1);
    } else if (G.state === 'results') {
      const P = SW.pool.PODIUM;
      v.set(P.x + 0.4, SW.pool.DECK + 2.7, P.z + (tall ? 10.5 : 8.4));
      at.set(P.x, SW.pool.DECK + 1.75, P.z);
    } else if (G.W) {
      const W = G.W;
      const ms = G.players.map((p) => swimmerOf(p.li).holder.position);
      const x = ms.reduce((s, p) => s + p.x, 0) / ms.length, z = ms.reduce((s, p) => s + p.z, 0) / ms.length;
      const spread = Math.abs(ms[0].x - ms[ms.length - 1].x);
      if (W.t < 0.6) {
        v.set(-2.4, 3.4, z + (tall ? 11 : 8));
        at.set(2.5, 0.4, z - 0.5);
      } else {
        const dir = W.lanes[G.players[0].li].s > SW.pool.LEN ? -1 : 1;
        const back = tall ? 10.5 : 7.4;
        v.set(x - dir * (tall ? 1 : 2.2), (tall ? 6.4 : 4.1) + spread * 0.25, z + back + spread * 0.5);
        at.set(x + dir * 1.8, -0.2, z - 0.6);
      }
    }
    SW.pool.aim(v, at, snap ? 1 : k);
  }

  // ---------------------------------------------------------------- pause
  function pause(on) {
    if (on && G.state === 'race') {
      G.state = 'paused';
      ui.pause.classList.remove('hidden');
      clearPadsDown();
      S.music('pause');
    } else if (!on && G.state === 'paused') {
      G.state = 'race';
      ui.pause.classList.add('hidden');
      G.frameT = performance.now();
    }
  }

  // ---------------------------------------------------------------- results and the podium
  function showResults() {
    const W = G.W;
    G.state = 'results';
    ui.hud.classList.add('hidden');
    ui.buddyBtn.classList.add('hidden');
    ui.high5Btn.classList.add('hidden');
    clearPads();
    SW.buddy.clear();
    const ranked = W.lanes.slice().sort((a, b) => (a.place || 9) - (b.place || 9));
    const humans = (l) => l.ctrl.some((c) => c >= 0);
    // best times and wins
    const news = new Set();
    for (const l of W.lanes) {
      if (!humans(l) || l.finishT == null) continue;
      const lvl = l.levels.every((v) => v === 'normal') ? 'normal' : l.levels.every((v) => v === 'easy') ? 'easy' : 'mixed';
      const key = bestKey(W.ev.id, lvl, l.team);
      if (!store.best[key] || l.finishT < store.best[key] - 0.0005) { if (store.best[key]) news.add(l); store.best[key] = Math.round(l.finishT * 1000) / 1000; }
      l.bestT = store.best[key];
      if (l.place === 1) for (const id of l.team) store.wins[id] = (store.wins[id] || 0) + 1;
    }
    save();
    // the podium: the winner does his signature move, everyone else cheers
    for (const id in G.models) G.models[id].holder.visible = false;
    G.celebrate = [];
    ranked.forEach((l, i) => {
      const spot = SW.pool.podiumSpots[Math.min(i, 2)];
      const ms = l.team.map((id) => G.models[id]);
      ms.forEach((m, j) => {
        m.holder.visible = true;
        m.mode = 'stand';
        const off = ms.length === 2 ? (j ? 0.3 : -0.3) : 0;
        const x = i < 3 ? spot.x + off : SW.pool.podiumSpots[2].x + 1.4 + off, y = i < 3 ? spot.y : SW.pool.DECK, z = i < 3 ? spot.z : spot.z + 0.6;
        SW.swimmer.placeStand(m, x, y, z, Math.PI);
        const sig = (l.place === 1 && (m.entry.signature || ['cheer'])) || null;
        if (sig) G.celebrate.push({ m, list: sig.map((s) => (s === 'wave' || s === 'jump' ? 'cheer' : s)), i: 0, t: 0 });
        SW.swimmer.act(m, sig ? G.celebrate[G.celebrate.length - 1].list[0] : i === 1 ? 'cheer' : 'wave');
        SW.swimmer.update(m, 0.016);
      });
    });
    SW.pool.burst(SW.pool.podiumSpots[0], 150);
    SW.pool.cheer(4);
    sfx('fanfare');
    sfx('cheer', true);
    S.music('over');
    // the panel
    const win = ranked[0];
    const names = (l) => l.team.map((id) => Kit.roster.get(id).name).join(' & ');
    const kidWon = humans(win);
    ui.rHead.textContent = kidWon ? `🏆 ${names(win)} ${win.team.length > 1 ? 'WIN' : 'WINS'}!` : G.players.length === 1 ? (W.lanes[G.players[0].li].place === 2 ? '🥈 GREAT SWIM!' : '💪 GOOD TRY!') : '🎉 GREAT RACE!';
    ui.rRows.innerHTML = '';
    for (const l of ranked) {
      const row = document.createElement('div');
      row.className = 'rrow' + (humans(l) ? ' me' : '') + (l === win ? ' win' : '');
      const faces = l.team.map((id) => `<img alt="" src="${G.faces[id]}">`).join('');
      let extra = '';
      if (humans(l)) {
        const stars = [0, 1, 2].map((i) => `<span class="${i < l.stars ? 'got' : ''}">⭐</span>`).join('');
        const c = l.counts;
        extra = `<div class="rstars">${stars}</div><div class="rcounts"><span>PERFECT ${c.perfect}</span><span>GREAT ${c.great}</span><span>OK ${c.ok}</span><span>MISS ${c.miss}</span></div>`
          + `<div class="rbest">${news.has(l) ? '<b class="rnew">NEW BEST!</b>' : ''}<span>BEST ${fmt(l.bestT)} s</span></div>`;
      }
      row.innerHTML = `<div class="rplace">${MEDAL[(l.place || 4) - 1] || ''}</div><div class="rwho">${faces}<span data-no-lang>${names(l)}</span></div><div class="rtime">${fmt(l.finishT)} s</div>${extra}`;
      ui.rRows.appendChild(row);
    }
    ui.results.classList.remove('hidden');
    layout();
    aimCamera(1, true);
  }

  function celebrateUpdate(dt) {
    for (const c of G.celebrate) {
      c.t += dt;
      if (c.t > 1.6) { c.t = 0; c.i = (c.i + 1) % c.list.length; SW.swimmer.act(c.m, c.list[c.i]); }
    }
    if (G.state === 'results') for (const id in G.models) if (G.models[id].holder.visible) SW.swimmer.update(G.models[id], dt);
    aimCamera(1 - Math.exp(-3 * dt));
  }

  function nextEvent() {
    const i = sim.EVENTS.findIndex((e) => e.id === G.event);
    store.event = sim.EVENTS[(i + 1) % sim.EVENTS.length].id;
    save();
    go();
  }

  // ---------------------------------------------------------------- input
  function tap(el, fn) {
    el.addEventListener('click', (e) => { e.preventDefault(); initSound(); fn(e); });
  }
  function initSound() {
    if (G.sound) return;
    G.sound = true;
    S.init();
    S.music(G.state === 'home' ? 'title' : 'pause');
  }
  function toggleMute() { const m = S.toggleMute(); ui.muteBtn.textContent = m ? '🔇' : '🔊'; }

  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.code;
    initSound();
    if (k === 'KeyM') { if (!e.repeat) toggleMute(); return; }
    if (e.repeat) return;
    const st = G.state;
    if (st === 'home') {
      const evs = sim.EVENTS.map((x) => x.id), i = evs.indexOf(store.event);
      if (k === 'ArrowLeft' || k === 'KeyA') pickEvent(evs[(i + evs.length - 1) % evs.length]);
      else if (k === 'ArrowRight' || k === 'KeyD') pickEvent(evs[(i + 1) % evs.length]);
      else if (k === 'Digit1') pickWho('teddy');
      else if (k === 'Digit2') pickWho('tommy');
      else if (k === 'Digit3') pickWho('both');
      else if (k === 'ArrowUp' || k === 'ArrowDown' || k === 'KeyW' || k === 'KeyS') {
        const kids = kidsOf(store.who);
        const id = kids.length === 2 ? (k === 'KeyW' || k === 'KeyS' ? 'teddy' : 'tommy') : kids[0];
        pickLevel(id, k === 'ArrowUp' || k === 'KeyW' ? 'easy' : 'normal');
      } else if (k === 'Enter' || k === 'Space' || k === 'NumpadEnter') go();
      else return;
      e.preventDefault();
      return;
    }
    if (st === 'results') {
      if (k === 'Enter' || k === 'Space') go();
      else if (k === 'KeyN') nextEvent();
      else if (k === 'Escape' || k === 'KeyH') goHome();
      else return;
      e.preventDefault();
      return;
    }
    if (k === 'KeyP' || k === 'Escape') { if (st === 'race') pause(true); else if (st === 'paused') pause(false); e.preventDefault(); return; }
    if (st === 'paused') { if (k === 'Enter' || k === 'Space') pause(false); return; }
    if (st !== 'race') return;
    const two = G.players.length === 2;
    const map = two
      ? { KeyA: [0, 'L'], KeyD: [0, 'R'], KeyW: [0, 'B'], KeyS: [0, 'B'], ArrowLeft: [1, 'L'], ArrowRight: [1, 'R'], ArrowUp: [1, 'B'], ArrowDown: [1, 'B'] }
      : { KeyA: [0, 'L'], KeyD: [0, 'R'], KeyW: [0, 'B'], KeyS: [0, 'B'], ArrowLeft: [0, 'L'], ArrowRight: [0, 'R'], ArrowUp: [0, 'B'], ArrowDown: [0, 'B'], Space: [0, 'B'] };
    if (map[k]) { press(map[k][0], map[k][1]); e.preventDefault(); }
    else if (k === 'KeyT' || k === 'Enter' || k === 'NumpadEnter') { callBuddy(0); e.preventDefault(); }
  }

  function bindInput() {
    addEventListener('keydown', onKey);
    tap(ui.pauseBtn, () => pause(true));
    tap(ui.muteBtn, toggleMute);
    tap(ui.pResume, () => pause(false));
    tap(ui.pRestart, () => { ui.pause.classList.add('hidden'); start(G.event, { who: G.who, levels: G.levels }); });
    tap(ui.pHome, goHome);
    tap(ui.rAgain, go);
    tap(ui.rNext, nextEvent);
    tap(ui.rHome, goHome);
    ui.buddyBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); initSound(); callBuddy(0); });
    ui.high5Btn.addEventListener('pointerdown', (e) => { e.preventDefault(); initSound(); highFive(); });
    S.onMute((m) => { ui.muteBtn.textContent = m ? '🔇' : '🔊'; });
    addEventListener('resize', layout);
    document.addEventListener('visibilitychange', () => {
      if (G.manual) return;
      if (document.hidden) { if (G.state === 'race') pause(true); S.suspend(); }
      else S.resume();
    });
    Kit.lang.onChange(() => SW.pool.drawBoard());
  }

  // ---------------------------------------------------------------- the loop
  function tick(dt, draw = true) {
    dt = Math.min(dt, 0.1);
    if ((innerWidth || 1) !== G.Wd || (innerHeight || 1) !== G.Hd) layout();
    SW.pool.update(dt);
    if (G.state === 'home') {
      for (const id in G.models) SW.swimmer.update(G.models[id], dt);
      aimCamera(1 - Math.exp(-4 * dt));
    } else if (G.state === 'race' || G.state === 'paused' || G.state === 'finish') {
      if (G.state !== 'paused') raceUpdate(dt);
    } else if (G.state === 'results') celebrateUpdate(dt);
    if (!draw) return;
    SW.pool.render();
    SW.hud.clear();
    if (G.W && (G.state === 'race' || G.state === 'paused' || G.state === 'finish') && L) drawStrips();
  }

  function drawStrips() {
    const W = G.W, now = W.t + W.acc;
    G.players.forEach((p, pi) => {
      const lane = W.lanes[p.li], mine = lane.ctrl[lane.leg] === pi;
      let wait = null;
      if (W.t < 0) wait = 'GET READY!';
      else if (lane.state === 'done') wait = `${MEDAL[order(W).indexOf(lane)] || ''} ${['1ST', '2ND', '3RD', '4TH'][order(W).indexOf(lane)] || ''}!`;
      else if (!mine) wait = lane.leg === 0 ? `CHEER FOR ${Kit.roster.get(lane.team[0]).name}!` : `GO, ${Kit.roster.get(lane.team[1]).name}!`;
      else if (lane.state === 'dive' && lane.leg === 1 && W.ev.legs === 2) wait = `GO, ${Kit.roster.get(lane.who).name}!`;
      SW.hud.strip({ rect: L.players[pi].strip, lane, W, now, face: G.faceImg[mine || W.t < 0 ? lane.who : p.id], pop: G.pops[pi], wait, level: lane.levels[Math.min(lane.leg, lane.levels.length - 1)] });
    });
  }

  function frame(ts) {
    requestAnimationFrame(frame);
    if (G.manual) { G.last = ts; return; }
    const dt = G.last ? (ts - G.last) / 1000 : 0.016;
    G.last = ts;
    G.frameT = performance.now();
    tick(dt);
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    for (const id of ['home', 'logo', 'events', 'who', 'lvls', 'goBtn', 'hud', 'mapDots', 'mapMid', 'clock', 'pauseBtn', 'muteBtn', 'pads', 'buddyBtn', 'buddyFace',
      'high5Btn', 'toasts', 'bigCount', 'pause', 'pResume', 'pRestart', 'pHome', 'results', 'rHead', 'rRows', 'rAgain', 'rNext', 'rHome']) ui[id] = $(id);
    ui.muteBtn.textContent = S.isMuted() ? '🔇' : '🔊';
    Kit.lang.setup({ button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'calc(max(10px, env(safe-area-inset-left, 0px)) + 52px)' } });
    G.faces = Kit.portraits(['teddy', 'tommy', 'foxy', 'froggy'].map((id) => Kit.roster.get(id)), { size: 160 });
    for (const id in G.faces) { const im = new Image(); im.src = G.faces[id]; G.faceImg[id] = im; }
    SW.pool.init($('game'));
    SW.hud.init($('hw'));
    for (const id of ['teddy', 'tommy', 'foxy', 'froggy']) {
      G.models[id] = SW.swimmer.create(id);
      SW.pool.scene.add(G.models[id].holder);
    }
    G.h5sprite = new T.Sprite(new T.SpriteMaterial({ map: Kit.gfx.emojiTexture('✋'), transparent: true, depthWrite: false }));
    G.h5sprite.visible = false;
    SW.pool.scene.add(G.h5sprite);
    SW.buddy.init({
      scene: SW.pool.scene,
      lane: (li) => G.W && G.W.lanes[li],
      swimmerOf, swimmerPos,
      relayMate: (li, id) => (G.W && G.W.ev.legs === 2 && G.W.lanes[li].team.includes(id) ? G.models[id] : null),
      mateIdle: (m) => (m.holder.position.y < 0 ? 'cheer' : 'wave'),
      turbo: (li) => sim.turbo(G.W, li, sim.BUDDY_SECS),
      toast, sfx,
      treat: (li, emoji, label, who) => { sim.snack(G.W, li); toast(`${emoji} ${label} FROM ${who}!`, 'treat'); sfx('treat'); },
    });
    buildHome();
    bindInput();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => SW.pool.drawBoard());
    G.state = 'home';
    layout();
    goHome();
    aimCamera(1, true);
    $('loading').classList.add('hidden');
    requestAnimationFrame(frame);
  }

  // ---------------------------------------------------------------- for tests: window.game
  window.game = {
    G,
    start(event = 'free', o = {}) { start(event, o); return this.info(); },
    // advance s seconds at 60 fps (drawing only the last frame); works with the pane hidden
    step(s = 1, fps = 60) {
      const n = Math.max(1, Math.round(s * fps));
      for (let i = 0; i < n; i++) tick(1 / fps, i === n - 1);
      return this.info();
    },
    hold(on = true) { G.manual = !!on; return G.manual; },
    // 'perfect', 'kid', 'idle', 'mash' (or null to hand it back): plays the brothers' presses
    autopilot(kind, o = {}) { G.auto = kind ? G.players.map((p, i) => SW.checks.bot(kind, Object.assign({ seed: 11 + i }, o))) : null; return !!G.auto; },
    press(b, pi = 0) { press(pi, b); },
    buddy(pi = 0) { callBuddy(pi); return SW.buddy.visit && SW.buddy.visit.state; },
    highFive,
    pause(on = true) { pause(on); return G.state; },
    home() { goHome(); return G.state; },
    results() { return G.state === 'results' ? ui.rRows.innerText : null; },
    check(o) { return SW.checks.run(Object.assign({ prove: true }, o)); },
    info() {
      const W = G.W;
      return {
        state: G.state, event: W && W.ev.id, t: W && +W.t.toFixed(3),
        lanes: W ? W.lanes.map((l) => ({ team: l.team.join('+'), leg: l.leg, state: l.state, s: +l.s.toFixed(2), v: +l.v.toFixed(2), air: +l.air.toFixed(2), combo: l.combo, counts: l.counts, finishT: l.finishT && +l.finishT.toFixed(3), place: l.place, turbo: +l.turbo.toFixed(2) })) : [],
      };
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
