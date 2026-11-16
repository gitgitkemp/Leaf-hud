// Controleert de G-meter-rekenkern uit index.html met een nagebootste auto.
// Draaien: node tests/motion.test.js
'use strict';
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/\/\/ ==== MOTION-CORE START([\s\S]*?)\/\/ ==== MOTION-CORE END/);
if (!m) throw new Error('MOTION-CORE niet gevonden in index.html');
const MotionCore = new Function(m[1] + '\nreturn MotionCore;')();
const G = MotionCore.G;

// Autoassen: X rechts, Y vooruit, Z omhoog.
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const rotZ = (v, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; };
const rotX = (v, deg) => { const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; };

// Telefoonassen (ex, ey, ez) uitgedrukt in autoassen.
const MOUNTS = {
  rechtop: { angle: 0, hud: false, ax: [[1, 0, 0], [0, 0, 1], [0, -1, 0]] },
  liggend90: { angle: 90, hud: false, ax: [[0, 0, 1], [-1, 0, 0], [0, -1, 0]] },
  liggend270: { angle: 270, hud: false, ax: [[0, 0, -1], [1, 0, 0], [0, -1, 0]] },
  plat: { angle: 0, hud: false, ax: [[1, 0, 0], [0, 1, 0], [0, 0, 1]] },
  hud: { angle: 0, hud: true, ax: [[-1, 0, 0], [0, -1, 0], [0, 0, 1]] }
};
function mount(name, opts = {}) {
  let ax = MOUNTS[name].ax.map((v) => v.slice());
  if (opts.tilt) ax = ax.map((v) => rotX(v, opts.tilt));  // kantelen om de dwarsas
  if (opts.yaw) ax = ax.map((v) => rotZ(v, opts.yaw));    // scheve houder
  return { angle: MOUNTS[name].angle, hud: MOUNTS[name].hud, ax, s: opts.s || 1 };
}
function toDevice(mt, v) { return mt.ax.map((e) => dot(v, e) * mt.s); }

// Stuur 'secs' seconden een constante versnelling (in g) door de kern.
function drive(proc, mt, lonG, latG, secs) {
  const dt = 1 / 60;
  const acc = [latG * G, lonG * G, 0];
  const a = toDevice(mt, acc);
  const ag = toDevice(mt, [acc[0], acc[1], acc[2] + G]);
  for (let t = 0; t < secs; t += dt) proc.sample(a, ag, mt.angle, mt.hud, dt);
}

// Nagebootste rit met GPS-metingen per seconde: optrekken, remmen, bochten.
function calibrate(proc, mt) {
  let v = 10, hd = 0;
  const legs = [];
  for (let i = 0; i < 30; i++) legs.push([0.15, 0, 0], [-0.15, 0, 0], [0, 0.2, 1], [0, -0.2, -1]);
  for (const [lonG, latG, turn] of legs) {
    drive(proc, mt, lonG, latG, 1);
    const v1 = v + lonG * G * 1;
    const hRate = turn ? (latG * G / v) * 180 / Math.PI : 0;
    const h1 = hd + hRate;
    proc.gps(v, v1, 1, turn ? hRate : 0);
    v = v1; hd = h1;
  }
}

let fails = 0, total = 0;
function check(label, proc, mt, lonG, latG) {
  drive(proc, mt, lonG, latG, 1.5);
  const gl = proc.lon / G, gt = proc.lat / G;
  total++;
  const ok = Math.abs(gl - lonG) < 0.02 && Math.abs(gt - latG) < 0.02;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FOUT'} ${label.padEnd(44)} verwacht voor ${lonG.toFixed(2)} opzij ${latG.toFixed(2)}  kreeg ${gl.toFixed(3)} ${gt.toFixed(3)}`);
}
function suite(label, mt, withCal) {
  const p = new MotionCore.Proc();
  drive(p, mt, 0, 0, 2); // eerst stilstaan: zwaartekracht en sensorteken bepalen
  if (withCal) calibrate(p, mt);
  check(label + ' optrekken', p, mt, 0.3, 0);
  check(label + ' remmen', p, mt, -0.4, 0);
  check(label + ' bocht rechts', p, mt, 0, 0.25);
  check(label + ' bocht links', p, mt, 0, -0.25);
  check(label + ' remmen in bocht links', p, mt, -0.2, -0.2);
}

// Zonder kalibratie moet de meter meteen goed staan in elke normale houder.
suite('rechtop', mount('rechtop'), false);
suite('rechtop 25° achterover', mount('rechtop', { tilt: 25 }), false);
suite('liggend 90', mount('liggend90'), false);
suite('liggend 270', mount('liggend270'), false);
suite('plat op dashboard', mount('plat'), false);
suite('HUD-stand', mount('hud'), false);
suite('omgekeerde sensor (oude iOS)', mount('rechtop', { s: -1 }), false);
suite('liggend 90, omgekeerde sensor', mount('liggend90', { s: -1 }), false);
// Scheve houder: pas na kalibratie met GPS goed.
suite('houder 25° scheef + kalibratie', mount('rechtop', { yaw: 25 }), true);
suite('houder -35° scheef, 15° kantel + kal.', mount('rechtop', { yaw: -35, tilt: 15 }), true);
suite('liggend 270, 20° scheef + kalibratie', mount('liggend270', { yaw: 20 }), true);

// Kalibratie mag een goede houder niet verpesten.
suite('rechtop + kalibratie', mount('rechtop'), true);

// Nulpunt: sensor met afwijking, stilstand leert hem weg.
(function () {
  const mt = mount('rechtop');
  const p = new MotionCore.Proc();
  const off = [0.25, -0.15, 0.2];
  const dt = 1 / 60;
  for (let t = 0; t < 20; t += dt) p.sample(off, [off[0], off[1] + G, off[2]], 0, false, dt), p.standstill(dt);
  total++;
  const ok = Math.abs(p.lon) < 0.02 && Math.abs(p.lat) < 0.02;
  if (!ok) fails++;
  console.log(`${ok ? 'OK  ' : 'FOUT'} nulpunt bij stilstand                        kreeg ${p.lon.toFixed(3)} ${p.lat.toFixed(3)} m/s2`);
})();

// Opslaan en terugzetten
(function () {
  const mt = mount('rechtop', { yaw: 30 });
  const p = new MotionCore.Proc();
  drive(p, mt, 0, 0, 2); calibrate(p, mt);
  const q = new MotionCore.Proc();
  q.importCal(JSON.parse(JSON.stringify(p.exportCal())));
  drive(q, mt, 0, 0, 2);
  check('kalibratie opslaan en laden', q, mt, 0.3, 0.1);
})();

console.log(`\n${total - fails}/${total} goed`);
process.exit(fails ? 1 : 0);
