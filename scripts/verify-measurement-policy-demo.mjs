#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash,generateKeyPairSync,sign,verify} from 'node:crypto';
const article=readFileSync('src/content/blog/embedded/embedded-security/chapter12-spdm-cma.md','utf8');
const block=article.match(/^```js title="measurement-policy-demo.mjs"\n([\s\S]*?)^```/m);assert.ok(block);
const {acceptDemo}=await import('data:text/javascript;base64,'+Buffer.from(block[1]).toString('base64'));
const {privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const other=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const hash=s=>createHash('sha256').update(s).digest();
const digest=hash('synthetic firmware current'),old=hash('synthetic firmware old'),nonce=Buffer.alloc(32,0x42),otherNonce=Buffer.alloc(32,0x43);
const message=(n,d)=>Buffer.concat([Buffer.from('MEASUREMENT-DEMO-v1\0'),n,d]);
const signature=sign('sha256',message(nonce,digest),privateKey);
const args=[publicKey,nonce,digest,nonce,digest,signature];
assert.equal(acceptDemo(...args),true);
const corrupted=Buffer.from(signature);corrupted[corrupted.length-1]^=1;
for(const replacement of [
 [0,other.publicKey],[1,otherNonce],[2,old],[3,otherNonce],[4,old],[5,corrupted],
 [5,signature.subarray(0,7)],[5,Buffer.alloc(73)]
]){const a=[...args];a[replacement[0]]=replacement[1];assert.equal(acceptDemo(...a),false);}
let malformed=0;
for(const index of [1,2,3,4])for(const value of [null,'not bytes',Buffer.alloc(31),Buffer.alloc(33)]){
 const a=[...args];a[index]=value;assert.equal(acceptDemo(...a),false);malformed++;
}
const oldSig=sign('sha256',message(nonce,old),privateKey);
assert.equal(verify('sha256',message(nonce,old),publicKey,oldSig),true);
assert.equal(acceptDemo(publicKey,nonce,digest,nonce,old,oldSig),false);
const otherSig=sign('sha256',message(nonce,digest),other.privateKey);
assert.equal(verify('sha256',message(nonce,digest),other.publicKey,otherSig),true);
assert.equal(acceptDemo(publicKey,nonce,digest,nonce,digest,otherSig),false);
console.log('PASS: unchanged article P256/SHA256 custom DER envelope policy; valid accept, wrong key/expected nonce/reference/response nonce/digest/signature and truncated/oversize signatures reject; '+malformed+' malformed field cases.');
console.log('PASS: independently valid signature on forbidden old digest rejects by reference policy; independently valid other-key signature rejects under trusted key.');
console.log('Synthetic envelope, not SPDM wire encoding/transcript or device attestation. No certificate chain/EKU/revocation, negotiated algorithms, fresh hardware entropy, firmware measurement engine, session/DOE/CMA, IDE or physical trust validation.');
