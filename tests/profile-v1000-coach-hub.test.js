'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const script=read('src/features/profile/profile-v1000.js');
const css=read('src/features/profile/profile-v1000.css');
const index=read('src/features/profile/index.js');
const runtime=read('runtime-manifest.js');
const sw=read('sw.js');

assert.match(script,/const VERSION='10\.0\.4-alpha'/);
assert.match(script,/Persönliche DNA/);
assert.match(script,/Dein Tagesrahmen/);
assert.match(script,/profileCompleteness/);
assert.match(script,/coach-course-summary/);
assert.doesNotMatch(script,/Coach Intelligence|coachSignals|weightProgress|coachWeightProgress/,'Tages- und Fortschrittslogik darf nicht mehr Teil der Profil-Zentrale sein.');
assert.match(script,/Deine Profil- und Gesundheitsdaten bleiben auf diesem Gerät/);
assert.doesNotMatch(script,/Freunde|Upgrade|Pro-Abo/i,'Die Coach-Zentrale darf keine kopierten Social- oder Upsell-Bausteine enthalten.');

assert.match(css,/CutCoach Profil 10\.0\.4/);
assert.match(css,/\.coach-route/);
assert.match(css,/\.coach-course-summary/);
assert.match(css,/\.coach-dna-list/);
assert.match(css,/\.coach-target-grid/);
assert.match(css,/@media\(max-width:520px\)/);

assert.ok(index.indexOf('profile-state-bridge')<index.indexOf('profile-v1000-script'),'Die Zustandsbrücke muss vor der Coach-Zentrale geladen werden.');
assert.match(runtime,/profile-v1000\.css\?v=10\.0\.4-alpha/);
assert.match(runtime,/profile-state-bridge\.js\?v=10\.0\.0-alpha/);
assert.match(runtime,/profile-v1000\.js\?v=10\.0\.4-alpha/);
assert.match(sw,/profile1004-separation-progress230/);

console.log('Profil 10.0.4: persönliche Grundlagen, Zielmatrix, klare Bereichstrennung und Offline-Pfad geprüft.');
