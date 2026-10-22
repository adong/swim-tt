#!/usr/bin/env node
/* Run the headless checks (js/checks.js) in node, without a browser: node tools/check.js
   Loads the page's own rules (js/sim.js), then runs every check and its proof that it can fail. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

global.window = global;
for (const f of ['sim', 'checks']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
const out = window.SW.checks.run({ prove: process.argv[2] !== '--quick' });
for (const r of out.results) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.name}${r.ok ? '' : '\n      ' + r.problems.slice(0, 8).join('\n      ')}`);
for (const p of out.prove) console.log(`${p.caught ? 'ok  ' : 'FAIL'} broken ${p.name} is caught: ${p.first}`);
console.log(out.stats.join('\n'));
console.log(`${out.ok ? 'ALL OK' : 'PROBLEMS'} (${out.ms} ms)`);
process.exit(out.ok ? 0 : 1);
