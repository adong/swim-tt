# TT Swim Race

[![TT Swim Race title screen](docs/screenshot.jpg)](https://adong.github.io/swim-tt/)

Press **?** any time (or tap the round **?** button in the top left corner) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 游泳比赛：在阳光泳池里跟着节拍划水，左手、右手、换气都要按准时间；有自由泳、仰泳，还有和兄弟一起的接力，叫兄弟来还能超级踢水。

A rhythm swimming race starring Teddy and Tommy, at a sunny outdoor pool: six lanes with red-white-blue lane ropes, numbered starting blocks, backstroke flags, umbrellas and palm trees, a lifeguard chair, a scoreboard and a stand full of cheering animal fans. Every stroke is a note on the beat: press the arm (left, right, left...) or breathe as the note reaches the ring, and the closer you are to the beat, the harder your swimmer pulls. Three races, two levels, one swimmer or both brothers, against our own CPU friends Foxy 🦊 and Froggy 🐸, and your brother is always one tap away.

It's built with Claude Code from plain JavaScript and Three.js, in the same style as Metro Surfer and the other Teddy & Tommy games. There are no image, model or audio files: the pool is boxes and canvas textures, the characters and their poses come from the shared kit (`kit/`), and every sound is synthesised.

The name lives in one place, [js/title.js](js/title.js). "TT Swim Race" is a working title until Alan names it.

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the logo falls back from the Bungee font to Arial Black.
- **Send one file:** `dist/swim-tt.html` is the whole game in one file. AirDrop or email it, then open it in a browser.
- **Rebuild that file** after any edit: `python3 kit/tools/bundle.py . --name swim-tt`
- **Get kit updates** from `~/claude-games/kit`: `python3 ../kit/tools/sync.py .`, then rebuild.
- **On the home screen** tap a race (🏊 FREESTYLE, 🙃 BACKSTROKE or 🤝 RELAY), pick who swims (TEDDY, TOMMY or BOTH), pick 🐣 EASY or 🔥 NORMAL for each swimmer, then ▶. Tapping the race that's already picked starts it too. Each card shows your best time.
- **Each race** starts with TAKE YOUR MARKS! (a whistle, everyone bends down on the blocks), then 3, 2, 1, GO! and a dive. Backstroke starts in the water, pushing off the wall.
- **The end:** the podium. The winner does his signature move (Teddy's boxing combo and his 🏀 jump shot, taking turns; Tommy's Y with peace fingers ✌️) while confetti flies and the crowd cheers. The results show every swimmer's place and time, and for the brothers up to 3 stars for timing, how many PERFECT, GREAT, OK and MISS, their BEST time and NEW BEST! when they beat it. 🔁 plays again, ⏭️ goes to the next race, 🏠 back home.
- **When the brothers are home**, the game doesn't make them wait for slower friends: a couple of seconds later it finishes the race at once (the same rules, so the friends' times are what they would have swum).
- **Saved per browser:** the race, who swims, each brother's level, every best time (per race, level and swimmer, or team for the relay) and each brother's wins. `index.html` and `dist/swim-tt.html` each keep their own, because they're different ways of opening the game.

## The races

| | Race | Distance | Start | Notes |
|---|---|---|---|---|
| 🏊 | FREESTYLE | 50 m, there and back | a dive off the block | face down, turning the head to the side to breathe; a turn at the far wall with a push-off |
| 🙃 | BACKSTROKE | 50 m, there and back | in the water, pushing off the wall | face up, arms going round backwards |
| 🤝 | RELAY | 2 × 25 m | a dive off the block, and the second swimmer dives in from the far end | Teddy and Tommy are one team against Foxy and Froggy |

- **The relay:** the first swimmer swims one length; the moment he touches the far wall, his brother dives in from the block above him and swims back. With one player you swim both legs: yours first, then your brother's. With two, Teddy swims first with his keys while Tommy waits on the far block ("CHEER FOR TEDDY!"), then Tommy swims back with his.
- **The crowd:** a stand of blocky animal fans (bunnies, bears, ducks, cats, pandas and pigs) bounces in their seats and goes wild when someone touches first. The scoreboard shows the lanes and then the times.

## Rhythm swimming

Each brother has a beat strip over the bottom of the screen. The notes swim in from the right toward the ring on the left:

- a **blue ✋ (◀)** is a stroke with the left arm, an **orange ✋ (▶)** a stroke with the right arm, a **bubble 😮** is a breath;
- press as a note reaches the ring. The ring pulses on every beat, and a soft wood-block tick plays on every note (higher for a breath), so you can swim by ear too;
- **PERFECT!**, **GREAT!** and **OK** each give the stroke a push forward (PERFECT the biggest); a **MISS** gives nothing. The grade pops up over the ring, with your combo beside it;
- **air:** the gauge at the right end of the strip empties a little with every stroke and fills when you breathe on time. Below 40 % your strokes push less, and when it's low it blinks and says NEED AIR!;
- **one press per note:** a press up to half a beat early takes the next note, so a press far off the beat is a MISS that uses it up. Mashing the buttons gets mostly MISSes, never a faster swim. A press with no note near is a SPLASH (a tiny slow-down);
- **everyone always glides forward a little,** so every race ends, even if nobody presses anything.

| | 🐣 EASY (Tommy, 5) | 🔥 NORMAL (Teddy, 8) |
|---|---|---|
| the beat | slow: 0.9 s a stroke | quicker: 0.68 s a stroke |
| buttons | any button counts for any note: only the timing matters | the right arm (left, right, left...) and 😮 on the breaths; the wrong arm is a MISS ("WRONG ARM!") |
| breaths | 1 in 8 notes (freestyle), 1 in 6 (backstroke) | 1 in 4 (freestyle: L R L 😮 R L R 😮), 1 in 3 (backstroke: L R 😮) |
| timing window | PERFECT ±120 ms, GREAT ±200 ms, OK ±300 ms | ±60, ±110, ±170 ms |
| air | lasts a long time | runs out quickly if you skip the breaths |
| Foxy and Froggy | easy to beat if you tap near the beat | Foxy needs good timing to beat |
| stars | at least 1 | 0 to 3 |

- **Fair between levels:** strokes push more on EASY because there are fewer of them, so a perfect swim takes the same time on either level (about 30 s for 50 m). That's how Tommy on EASY can race Teddy on NORMAL.
- **Stars** come from the timing: PERFECT counts 1, GREAT 0.75, OK 0.45, MISS 0, against a perfect swim. 40 % is one star, 65 % two, 85 % three.
- **The times,** roughly, for 50 m freestyle: perfect 30 s, all GREAT 35 s, all OK 44 s, pressing nothing 74 s. Foxy and Froggy: about 48 s and 53 s on EASY, 36 s and 40 s on NORMAL. A 5-year-old tapping near the beat on EASY swims about 35 s.

## Controls

| Teddy (left, or anyone alone) | Tommy (right, or anyone alone) | Touch | |
|---|---|---|---|
| `A` | `←` | the blue ✋ ◀ button | left arm |
| `D` | `→` | the orange ✋ ▶ button | right arm |
| `W` (or `S`) | `↑` (or `↓`) | the round 😮 button | breathe |
| `T` | `Enter` | your brother's face (two swimmers: ✋) | call your brother · high five |
| `P` / `Esc` | | ⏸️ button | pause (▶ keep swimming, 🔁 start the race again, 🏠 races) |
| `M` | | 🔊 button | sound on / off |

With one swimmer both sets of keys work, and `Space` breathes too. On the home screen: `←` `→` (or `A` `D`) pick a race, `1` `2` `3` who swims (Teddy, Tommy, both), `↑` `↓` the level (with both swimming, `W` `S` is Teddy's and `↑` `↓` Tommy's), `Enter` or `Space` to swim. On the results, `Enter` plays again, `N` the next race, `Esc` home.

- **The buttons** sit along the bottom under the strip, big enough for thumbs: left arm in the bottom left corner, breathe in the middle, right arm in the bottom right (with two swimmers, each brother has his own three on his half). They're 120 px on an iPad, about 90 px on a phone held upright and 60 px on a phone held sideways; the smallest is two swimmers on a phone held upright (about 55 px).
- **The kit's buttons** (? and A文, and the speaker on menus) sit in the top left corner in this game, well away from the swimming buttons. On a narrow phone the race map moves to its own row under them.

## Companion

Call your brother any time in a race, as often as you like: **T** (or Enter with one swimmer), or tap his face (the big round button above the right arm button). The brother comes from `Kit.roster.buddyFor`: Tommy when Teddy swims, Teddy when Tommy swims.

- **He pops up** out of the water right beside you at his buddy size (`buddyScale`, with a splash and his name tag) and says hello with his signature move: Teddy's boxing combo or his 🏀 jump shot (taking turns), Tommy's Y with peace fingers.
- **He tosses a treat** (🍦 💧 🧃 🍪 🍉 🍌) that arcs over to you: "🍪 COOKIE FROM TOMMY!". It fills your air right up.
- **Then the turbo kick:** "TOMMY SAYS: TURBO KICK!", he jumps in right behind your feet and kicks like crazy for 5 seconds: a big white wake, your legs churn faster, you glide faster and every stroke pushes harder. Then he pops out with a splash. Calling again while he's there tosses another treat and starts the 5 seconds again.
- **In the relay** he's already at the pool as your team-mate (waiting on his block, or resting at the wall after his leg), so he does his signature move from there, tosses the treat across and gives you the same turbo kick.
- **With two swimmers** T, Enter or the ✋ button is a **high five**: "✋ HIGH FIVE! ✋", a big hand flies up between you, splashes, and both brothers get the same short turbo (1.5 s), so it's fun and fair.

## How it was checked

Nobody listened (Alan works next to the sessions), so the game was tested muted and the sound was checked in code.

**Headless, in Node:** `node tools/check.js` runs the page's own rules ([js/sim.js](js/sim.js)) through [js/checks.js](js/checks.js) without a browser, in about a second. In the page the same checks run as `game.check()`. All pass:

- **racesEnd:** every race ends, for every swimmer, in all three races with 1 and 2 players at either level and mixed levels, whether you swim perfectly, mash the buttons or press nothing; in the relay the second swimmer dives in only after the first touches the wall; everyone gets a place.
- **judge:** PERFECT, GREAT, OK and MISS change exactly at each level's timing windows (2 ms either side of each edge, early and late), through a real press in a real race; on NORMAL the wrong arm every time gets no PERFECTs, on EASY the other arm still counts.
- **timing:** better timing always swims faster, in every race at both levels: perfect < all GREAT < all OK < pressing nothing; exact presses are all PERFECT; mashing 4 or 8 times a second is no faster than tapping OK on the beat and gets at most a quarter PERFECT/GREAT; on NORMAL skipping every breath is clearly slower; a perfect swim gets 3 stars and pressing nothing 1 (EASY) or 0 (NORMAL).
- **fps:** the same presses give exactly the same race (every time, every count, ===) at 24, 30, 60 and 144 fps and with jittery frame rates. The race runs in fixed 1/120 s steps and every press is stamped with the time it happened.
- **fair:** a perfect swim takes the same time on EASY and NORMAL (within 4 %) in every race.
- **kidsWin:** on EASY, a 5-year-old tapping within ±0.25 s of the beat and missing 15 % of the notes beats Foxy and Froggy in every race on 8 different seeds; Foxy is faster on NORMAL than on EASY.
- **buddy:** the turbo kick always makes you faster, swimming perfectly or not pressing at all.
- **The checks can fail:** the run also breaks the rules on purpose and confirms each check then fails: no glide speed (races never end), the judge 90 ms off, no "one press per note" rule (mashing wins), presses judged on frame times instead of when they happened.

**In headless Chrome** (over the DevTools protocol, the page opened from `file://`, time driven by `game.step()`):

```js
localStorage.setItem('claudeGames.muted', '1')   // always, before anything plays; then reload
game.hold(true)                                  // only game.step() moves time
game.start('relay', { who: 'both', levels: { teddy: 'normal', tommy: 'easy' }, seed: 3 })
game.autopilot('perfect')                        // or 'kid', 'idle', 'mash', or null to hand it back
game.step(10)                                    // advance 10 s at 60 fps
game.buddy(0); game.highFive(); game.pause(true); game.pause(false)
game.press('L', 0)                               // 'L', 'R' or 'B', player 0 or 1
game.check()                                     // the headless checks, with their proofs
game.info()                                      // state, race time, every lane
```

- **Flows:** all three races to the podium with 1 and 2 swimmers and mixed levels; the buddy's whole visit (pop up, signature, treat, turbo kick, pop out) in freestyle and backstroke; the relay change-over with "CHEER FOR TEDDY!" on the waiting brother's strip; the high five; a lost race ("💪 GOOD TRY!"); keys sent as real key events on the home screen and in a race (presses judged, strays counted as SPLASH), a pad tapped with a pointer event, P pausing and resuming with the clock standing still.
- **The ? panel:** with real frames running, the race clock stood still while the panel was open and carried on after it closed.
- **Sound, muted:** the kit's switch was off (master gain 0) and the audio context ran. Counting the oscillators the page started in the first 8 s of a perfect EASY race: 5 triangle wood-block ticks for the 5 notes so far, 4 square beeps (3, 2, 1, GO!), the whistle, the dive and the PERFECT chimes (23 oscillators in all, plus 8 noise bursts for the splashes); none of it audible.
- **Screens:** desktop 1200 x 750, iPad landscape (1024 x 768) and portrait (820 x 1180), phone portrait (390 x 844) and landscape (740 x 360), with touch emulated. The kit's buttons never cover the swimming buttons.
- **中文:** with `Kit.lang.set('zh')`, the home screen, the ? panel, the countdown, swimming (hits, misses, splashes, NEED AIR!), the buddy and his turbo kick, pause, results (won and lost), the relay with 2 players and its results: `Kit.lang.untranslated()` is `[]` everywhere, and a made-up English line shows up in it (so it can fail). In English mode nothing on the page is Chinese except the kit's language button tooltip, which names the language a tap switches to.
- No console errors.

## Files

```
index.html          page, menus, HUD, pads and overlays (CSS inline)
js/title.js         the game's name, in one place
js/friends.js       Foxy 🦊 and Froggy 🐸 (copied from TT Track & Field)
js/sim.js           the rules: beats, judging, breathing, speed, turns, the relay, the CPU friends, places, stars (runs in Node)
js/checks.js        the headless checks and their proofs (game.check() and tools/check.js)
js/sfx.js           the game's sounds on Kit.sound.tone / hiss
js/pool.js          Three.js: the pool, water, lane ropes, blocks, flags, deck, fans, scoreboard, podium, splashes, confetti, camera
js/swimmer.js       the swimmers: trunks and goggles, the dive, freestyle and backstroke strokes, breathing, kicking, poses
js/hud.js           the beat strip (2D canvas) and where the strips and buttons go on each screen
js/buddy.js         calling your brother: pop up, signature move, treat, turbo kick
js/game.js          home, the race loop, input, pads, pause, results and the podium, window.game
js/keys.js          the keys the ? panel shows (Kit.help)
js/zh.js            中文 (Kit.lang); names and the game's name stay English
tools/check.js      the headless checks in Node
kit/                copy of ~/claude-games/kit; edit the kit there, not here
dist/swim-tt.html   the single-file build
```

## Not verified

- **The sound:** nobody has heard it. The ticks, splashes, chimes, whistle and cheers are made in code (checked above), but whether they sound good, and whether the beat tick is loud enough to swim to, is untested.
- **Real touch devices:** the buttons use pointer events, tested with scripted events in phone and iPad emulation, not with thumbs on a real iPad or phone or in iOS Safari (two brothers tapping at once on one iPad is untested).
- **Frame rate on an iPad:** not timed on a device. The rules don't depend on it (checked), but the look might.
- **How hard it is for real kids:** the levels were tuned with scripted swimmers, not by watching Teddy and Tommy play. If EASY is too hard for Tommy, the timing windows are in `LEVEL` in [js/sim.js](js/sim.js).
- **file://:** the page uses only classic `<script src>` tags and no fetches; both `index.html` and the single-file build were opened from `file://` in headless Chrome.
