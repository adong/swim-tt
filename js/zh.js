/* 中文 for TT Swim Race: the words on the page, the toasts, the canvas words (the beat strip in js/hud.js and the
   scoreboard in js/pool.js, drawn through Kit.lang.t) and the ? panel (Kit.lang, from kit/lang.js). Simple words:
   Tommy is 5. The kids' names, Foxy and Froggy, and the game's own name stay in English on purpose. */
(function () {
  const L = Kit.lang;
  const title = window.SW_TITLE;
  const words = title.split(' ');
  L.keep(['TEDDY', 'TOMMY', 'FOXY', 'FROGGY', 'Teddy', 'Tommy', title, words.slice(0, -1).join(' '), words.slice(-1)[0], 'Esc']);

  L.add({
    // home
    'Pick a race': '选一个比赛', "Who's swimming?": '谁来游？', 'BOTH': '一起游',
    'Teddy swims': 'Teddy 游', 'Tommy swims': 'Tommy 游', 'Teddy and Tommy swim': 'Teddy 和 Tommy 一起游',
    'Swim!': '游！', 'Swim! (Enter)': '游！(回车)', 'Easy': '简单', 'Normal': '普通', 'EASY': '简单', 'NORMAL': '普通',
    'FREESTYLE': '自由泳', 'BACKSTROKE': '仰泳', 'RELAY': '接力', '50 M': '50 米', '2 × 25 M': '2 × 25 米',
    // racing
    'Pause': '暂停', 'Pause (P)': '暂停 (P)', 'Sound (M)': '声音 (M)', 'Sound on or off': '声音 开 / 关',
    'Call your brother': '叫兄弟来帮忙', 'High five': '击掌', 'Left arm': '左手', 'Right arm': '右手', 'Breathe': '换气',
    'TAKE YOUR MARKS!': '各就各位！', 'GO!': '出发！', 'GET READY!': '准备！',
    'TAP ON THE BEAT!': '跟着节拍点！', 'LEFT, RIGHT... AND BREATHE!': '左手、右手……还要换气！', 'ON YOUR BACK!': '躺着游！',
    'PERFECT!': '完美！', 'GREAT!': '真棒！', 'OK': '还行', 'MISS': '没对上', 'WRONG ARM!': '换只手！', 'SPLASH!': '扑通！',
    'NEED AIR!': '快换气！', 'TURN!': '转身！', '✋ HIGH FIVE! ✋': '✋ 击掌！✋', 'WELCOME!': '欢迎来游泳！',
    // pause, results
    'Keep swimming': '继续游', 'Start the race again': '重新比赛', 'Races': '选比赛',
    'Play again': '再玩一次', 'Play again (Enter)': '再玩一次 (回车)', 'Next race': '下一个比赛', 'Next race (N)': '下一个比赛 (N)', 'Races (Esc)': '选比赛 (Esc)',
    'NEW BEST!': '新纪录！', '🥈 GREAT SWIM!': '🥈 游得真棒！', '💪 GOOD TRY!': '💪 加油！', '🎉 GREAT RACE!': '🎉 比得真好！',
    // the ? panel (js/keys.js)
    'Teddy (left)': 'Teddy（左边）', 'Tommy (right)': 'Tommy（右边）',
    'left arm': '左手划水', 'right arm': '右手划水', 'breathe': '换气', 'call your brother · high five': '叫兄弟来帮忙 · 击掌',
    'pick a race': '选比赛', 'level 🐣 / 🔥': '难度 🐣 / 🔥', 'who swims': '谁来游', 'swim! · again': '游！· 再来', 'next race': '下一个比赛',
    'Press as each note reaches the ring: ✋ left arm, ✋ right arm, 😮 breathe. On 🐣 EASY any key counts, only the timing matters. With 1 swimmer both sets of keys work (Space breathes too), and T or Enter calls your brother for a turbo kick.':
      '每个圆点游到圆圈里的时候就按：✋ 左手，✋ 右手，😮 换气。🐣 简单模式按哪个键都行，只要按得准时。一个人游的时候两套按键都能用（空格键也能换气），T 或回车叫兄弟来超级踢水。',
    "Tap the big buttons at the bottom as the notes reach the ring. Tap your brother's face to call him (with two swimmers: ✋ for a high five).":
      '圆点游到圆圈里的时候，点下面的大按钮。点兄弟的头像叫他来（两个人游的时候：点 ✋ 击掌）。',
  });

  const TREAT = { 'ICE CREAM': '冰淇淋', WATER: '水', 'JUICE BOX': '果汁', COOKIE: '饼干', WATERMELON: '西瓜', BANANA: '香蕉' };
  const COUNT = { PERFECT: '完美', GREAT: '真棒', OK: '还行', MISS: '没对上' };
  const PLACE = { '1ST': '第一名', '2ND': '第二名', '3RD': '第三名', '4TH': '第四名' };
  L.rule(/^(\S+) SAYS: TURBO KICK!$/, '$1 说：超级踢水！');
  L.rule(/^(\S+) (ICE CREAM|WATER|JUICE BOX|COOKIE|WATERMELON|BANANA) FROM (.+)!$/, (m, emoji, item, who) => `${emoji} ${who} 给你${TREAT[item]}！`);
  L.rule(/^🔥 (\d+) COMBO!$/, '🔥 $1 连击！');
  L.rule(/^(\d+) COMBO$/, '$1 连击');
  L.rule(/^(\S*) ?(1ST|2ND|3RD|4TH)!$/, (m, medal, p) => `${medal ? medal + ' ' : ''}${PLACE[p]}！`);
  L.rule(/^GO, (\S+)!$/, '加油，$1！');
  L.rule(/^CHEER FOR (\S+)!$/, '给 $1 加油！');
  L.rule(/^🏆 (\S+) & (\S+) WIN!$/, '🏆 $1 和 $2 赢啦！');
  L.rule(/^🏆 (\S+) WINS!$/, '🏆 $1 赢啦！');
  L.rule(/^(PERFECT|GREAT|OK|MISS) (\d+)$/, (m, g, n) => `${COUNT[g]} ${n}`);
  L.rule(/^BEST ([\d.]+) s$/, '最好成绩 $1 秒');
  L.rule(/^([\d.]+) s$/, '$1 秒');
})();
