/* TT Swim Race: the beat strip (a 2D canvas over the pool), one per brother. The notes swim in from the right toward
   the ring on the left: a blue ✋ is the left arm, an orange ✋ the right arm, a bubble 😮 a breath. Press as a note
   reaches the ring. The ring pulses on every beat, the grade pops up over it (PERFECT! GREAT! OK MISS), the combo
   counts up beside it, and the air gauge at the right end shows how much breath is left (it blinks when low).
   SW.hud.layout() also works out where the strips, the pads and the brother's button go on this screen. */
(function () {
  'use strict';
  const SW = (window.SW = window.SW || {});
  const { roundRect, FONT, EMOJI_FONT } = Kit.gfx;
  const sim = () => SW.sim;
  const LOOK = { easy: 2.4, normal: 1.9 }; // seconds of notes the strip shows coming
  const COLORS = { L: '#2f8bff', R: '#ff8a1f', B: '#18d4ff' };
  const GRADE = { perfect: ['PERFECT!', '#ffe14a'], great: ['GREAT!', '#7df7c8'], ok: ['OK', '#ffffff'], miss: ['MISS', '#ff8fb5'] };

  let cv, g, dpr = 1;
  function init(canvas) { cv = canvas; g = cv.getContext('2d'); }

  function resize(w, h) {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(w * dpr);
    cv.height = Math.round(h * dpr);
    cv.style.width = w + 'px';
    cv.style.height = h + 'px';
  }

  // where everything goes, for n brothers on a w x h screen (CSS pixels). safe = { l, r, b } insets.
  function layout(n, w, h, safe) {
    const m = 10, L = m + (safe.l || 0), R = w - m - (safe.r || 0), B = h - m - (safe.b || 0);
    const out = { players: [] };
    if (n === 1) {
      const P = Math.round(Math.max(56, Math.min(120, w * 0.24, h * 0.16)));
      const sh = Math.round(Math.max(46, Math.min(86, P * 0.72)));
      const py = B - P, sy = py - 10 - sh;
      out.players.push({ strip: { x: L, y: sy, w: R - L, h: sh }, pads: { L: [L, py, P], B: [(L + R) / 2 - P / 2, py, P], R: [R - P, py, P] } });
      const bs = Math.round(Math.max(58, Math.min(100, P * 0.9)));
      out.buddy = [R - bs, sy - 12 - bs, bs];
      out.top = sy - 12 - bs;
    } else {
      const half = (R - L - 12) / 2;
      const P = Math.round(Math.max(46, Math.min(112, (half - 12) / 3.1, h * 0.16)));
      const sh = Math.round(Math.max(42, Math.min(80, P * 0.72)));
      const py = B - P, sy = py - 10 - sh;
      for (let i = 0; i < 2; i++) {
        const x0 = L + i * (half + 12), x1 = x0 + half, gap = Math.min(16, (half - 3 * P) / 2);
        const cx = (x0 + x1) / 2;
        out.players.push({ strip: { x: x0, y: sy, w: half, h: sh }, pads: { L: [cx - P * 1.5 - gap, py, P], B: [cx - P / 2, py, P], R: [cx + P / 2 + gap, py, P] } });
      }
      const bs = Math.round(Math.max(54, Math.min(90, P * 0.85)));
      out.buddy = [(L + R) / 2 - bs / 2, sy - 12 - bs, bs];
      out.top = sy - 12 - bs;
    }
    return out;
  }

  function clear() { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }

  // draw one brother's strip. o: { rect, lane, W, now, face (img), pop, wait (text), level }
  function strip(o) {
    const { rect, lane, W, now } = o, S = sim();
    const { x, y, w, h } = rect, r = h * 0.36;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.save();
    g.fillStyle = 'rgba(10, 40, 80, 0.55)';
    roundRect(g, x, y, w, h, h / 2);
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = 'rgba(255,255,255,0.85)';
    g.stroke();
    // the face of whoever is swimming
    const fx = x + h / 2;
    g.save();
    g.beginPath();
    g.arc(fx, y + h / 2, h * 0.42, 0, Math.PI * 2);
    g.fillStyle = '#ffd27a';
    g.fill();
    g.clip();
    if (o.face && o.face.complete) g.drawImage(o.face, fx - h * 0.5, y, h, h);
    g.restore();
    const airW = Math.max(12, h * 0.22), ax = x + w - h * 0.32 - airW;
    const hx = x + h * 1.05 + r, cy = y + h / 2;
    const level = o.level, L = S.LEVEL[level];
    // the ring: where to press. It pulses on every beat
    let pulse = 0;
    const notes = S.upcoming(W, lane, 0.6, LOOK[level] + 0.2);
    for (const n of notes) { const d = Math.abs(n.t - now); if (d < 0.12) pulse = Math.max(pulse, 1 - d / 0.12); }
    g.beginPath();
    g.arc(hx, cy, r * (1.08 + pulse * 0.15), 0, Math.PI * 2);
    g.fillStyle = `rgba(255,255,255,${0.12 + pulse * 0.25})`;
    g.fill();
    g.lineWidth = 4 + pulse * 3;
    g.strokeStyle = pulse > 0.5 ? '#ffe14a' : '#ffffff';
    g.stroke();
    if (o.wait) {
      text(o.wait, (hx + ax) / 2, cy, h * 0.3, '#ffffff', 'center');
    } else {
      // the notes, swimming in
      const speed = (ax - 10 - hx) / LOOK[level];
      g.save();
      g.beginPath();
      g.rect(hx - r * 1.4, y, ax - (hx - r * 1.4), h);
      g.clip();
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i], px = hx + (n.t - now) * speed;
        if (px > ax + r) continue;
        if (n.grade && n.grade !== 'miss') {
          // a hit: a ring that grows and fades on the target
          const age = now - n.t + (n.off || 0);
          if (age < 0 || age > 0.3) continue;
          g.globalAlpha = 1 - age / 0.3;
          g.beginPath();
          g.arc(hx, cy, r * (1 + age * 3), 0, Math.PI * 2);
          g.lineWidth = 5;
          g.strokeStyle = GRADE[n.grade][1];
          g.stroke();
          g.globalAlpha = 1;
          continue;
        }
        const missed = n.grade === 'miss';
        g.globalAlpha = missed ? 0.35 : 1;
        bubble(px, cy, r, n.kind, missed);
        g.globalAlpha = 1;
      }
      g.restore();
    }
    // air: a gauge that empties as you stroke and fills when you breathe
    const ah = h * 0.72, ay = y + (h - ah) / 2, air = lane.air;
    g.fillStyle = 'rgba(255,255,255,0.25)';
    roundRect(g, ax, ay, airW, ah, airW / 2);
    g.fill();
    const low = air < 0.3, blink = low && Math.floor(now * 5) % 2;
    g.fillStyle = low ? (blink ? '#ff3d7f' : '#ff8fb5') : air < 0.5 ? '#ffd400' : '#3fe0b0';
    roundRect(g, ax, ay + ah * (1 - air), airW, Math.max(airW, ah * air), airW / 2);
    g.fill();
    g.font = `${Math.round(h * 0.26)}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('😮', ax + airW / 2, ay - 2 + (h * 0.13 < 10 ? 0 : 0));
    if (low && !o.wait && lane.state === 'swim') text('NEED AIR!', x + w / 2, y - h * 0.2, h * 0.28, '#ff8fb5', 'center');
    // the grade over the ring, and the combo
    if (o.pop && now - o.pop.t < 0.7) {
      const a = (now - o.pop.t) / 0.7, s = 1 + Math.max(0, 0.25 - a) * 1.6;
      g.globalAlpha = 1 - Math.max(0, a - 0.6) / 0.4;
      text(o.pop.text, hx, y - h * 0.24 - a * 10, h * 0.32 * s, o.pop.color, 'center');
      g.globalAlpha = 1;
    }
    if (lane.combo >= 3 && !o.wait) text(`${lane.combo} COMBO`, hx + r * 1.4, y + h + 2 - h * 0.08, h * 0.22, '#7df7c8', 'left', 'top');
    g.restore();
  }

  function bubble(px, cy, r, kind, missed) {
    const c = missed ? '#8a94a6' : COLORS[kind];
    const grd = g.createRadialGradient(px - r * 0.35, cy - r * 0.35, r * 0.1, px, cy, r);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(0.35, c);
    grd.addColorStop(1, Kit.gfx.shade(c, -0.25));
    g.beginPath();
    g.arc(px, cy, r, 0, Math.PI * 2);
    g.fillStyle = grd;
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#ffffff';
    g.stroke();
    g.font = `${Math.round(r * 1.05)}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#000';
    if (kind === 'B') g.fillText('😮', px, cy + r * 0.06);
    else {
      g.save();
      g.translate(px, cy + r * 0.04);
      if (kind === 'L') g.scale(-1, 1); // the emoji hand turned to face left
      g.fillText('✋', 0, 0);
      g.restore();
      // a little arrow under it: ◀ or ▶
      g.fillStyle = '#ffffff';
      g.beginPath();
      const ay = cy + r * 0.82, d = kind === 'L' ? -1 : 1;
      g.moveTo(px + d * r * 0.34, ay);
      g.lineTo(px - d * r * 0.16, ay - r * 0.22);
      g.lineTo(px - d * r * 0.16, ay + r * 0.22);
      g.closePath();
      g.fill();
    }
  }

  function text(s, x, y, size, color, align, base) {
    g.font = `${Math.round(size)}px ${FONT}`;
    g.textAlign = align || 'center';
    g.textBaseline = base || 'middle';
    g.lineJoin = 'round';
    g.lineWidth = Math.max(3, size * 0.2);
    g.strokeStyle = '#14121f';
    const t = Kit.lang.t(s);
    g.strokeText(t, x, y);
    g.fillStyle = color;
    g.fillText(t, x, y);
  }

  SW.hud = { init, resize, layout, clear, strip, GRADE, COLORS, LOOK };
})();
