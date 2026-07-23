'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'src/features/profile/profile-v1006-layout-fix.css'),'utf8');
const script=fs.readFileSync(path.join(root,'src/features/profile/profile-v1006-layout-fix.js'),'utf8');
const index=fs.readFileSync(path.join(root,'src/features/profile/index.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

assert.match(css,/padding-top:max\(18px,env\(safe-area-inset-top\)\)/);
assert.match(css,/\.coach-privacy\{display:none!important\}/);
assert.match(css,/padding-bottom:calc\(104px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(script,/profile-settings-privacy-note/);
assert.match(script,/Profil- und Gesundheitsdaten bleiben ausschließlich auf diesem Gerät/);
assert.match(index,/profile-v1006-layout-fix\.css\?v=10\.0\.6-alpha/);
assert.match(index,/profile-v1006-layout-fix\.js\?v=10\.0\.6-alpha/);
assert.match(runtime,/profile-v1006-layout-fix\.css\?v=10\.0\.6-alpha/);
assert.match(runtime,/profile-v1006-layout-fix\.js\?v=10\.0\.6-alpha/);
assert.match(sw,/profile1006-layout/);
console.log('Profil 10.0.6 Safe-Area, Einstellungen und kompakter Abschluss geprüft.');
