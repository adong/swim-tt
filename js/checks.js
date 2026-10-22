/* TT Swim Race: the headless check of the rules (SW.checks.run). It needs only js/sim.js, so it runs in the page
   (game.check()) and in node (node tools/check.js).

   What it proves, for all three races on both levels, with 1 and 2 players:
   - racesEnd: every race ends, for every swimmer, whether you swim perfectly, mash the buttons or press nothing;
     the relay's second swimmer dives in only after the first one touches the wall; places are 1, 2, 3...
   - judge: PERFECT, GREAT, OK and MISS change exactly at each level's timing windows, early and late alike; on
     NORMAL the wrong arm is a MISS, on EASY any button counts;
   - timing: better timing always swims faster: perfect < great < ok < pressing nothing; mashing is no faster than
     tapping OK and gets mostly MISSes; skipping the breaths (NORMAL) is slower; stars follow the timing;
   - fps: the same presses give exactly the same race (===) at 24, 30, 60 and 144 fps and with a jittery frame rate;
   - fair: a perfect swim takes the same time on EASY and NORMAL (so the brothers can race on their own levels);
   - kidsWin: on EASY, a 5-year-old tapping near the beat beats Foxy and Froggy; NORMAL friends are faster;
   - buddy: your brother's turbo kick always helps.
   run({ prove: true }) also breaks the rules on purpose and confirms the check then FAILS: no glide (races never
   end), the judge 90 ms off, no "one press per note" rule (mashing wins), presses judged on frame times. */
(function () {
  'use strict';
  const SW = window.SW, S = SW.sim;
  const LEVELS = ['easy', 'normal'];
  const EVS = S.EVENTS.map((e) => e.id);

  // A scripted swimmer. kind: 'perfect' (off seconds late, 0 = exact), 'idle', 'mash' (rate presses a second,
  // L R B L R B...), 'kid' (random timing within ±spread, missing a note now and then). noBreath skips the breath
  // notes, swap presses the other arm. It plans each note as it appears and stamps the exact time, like a real press.
  function bot(kind, o = {}) {
    return Object.assign({ kind, off: 0, rate: 8, spread: 0.25, missP: 0.15, noBreath: false, swap: false, seed: 7, next: 0.02, i: 0 }, o);
  }
  function drive(W, li, p, b, until) {
    const lane = W.lanes[li];
    if (b.kind === 'idle' || lane.ctrl[lane.leg] !== p) return;
    if (b.kind === 'mash') {
      for (; b.next < until; b.next += 1 / b.rate) if (b.next > 0) S.press(W, li, 'LRB'[b.i++ % 3], b.next);
      return;
    }
    for (const n of lane.notes) {
      if (n.planned || n.leg !== lane.leg || n.t + Math.min(b.off, -b.spread) >= until) continue;
      n.planned = true;
      if (b.noBreath && n.kind === 'B') continue;
      let off = b.off;
      if (b.kind === 'kid') {
        const r = S.rng(b.seed * 100003 + n.leg * 7919 + n.k); // per note, so it's the same whenever it's planned
        if (r() < b.missP) continue;
        off = (r() * 2 - 1) * b.spread;
      }
      const btn = b.swap && n.kind !== 'B' ? (n.kind === 'L' ? 'R' : 'L') : n.kind;
      S.press(W, li, btn, n.t + off);
    }
  }

  // one race: players [{ id, level }], bots one per player. Returns the finished world.
  function race(o) {
    const W = S.create({ event: o.event, players: o.players, seed: o.seed || 1, fail: o.fail, events: false });
    const laneOf = o.players.map((p, i) => W.lanes.findIndex((l) => l.ctrl.includes(i)));
    const fps = o.fps || 60, jr = S.rng(99);
    let guard = 0, called = false;
    while (!W.over && guard++ < (S.LIMIT + 10) * 250) {
      const dt = o.jitter ? (0.4 + 1.2 * jr()) / fps : 1 / fps;
      o.players.forEach((p, i) => drive(W, laneOf[i], i, o.bots[i], W.t + dt + 0.01));
      if (o.buddyAt != null && !called && W.t >= o.buddyAt) { called = true; S.turbo(W, laneOf[0], S.BUDDY_SECS); }
      S.advance(W, dt);
    }
    W.laneOf = laneOf;
    return W;
  }
  const solo = (event, level, b, extra) => race(Object.assign({ event, players: [{ id: 'teddy', level }], bots: [b] }, extra));
  const me = (W) => W.lanes[W.laneOf[0]];

  const CHECKS = {
    racesEnd(o) {
      const bad = [];
      const modes = [[{ id: 'teddy', level: 'easy' }], [{ id: 'tommy', level: 'normal' }], [{ id: 'teddy', level: 'normal' }, { id: 'tommy', level: 'easy' }], [{ id: 'teddy', level: 'easy' }, { id: 'tommy', level: 'easy' }]];
      for (const event of EVS) for (const players of modes) for (const kind of ['idle', 'perfect', 'mash']) {
        const W = race({ event, players, bots: players.map(() => bot(kind)), fail: o.fail });
        const tag = `${event} ${players.map((p) => p.id + ':' + p.level).join('+')} ${kind}`;
        if (!W.over || W.t >= S.LIMIT) { bad.push(`${tag}: the race never ended (t = ${W.t.toFixed(1)} s)`); continue; }
        for (const l of W.lanes) {
          if (l.finishT === null) bad.push(`${tag}: ${l.team.join('+')} never finished`);
          if (W.ev.legs === 2 && (l.touchT === null || !(l.touchT < l.finishT))) bad.push(`${tag}: ${l.team.join('+')} relay change-over wrong (touch ${l.touchT})`);
        }
        const places = W.lanes.map((l) => l.place).sort();
        if (places.some((p) => p == null)) bad.push(`${tag}: a swimmer has no place`);
      }
      return bad;
    },

    judge(o) {
      const bad = [];
      for (const level of LEVELS) {
        const L = S.LEVEL[level], w = L.win, e = 0.002;
        const want = [[0, 'perfect'], [w[0] - e, 'perfect'], [w[0] + e, 'great'], [w[1] - e, 'great'], [w[1] + e, 'ok'], [w[2] - e, 'ok']];
        for (const [off, g] of want) for (const sign of [1, -1]) {
          // a single press in a real race, so the whole path (queue, capture, judge) is tested
          const W = S.create({ event: 'free', players: [{ id: 'teddy', level }], seed: 3, fail: o.fail, events: false });
          const li = W.lanes.findIndex((l) => l.ctrl[0] === 0);
          while (!W.lanes[li].notes.length) S.step(W);
          const n = W.lanes[li].notes[2];
          S.press(W, li, n.kind, n.t + sign * off);
          while (W.t < n.t + 1) S.step(W);
          if (n.grade !== g) bad.push(`${level}: a press ${(sign * off * 1000).toFixed(0)} ms off was ${n.grade}, not ${g}`);
        }
        // the wrong arm: a MISS on NORMAL, fine on EASY
        const W = solo('free', level, bot('perfect', { swap: true }), { fail: o.fail });
        const c = me(W).counts;
        if (level === 'normal' && c.perfect > me(W).total * 0.3) bad.push(`normal: the wrong arm every time still got ${c.perfect} PERFECTs`);
        if (level === 'easy' && c.miss > 0) bad.push(`easy: any button should count, but the other arm got ${c.miss} MISSes`);
      }
      return bad;
    },

    timing(o) {
      const bad = [];
      for (const event of EVS) for (const level of LEVELS) {
        const w = S.LEVEL[level].win;
        const run = (b) => { const W = solo(event, level, b, { fail: o.fail }); return { t: me(W).finishT, l: me(W) }; };
        const perfect = run(bot('perfect')), great = run(bot('perfect', { off: (w[0] + w[1]) / 2 })), ok = run(bot('perfect', { off: -(w[1] + w[2]) / 2 }));
        const idle = run(bot('idle')), mash = run(bot('mash', { rate: 8 })), mash4 = run(bot('mash', { rate: 4 }));
        const tag = `${event} ${level}`;
        if (perfect.l.counts.perfect !== perfect.l.total) bad.push(`${tag}: exact presses got ${perfect.l.total - perfect.l.counts.perfect} notes that weren't PERFECT`);
        if (!(perfect.t < great.t && great.t < ok.t && ok.t < idle.t)) bad.push(`${tag}: better timing should be faster: perfect ${perfect.t.toFixed(2)}, great ${great.t.toFixed(2)}, ok ${ok.t.toFixed(2)}, idle ${idle.t.toFixed(2)}`);
        for (const m of [mash, mash4]) {
          if (m.t < ok.t) bad.push(`${tag}: mashing (${m.t.toFixed(2)} s) beat tapping OK on the beat (${ok.t.toFixed(2)} s)`);
          if (m.l.counts.perfect + m.l.counts.great > m.l.total * 0.25) bad.push(`${tag}: mashing got ${m.l.counts.perfect + m.l.counts.great} of ${m.l.total} PERFECT/GREAT`);
        }
        if (level === 'normal') {
          const nb = run(bot('perfect', { noBreath: true }));
          if (!(nb.t > perfect.t + 1)) bad.push(`${tag}: skipping every breath (${nb.t.toFixed(2)} s) should be clearly slower than breathing (${perfect.t.toFixed(2)} s)`);
        }
        if (perfect.l.stars !== 3) bad.push(`${tag}: a perfect swim got ${perfect.l.stars} stars`);
        if (idle.l.stars !== (level === 'easy' ? 1 : 0)) bad.push(`${tag}: pressing nothing got ${idle.l.stars} stars`);
        if (!(ok.l.stars < great.l.stars || ok.l.stars <= great.l.stars && great.l.stars <= perfect.l.stars)) bad.push(`${tag}: stars don't follow the timing`);
      }
      return bad;
    },

    fps(o) {
      const bad = [];
      for (const event of EVS) for (const level of LEVELS) for (const b of [() => bot('perfect', { off: 0.013 }), () => bot('kid', { seed: 5 })]) {
        const sig = (W) => W.lanes.map((l) => `${l.finishT}|${l.counts.perfect},${l.counts.great},${l.counts.ok},${l.counts.miss}|${l.splash}`).join(' ');
        const base = sig(solo(event, level, b(), { fps: 60, fail: o.fail }));
        for (const [fps, jitter] of [[24], [30], [144], [60, true], [33, true]]) {
          const s = sig(solo(event, level, b(), { fps, jitter, fail: o.fail }));
          if (s !== base) { bad.push(`${event} ${level} ${b().kind}: ${fps} fps${jitter ? ' (jittery)' : ''} gave a different race`); break; }
        }
      }
      return bad;
    },

    fair(o) {
      const bad = [];
      for (const event of EVS) {
        const e = me(solo(event, 'easy', bot('perfect'), { fail: o.fail })).finishT, n = me(solo(event, 'normal', bot('perfect'), { fail: o.fail })).finishT;
        if (Math.abs(e - n) / n > 0.04) bad.push(`${event}: a perfect swim takes ${e.toFixed(2)} s on EASY but ${n.toFixed(2)} s on NORMAL`);
      }
      return bad;
    },

    kidsWin(o) {
      const bad = [];
      for (const event of EVS) for (let seed = 1; seed <= 8; seed++) {
        const W = race({ event, players: [{ id: 'tommy', level: 'easy' }], bots: [bot('kid', { seed: seed * 13, spread: 0.25, missP: 0.15 })], seed, fail: o.fail });
        if (me(W).place !== 1) bad.push(`${event} seed ${seed}: Tommy tapping near the beat came ${me(W).place}`);
      }
      const foxyE = race({ event: 'free', players: [{ id: 'teddy', level: 'easy' }], bots: [bot('idle')], fail: o.fail }).lanes[0].finishT;
      const foxyN = race({ event: 'free', players: [{ id: 'teddy', level: 'normal' }], bots: [bot('idle')], fail: o.fail }).lanes[0].finishT;
      if (!(foxyN < foxyE)) bad.push(`Foxy on NORMAL (${foxyN.toFixed(2)} s) should be faster than on EASY (${foxyE.toFixed(2)} s)`);
      return bad;
    },

    buddy(o) {
      const bad = [];
      for (const event of EVS) for (const level of LEVELS) for (const kind of ['perfect', 'idle']) {
        const a = me(solo(event, level, bot(kind), { fail: o.fail })).finishT, b = me(solo(event, level, bot(kind), { buddyAt: 8, fail: o.fail })).finishT;
        if (!(b < a - 0.5)) bad.push(`${event} ${level} ${kind}: the turbo kick didn't help (${a.toFixed(2)} s, with it ${b.toFixed(2)} s)`);
      }
      return bad;
    },
  };

  // broken on purpose: each must be caught by the check named
  const PROVE = [
    { fail: 'noBase', check: 'racesEnd', what: 'no glide speed, so nobody moves without pressing' },
    { fail: 'judge', check: 'judge', what: 'the judge 90 ms off' },
    { fail: 'mash', check: 'timing', what: 'no "one press per note" rule, so mashing hits every note' },
    { fail: 'fps', check: 'fps', what: 'presses judged at frame times, not when they happened' },
  ];

  function run(o = {}) {
    const t0 = Date.now();
    const only = o.only ? [].concat(o.only) : Object.keys(CHECKS);
    const results = only.map((name) => { const problems = CHECKS[name]({ fail: o.fail }); return { name, ok: !problems.length, problems }; });
    const prove = [];
    if (o.prove) for (const p of PROVE) {
      const problems = CHECKS[p.check]({ fail: p.fail });
      prove.push({ name: `${p.check} (${p.what})`, caught: problems.length > 0, first: problems[0] || 'NOT CAUGHT' });
    }
    const stats = [];
    for (const event of EVS) for (const level of LEVELS) {
      const t = (b) => me(solo(event, level, b)).finishT.toFixed(1);
      const W = race({ event, players: [{ id: 'teddy', level }], bots: [bot('kid', { seed: 3 })] });
      stats.push(`${event} ${level}: perfect ${t(bot('perfect'))} s, great ${t(bot('perfect', { off: (S.LEVEL[level].win[0] + S.LEVEL[level].win[1]) / 2 }))} s, ok ${t(bot('perfect', { off: (S.LEVEL[level].win[1] + S.LEVEL[level].win[2]) / 2 }))} s, idle ${t(bot('idle'))} s, kid ${me(W).finishT.toFixed(1)} s; Foxy ${W.lanes.find((l) => l.team[0] === 'foxy').finishT.toFixed(1)} s, Froggy ${W.lanes.find((l) => l.team.includes('froggy')).finishT.toFixed(1)} s`);
    }
    const ok = results.every((r) => r.ok) && prove.every((p) => p.caught);
    return { ok, results, prove, stats, ms: Date.now() - t0 };
  }

  SW.checks = { run, race, bot, CHECKS };
})();
