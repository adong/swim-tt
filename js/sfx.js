/* TT Swim Race: the game's own sounds, built on Kit.sound.tone / hiss (Web Audio, no files), so the kit's sound
   switch mutes them all. SW.sfx(name, arg) plays one of these or, failing that, a kit sound of that name. */
(function () {
  'use strict';
  const S = Kit.sound;
  const { tone, hiss } = S;
  const SW = (window.SW = window.SW || {});

  const OWN = {
    // the beat: a soft wood block, higher on a breath note, so you can swim to it with your eyes shut
    tick(kind, at) { tone({ type: 'triangle', f: kind === 'B' ? 1180 : 880, to: kind === 'B' ? 1100 : 820, dur: 0.05, vol: 0.06, at }); },
    // the starter: a long whistle for TAKE YOUR MARKS, a beep for GO
    whistle() { tone({ type: 'sine', f: 2300, to: 2250, dur: 0.7, vol: 0.06 }); tone({ type: 'sine', f: 2340, at: 0.05, dur: 0.6, vol: 0.03 }); },
    beep() { tone({ type: 'square', f: 523, dur: 0.12, vol: 0.06, lp: 2200 }); },
    go() { tone({ type: 'square', f: 1046, dur: 0.35, vol: 0.08, lp: 3000 }); hiss({ filter: 'lowpass', f: 2600, to: 400, dur: 0.3, vol: 0.12 }); },
    // into the water: a big splash
    dive() { hiss({ filter: 'lowpass', f: 3200, to: 300, dur: 0.6, vol: 0.32 }); tone({ type: 'sine', f: 160, to: 60, dur: 0.25, vol: 0.18 }); },
    // a stroke: the hand going in. Better timing, brighter splash, and a little chime on PERFECT
    stroke(grade) {
      const f = grade === 'perfect' ? 2600 : grade === 'great' ? 2000 : 1400;
      hiss({ filter: 'bandpass', f, to: f * 0.4, q: 1.2, dur: 0.22, vol: 0.16 });
      if (grade === 'perfect') { tone({ type: 'sine', f: 1568, dur: 0.12, vol: 0.05 }); tone({ type: 'sine', f: 2093, at: 0.06, dur: 0.16, vol: 0.05 }); }
      else if (grade === 'great') tone({ type: 'sine', f: 1318, dur: 0.12, vol: 0.04 });
    },
    // a breath: "hah", and a bubbly pop when it's good
    breath(grade) {
      hiss({ filter: 'bandpass', f: 900, to: 1400, q: 0.8, dur: 0.18, vol: 0.12 });
      if (grade !== 'ok') tone({ type: 'sine', f: 620, to: 980, dur: 0.12, vol: 0.06 });
    },
    // a miss: blub blub
    miss() { tone({ type: 'sine', f: 240, to: 150, dur: 0.12, vol: 0.08 }); tone({ type: 'sine', f: 200, to: 120, at: 0.1, dur: 0.12, vol: 0.06 }); },
    splash() { hiss({ filter: 'bandpass', f: 900, q: 2, dur: 0.12, vol: 0.06 }); },
    turn() { hiss({ filter: 'lowpass', f: 1800, to: 500, dur: 0.4, vol: 0.18 }); tone({ type: 'triangle', f: 300, to: 520, dur: 0.25, vol: 0.06 }); },
    touch() { tone({ type: 'square', f: 1318, dur: 0.12, vol: 0.05, lp: 3500 }); tone({ type: 'square', f: 1760, at: 0.1, dur: 0.2, vol: 0.05, lp: 3500 }); },
    // the crowd: a wash of noise
    cheer(big) {
      hiss({ filter: 'bandpass', f: 1300, q: 0.6, dur: big ? 1.8 : 0.9, vol: big ? 0.16 : 0.08, attack: 0.15 });
      hiss({ filter: 'bandpass', f: 2400, q: 1, at: 0.1, dur: big ? 1.4 : 0.7, vol: big ? 0.08 : 0.04, attack: 0.1 });
    },
    fanfare() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', f, at: i * 0.13, dur: i === 3 ? 0.5 : 0.14, vol: 0.06, lp: 3000 })); },
    // your brother: a boing as he hops in, a pop for the treat, a whoosh for the turbo kick
    buddy() { tone({ type: 'sine', f: 300, to: 900, dur: 0.22, vol: 0.12 }); },
    treat() { tone({ type: 'sine', f: 880, to: 1320, dur: 0.12, vol: 0.1 }); tone({ type: 'sine', f: 1320, at: 0.1, dur: 0.15, vol: 0.08 }); },
    turbo() { hiss({ filter: 'bandpass', f: 400, to: 3000, q: 1.5, dur: 0.7, vol: 0.18 }); tone({ type: 'sawtooth', f: 110, to: 330, dur: 0.6, vol: 0.05, lp: 900 }); },
    high5() { hiss({ filter: 'highpass', f: 2200, dur: 0.08, vol: 0.25 }); tone({ type: 'triangle', f: 660, to: 990, dur: 0.15, vol: 0.08 }); },
    star(i) { tone({ type: 'triangle', f: [880, 1108, 1318][i] || 1318, dur: 0.25, vol: 0.08 }); },
  };

  SW.sfx = function (name, arg, at) {
    if (OWN[name]) OWN[name](arg, at);
    else if (typeof S[name] === 'function') S[name](arg);
  };
})();
