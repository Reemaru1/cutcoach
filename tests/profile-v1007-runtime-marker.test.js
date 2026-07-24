'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
assert.equal(fs.readFileSync('PROFILE_1007_CACHE_MARKER','utf8').trim(),'profile1007-spacing-settings');
console.log('Profil 10.0.7 Deployment-Marker geprüft.');
