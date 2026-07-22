'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const name of ['body-progress-body-v211.b64','body-progress-training-v211.b64']){
  const content=fs.readFileSync(path.join(root,name),'utf8').trim();
  assert.match(content,/^UklGR/);
  assert.doesNotMatch(content,/\s/);
  assert.ok(Buffer.from(content,'base64').length>3000);
}
console.log('Body Progress 2.1.1: Beide freigegebenen WebP-Referenzfiguren sind vollständig und offlinefähig eingebettet.');
