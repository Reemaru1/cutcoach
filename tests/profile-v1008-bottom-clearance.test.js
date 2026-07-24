'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'src/features/profile/profile-v1008-bottom-clearance.css'),'utf8');
const index=fs.readFileSync(path.join(root,'src/features/profile/index.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const worker=fs.readFileSync(path.join(root,'sw.js'),'utf8');

assert.match(css,/padding-bottom:calc\(100px \+ env\(safe-area-inset-bottom\)\)!important/,'Mobile profile clearance must keep the final action above the fixed navigation.');
assert.match(css,/scroll-padding-bottom:calc\(100px \+ env\(safe-area-inset-bottom\)\)/,'Scroll snapping/focus clearance must match the visual footer clearance.');
assert.match(index,/profile-v1008-bottom-clearance\.css\?v=10\.0\.8-alpha/,'Profile loader must load the clearance correction last.');
assert.match(runtime,/profile-v1008-bottom-clearance\.css\?v=10\.0\.8-alpha/,'Offline runtime must include the clearance correction.');
assert.match(worker,/profile1008-bottom-clearance/,'Service-worker cache generation must be invalidated.');
assert.doesNotMatch(css,/padding-bottom:calc\(18px/,'The broken too-tight profile footer must not return.');

console.log('Profil 10.0.8: letzter Button bleibt mit ausgewogenem Abstand vollständig über der Navigation.');
