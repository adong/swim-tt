/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button (top left).
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: window.SW_TITLE,
  cols: ['Teddy (left)', 'Tommy (right)'],
  keys: [
    ['left arm', 'A', '←'],
    ['right arm', 'D', '→'],
    ['breathe', 'W', '↑'],
    ['call your brother · high five', 'T', 'Enter'],
    ['pick a race', 'A D', '← →'],
    ['level 🐣 / 🔥', 'W S', '↑ ↓'],
    ['who swims', '1 2 3', '1 2 3'],
    ['swim! · again', 'Enter or Space', 'Enter or Space'],
    ['next race', 'N', 'N'],
    ['pause', 'P or Esc', 'P or Esc'],
    ['sound on / off', 'M', 'M'],
  ],
  note: 'Press as each note reaches the ring: ✋ left arm, ✋ right arm, 😮 breathe. On 🐣 EASY any key counts, only the timing matters. With 1 swimmer both sets of keys work (Space breathes too), and T or Enter calls your brother for a turbo kick.',
  touch: 'Tap the big buttons at the bottom as the notes reach the ring. Tap your brother\'s face to call him (with two swimmers: ✋ for a high five).',
  button: { top: 'calc(env(safe-area-inset-top, 0px) + 10px)', left: 'max(10px, env(safe-area-inset-left, 0px))' },
});
