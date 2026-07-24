'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const css=read('src/features/profile/profile-v1007-spacing-settings-fix.css');
const script=read('src/features/profile/profile-v1007-spacing-settings-fix.js');
const index=read('src/features/profile/index.js');
const runtime=read('runtime-manifest.js');

assert.match(css,/body:has\(\.profile-screen\.active\) \.app/);
assert.match(css,/padding-bottom:0!important/);
assert.match(css,/padding-top:0!important/);
assert.match(css,/padding-bottom:calc\(18px \+ env\(safe-area-inset-bottom\)\)/);
assert.match(script,/openModal\('settingsCenterModal'\)/);
assert.match(script,/addEventListener\('click',openSettings\)/);
assert.match(script,/addEventListener\('touchend'/);
assert.match(index,/profile-v1007-spacing-settings/);
assert.match(runtime,/profile-v1007-spacing-settings-fix\.css\?v=10\.0\.7-alpha/);
assert.match(runtime,/profile-v1007-spacing-settings-fix\.js\?v=10\.0\.7-alpha/);
console.log('Profil 10.0.7: Leerflächen und direkter Einstellungen-Aufruf geprüft.');
