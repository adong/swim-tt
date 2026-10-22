/* TT Swim Race: the rules, with no drawing. Three races (50 m freestyle, 50 m backstroke, the 2 x 25 m relay with your
   brother), the beat every swimmer strokes to, judging each press, breathing, speed, turns, the relay change-over,
   the CPU friends, places and stars. It runs the same in the page and in node (tools/check.js).

   Every lane has its own beat track: a note on every beat, an arm (L, R, L, R...) or a breath (B). Press the right
   button as the note reaches the line: PERFECT, GREAT or OK gives a stroke a push forward, the closer the bigger.
   Breaths fill your air; run low on air and your strokes push less. The crowd of notes is only a guide: what moves
   you is the timing.
   - One press per note: a press up to half a beat early takes the next note, so a press far off the beat is a MISS
     that uses it up. Mashing gets mostly MISSes, never a faster swim. A press with no note near is a SPLASH (a tiny
     slow-down).
   - Everyone always glides forward a little, so every race ends, even if nobody presses anything.
   - Fair at any frame rate: the race runs in fixed 1/120 s steps. A press is stamped with the time it happened and
     waits in a queue; each step judges the presses that happened before it ends, then moves everyone. */
(function () {
  'use strict';
  const SW = (window.SW = window.SW || {});

  const DT = 1 / 120;
  const COUNT_N = 288;          // TAKE YOUR MARKS 2.4 s (288 steps) before GO
  const POOL = 25;              // the pool is 25 m long: a 50 m race is there and back
  const AHEAD = 4;              // notes are known this far ahead (the beat strip shows them coming)
  const DIVE = { secs: 0.9, dist: 3.2, v: 1.5 };  // off the block: the same for everyone
  const PUSH = { secs: 0.9, dist: 2.2, v: 1.3 };  // backstroke starts in the water, pushing off the wall
  const LEAD = 0.6;             // the first note comes this long after you start swimming
  const DRAG = 0.9;             // between strokes you slow back toward your glide speed
  const VMAX = 3.4;
  const TURN = 0.45;            // a turn at the far wall: a push off it
  const Q = { perfect: 1, great: 0.75, ok: 0.45, miss: 0 };
  const REFILL = { perfect: 1, great: 0.9, ok: 0.7, miss: 0 };
  const SPLASH = 0.94;          // a stray press: speed x 0.94
  const TURBO = { base: 0.55, imp: 1.3 };   // your brother's turbo kick: a faster glide and bigger strokes
  const BUDDY_SECS = 5, HIGH5_SECS = 1.5;
  const LIMIT = 200;            // a safety net: no race can run longer than this

  // 🐣 EASY (Tommy, 5): a slow beat, wide timing, and any button counts for any note (only the timing matters),
  // a breath every 8 beats. 🔥 NORMAL (Teddy, 8): a quicker beat, tight timing, the right arm (left, right, left...)
  // and the breath button on the breath notes. Strokes push more on EASY because there are fewer of them: a perfect
  // swim is as fast on either level, so the brothers can race each other on their own levels.
  const LEVEL = {
    easy: { T: 0.9, win: [0.12, 0.2, 0.3], any: true, pattern: { free: 'LRLRLRLB', back: 'LRLRLB' }, air: 0.06, base: 0.62 },
    normal: { T: 0.68, win: [0.06, 0.11, 0.17], any: false, pattern: { free: 'LRLBRLRB', back: 'LRB' }, air: 0.15, base: 0.62 },
  };
  for (const k in LEVEL) LEVEL[k].imp = LEVEL[k].T * 0.9; // the same push per second on both levels

  const EVENTS = [
    { id: 'free', icon: '🏊', name: 'FREESTYLE', dist: 50, stroke: 'free', start: 'dive', legs: 1 },
    { id: 'back', icon: '🙃', name: 'BACKSTROKE', dist: 50, stroke: 'back', start: 'wall', legs: 1 },
    { id: 'relay', icon: '🤝', name: 'RELAY', dist: 50, stroke: 'free', start: 'dive', legs: 2 },
  ];
  const EV = {};
  EVENTS.forEach((e) => (EV[e.id] = e));

  // the CPU friends: the chance of a PERFECT, GREAT or OK on each note (the rest are misses). On EASY they're
  // beatable by a 5-year-old who taps near the beat; on NORMAL Foxy needs good timing to beat.
  const CPU = {
    easy: { foxy: [0.05, 0.2, 0.35], froggy: [0.05, 0.15, 0.3] },
    normal: { foxy: [0.3, 0.35, 0.2], froggy: [0.2, 0.35, 0.25] },
  };

  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Who swims where. players: [{ id, level }] (1 or 2 brothers). Solo races: Foxy, the brother(s), Froggy.
  // The relay: team Teddy & Tommy against team Foxy & Froggy; with 1 player he swims both legs (his brother's too).
  function lineup(event, players, buddyFor) {
    const ev = EV[event];
    const cpuLevel = players.some((p) => p.level === 'easy') ? 'easy' : 'normal';
    const cpuLane = (ids) => ({ team: ids, levels: ids.map(() => cpuLevel), cpu: ids.slice(), ctrl: ids.map(() => -1) });
    if (ev.legs === 2) {
      const a = players[0], b = players[1] || { id: buddyFor(a.id), level: a.level };
      return [{ team: [a.id, b.id], levels: [a.level, b.level], cpu: [null, null], ctrl: [0, players[1] ? 1 : 0] }, cpuLane(['foxy', 'froggy'])];
    }
    const kids = players.map((p, i) => ({ team: [p.id], levels: [p.level], cpu: [null], ctrl: [i] }));
    return [cpuLane(['foxy'])].concat(kids, [cpuLane(['froggy'])]);
  }

  // opts: { event, players: [{ id, level }], seed, buddyFor, fail, events }
  function create(opts) {
    const ev = EV[opts.event || 'free'];
    const buddyFor = opts.buddyFor || ((id) => (id === 'tommy' ? 'teddy' : 'tommy'));
    const lanes = (opts.lanes || lineup(ev.id, opts.players, buddyFor)).map((l, i) => ({
      i, team: l.team, levels: l.levels, cpu: l.cpu, ctrl: l.ctrl, leg: 0, who: l.team[0],
      s: 0, v: 0, state: 'block', t0: 0, s0: 0, legStart: null, notes: [], k: 0, air: 1,
      combo: 0, bestCombo: 0, counts: { perfect: 0, great: 0, ok: 0, miss: 0 }, points: 0, total: 0, splash: 0,
      finishT: null, touchT: null, turnT: null, place: null, turbo: 0, turbos: 0,
      rnd: rng(((opts.seed || 1) * 7919 + i * 104729) >>> 0),
    }));
    const W = { ev, lanes, n: 0, t: -COUNT_N * DT, acc: 0, queue: [], seq: 0, over: false, fail: opts.fail || null, events: opts.events === false ? null : [] };
    return W;
  }

  const lvl = (lane) => LEVEL[lane.levels[Math.min(lane.leg, lane.levels.length - 1)]];
  const human = (lane) => lane.ctrl[lane.leg] >= 0;
  const swimming = (lane) => lane.state === 'dive' || lane.state === 'push' || lane.state === 'swim';
  const airMult = (air) => (air >= 0.4 ? 1 : 0.55 + air * 1.125);
  function emit(W, lane, type, more) { if (W.events) W.events.push(Object.assign({ li: lane.i, type, t: W.t }, more)); }

  function startLeg(W, lane, t) {
    const P = W.ev.start === 'wall' && lane.leg === 0 ? PUSH : DIVE;
    lane.state = P === PUSH ? 'push' : 'dive';
    lane.t0 = t;
    lane.s0 = lane.s;
    lane.legStart = t + P.secs;
    lane.notes = [];
    lane.k = 0;
    lane.air = 1;
    lane.who = lane.team[lane.leg];
    emit(W, lane, lane.state, { leg: lane.leg });
  }

  // the beat track: notes up to AHEAD seconds from now; a CPU swimmer decides how well he'll hit each note as it appears
  function notesAhead(W, lane, until) {
    if (!swimming(lane)) return;
    const L = lvl(lane), pat = L.pattern[W.ev.stroke];
    for (;;) {
      const t = lane.legStart + LEAD + lane.k * L.T;
      if (t > until) break;
      const note = { t, kind: pat[lane.k % pat.length], k: lane.k, grade: null, off: 0, leg: lane.leg };
      lane.notes.push(note);
      lane.k++;
      const cpu = lane.cpu[lane.leg];
      if (cpu) {
        const p = CPU[lane.levels[lane.leg]][cpu], w = L.win, r = lane.rnd(), u = lane.rnd(), sign = lane.rnd() < 0.5 ? -1 : 1;
        let off = null;
        if (r < p[0]) off = (u * 2 - 1) * w[0] * 0.9;
        else if (r < p[0] + p[1]) off = sign * (w[0] + (0.05 + 0.9 * u) * (w[1] - w[0]));
        else if (r < p[0] + p[1] + p[2]) off = sign * (w[1] + (0.05 + 0.9 * u) * (w[2] - w[1]));
        if (off !== null) press(W, lane.i, note.kind, t + off);
      }
    }
  }

  // a press of 'L' (left arm), 'R' (right arm) or 'B' (breathe), at game time ts
  function press(W, li, button, ts) {
    const item = { li, b: button, ts, seq: W.seq++ };
    let i = W.queue.length;
    while (i > 0 && W.queue[i - 1].ts > ts) i--;
    W.queue.splice(i, 0, item);
  }

  function expire(W, lane, ts) {
    const L = lvl(lane);
    for (const n of lane.notes) if (!n.grade && n.leg === lane.leg && n.t + L.win[2] < ts) apply(W, lane, n, 'miss', null, false);
  }

  function judgeOff(off, L) {
    const a = Math.abs(off);
    return a <= L.win[0] ? 'perfect' : a <= L.win[1] ? 'great' : a <= L.win[2] ? 'ok' : 'miss';
  }

  function hit(W, lane, b, ts) {
    if (!swimming(lane) || ts < lane.t0) return; // before GO, or while your brother swims his leg: nothing happens
    expire(W, lane, ts);
    const L = lvl(lane);
    const note = lane.notes.find((n) => !n.grade && n.leg === lane.leg);
    if (W.fail === 'mash') {
      // broken on purpose: no "one press per note" rule and no splash, so mashing finds every note's best moment
      if (!note || Math.abs(ts - note.t) > L.win[2]) return;
    } else if (!note || ts < note.t - Math.max(L.win[2], L.T * 0.5)) {
      lane.splash++;
      lane.combo = 0;
      lane.v *= SPLASH;
      emit(W, lane, 'splash', { b });
      return;
    }
    let off = ts - note.t;
    if (W.fail === 'judge') off += 0.09; // broken on purpose: the judge's clock is 90 ms off
    const wrong = !L.any && b !== note.kind;
    apply(W, lane, note, wrong ? 'miss' : judgeOff(off, L), off, wrong, b);
  }

  function apply(W, lane, note, grade, off, wrong, b) {
    const L = lvl(lane);
    note.grade = grade;
    note.off = off;
    note.wrong = !!wrong;
    lane.counts[grade]++;
    lane.total++;
    lane.points += Q[grade];
    if (grade === 'miss') lane.combo = 0;
    else lane.bestCombo = Math.max(lane.bestCombo, ++lane.combo);
    const breath = note.kind === 'B';
    if (breath) lane.air = Math.min(1, lane.air + REFILL[grade]);
    else lane.air = Math.max(0, lane.air - L.air);
    if (grade !== 'miss') {
      const boost = L.imp * Q[grade] * airMult(lane.air) * (lane.turbo > 0 ? TURBO.imp : 1);
      lane.v = Math.min(VMAX, lane.v + boost);
    }
    emit(W, lane, 'note', { grade, kind: note.kind, wrong: !!wrong, b: b || null, off, combo: lane.combo });
  }

  function step(W) {
    const t = W.t, tEnd = t + DT;
    if (W.n === COUNT_N) for (const lane of W.lanes) startLeg(W, lane, 0);
    for (const lane of W.lanes) notesAhead(W, lane, tEnd + AHEAD);
    while (W.queue.length && W.queue[0].ts < tEnd) {
      const q = W.queue.shift();
      hit(W, W.lanes[q.li], q.b, q.ts);
    }
    const F = Math.exp(-DRAG * DT);
    for (const lane of W.lanes) {
      if (swimming(lane)) expire(W, lane, tEnd);
      if (lane.state === 'dive' || lane.state === 'push') {
        const P = lane.state === 'dive' ? DIVE : PUSH;
        const u = (tEnd - lane.t0) / P.secs;
        if (u >= 1) { lane.state = 'swim'; lane.s = lane.s0 + P.dist; lane.v = Math.max(lane.v, P.v); emit(W, lane, 'swim'); }
        else lane.s = lane.s0 + P.dist * (1 - (1 - u) * (1 - u));
      } else if (lane.state === 'swim') {
        const L = lvl(lane);
        const base = W.fail === 'noBase' ? 0 : L.base + (lane.turbo > 0 ? TURBO.base : 0);
        lane.v = Math.min(VMAX, base + (lane.v - base) * F);
        const s0 = lane.s, s1 = s0 + lane.v * DT;
        const at = (d) => t + (DT * (d - s0)) / (s1 - s0); // exactly when, inside this step, the swimmer reached d
        if (W.ev.legs === 2 && lane.leg === 0 && s1 >= POOL) {
          lane.touchT = at(POOL);
          lane.s = POOL;
          emit(W, lane, 'touch', { who: lane.who });
          W.queue = W.queue.filter((q) => q.li !== lane.i || q.ts <= lane.touchT); // a CPU's planned presses for the leg that ended
          lane.leg = 1;
          startLeg(W, lane, lane.touchT);
        } else if (s1 >= W.ev.dist) {
          lane.finishT = at(W.ev.dist);
          lane.s = W.ev.dist;
          lane.state = 'done';
          lane.v = 0;
          emit(W, lane, 'finish', { time: lane.finishT });
        } else {
          if (W.ev.legs === 1 && lane.turnT === null && s0 < POOL && s1 >= POOL) {
            lane.turnT = at(POOL);
            lane.v = Math.min(VMAX, lane.v + TURN);
            emit(W, lane, 'turn');
          }
          lane.s = s1;
        }
      }
      if (lane.turbo > 0) lane.turbo = Math.max(0, lane.turbo - DT);
    }
    W.n++;
    W.t = (W.n - COUNT_N) * DT;
    if (!W.over && (W.lanes.every((l) => l.state === 'done') || W.t > LIMIT)) finish(W);
  }

  // move the race on by dt seconds of real time (any frame rate): whole fixed steps only
  function advance(W, dt) {
    if (W.fail === 'fps') for (const q of W.queue) if (q.ts < W.t + dt) q.ts = W.t; // broken on purpose: judged on frame times
    W.acc += dt;
    while (W.acc >= DT - 1e-9 && !W.over) { step(W); W.acc -= DT; }
    if (W.over) W.acc = 0;
  }

  function finish(W) {
    W.over = true;
    const done = W.lanes.filter((l) => l.finishT !== null).sort((a, b) => a.finishT - b.finishT);
    done.forEach((l, i) => (l.place = i > 0 && Math.abs(l.finishT - done[i - 1].finishT) < 0.0005 ? done[i - 1].place : i + 1));
    for (const l of W.lanes) {
      l.acc = l.total ? l.points / l.total : 0;
      l.stars = stars(l.acc, l.levels.every((v) => v === 'easy'));
    }
    emit(W, W.lanes[0], 'over');
  }

  // stars from the timing: how close to a perfect swim your presses were (PERFECT 1, GREAT 0.75, OK 0.45)
  function stars(acc, easy) {
    const s = acc >= 0.85 ? 3 : acc >= 0.65 ? 2 : acc >= 0.4 ? 1 : 0;
    return easy ? Math.max(1, s) : s;
  }

  // the turbo kick from your brother (or a high five: a short one for both)
  function turbo(W, li, secs) {
    const lane = W.lanes[li];
    if (!lane || lane.state === 'done') return false;
    lane.turbo = Math.max(lane.turbo, secs || BUDDY_SECS);
    lane.turbos++;
    emit(W, lane, 'turbo', { secs: lane.turbo });
    return true;
  }

  // a treat from your brother: a big breath of air
  function snack(W, li) {
    const lane = W.lanes[li];
    if (lane) lane.air = 1;
  }

  // where a swimmer is in the pool: x along it (0 = the start wall) and which way he's heading
  function where(W, lane) {
    const s = lane.s;
    return s <= POOL ? { x: s, dir: 1 } : { x: W.ev.dist - s, dir: -1 };
  }

  // the next notes of a lane, for the beat strip: unjudged ones and the ones judged a moment ago
  function upcoming(W, lane, back, ahead) {
    return lane.notes.filter((n) => n.leg === lane.leg && n.t > W.t - back && n.t < W.t + ahead);
  }

  SW.sim = {
    DT, COUNT: COUNT_N * DT, POOL, LEVEL, EVENTS, EV, CPU, Q, DIVE, PUSH, LEAD, TURBO, BUDDY_SECS, HIGH5_SECS, LIMIT,
    rng, lineup, create, press, step, advance, turbo, snack, where, upcoming, judgeOff, stars, airMult, lvl, human, swimming,
  };
})();
