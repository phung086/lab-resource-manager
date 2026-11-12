import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import test from 'node:test';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';

process.env.NODE_ENV='test';
process.env.GOOGLE_CLIENT_ID='unit-fixture.apps.googleusercontent.com';
const { validateGoogleClaims, verifyGoogleCredential } = await import('../src/services/googleAuthService.js');
const { privateKey, publicKey } = generateKeyPairSync('rsa',{modulusLength:2048});
const nonce='google-test-nonce-with-at-least-thirty-two-characters';
const claims={sub:'google-fixture-subject',email:'fixture@gmail.com',email_verified:true,nonce,name:'Google Fixture',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+300};
const verifier=new OAuth2Client();
const offlineVerifier={verifyIdToken:({idToken,audience,maxExpiry})=>verifier.verifySignedJwtWithCertsAsync(idToken,{'unit-key':publicKey.export({type:'spki',format:'pem'})},audience,['accounts.google.com','https://accounts.google.com'],maxExpiry)};
const token = (overrides={},options={}) => jwt.sign({...claims,...overrides},privateKey,{algorithm:'RS256',keyid:'unit-key',issuer:'https://accounts.google.com',audience:process.env.GOOGLE_CLIENT_ID,...options});

test('signed Google-shaped token is verified by SDK before claims are consumed',async()=>{
  const identity=await verifyGoogleCredential(token(),nonce,offlineVerifier);
  assert.equal(identity.subject,claims.sub);assert.equal(identity.email,claims.email);assert.equal(identity.authoritative,true);
});
for(const [name,overrides,options,expectedNonce] of [
 ['bad audience',{}, {audience:'foreign-client'},nonce],['bad issuer',{}, {issuer:'https://attacker.example'},nonce],
 ['expired',{exp:Math.floor(Date.now()/1000)-1},{},nonce],['unverified email',{email_verified:false},{},nonce],
 ['missing nonce',{nonce:undefined},{},nonce],['wrong nonce',{}, {},'different-nonce-with-thirty-two-characters'],
 ['future issue time',{iat:Math.floor(Date.now()/1000)+600},{},nonce],['missing subject',{sub:undefined},{},nonce]
]) test(`rejects ${name}`,async()=>{
  await assert.rejects(verifyGoogleCredential(token(overrides,options),expectedNonce,offlineVerifier),error=>error.code==='GOOGLE_INVALID_CREDENTIAL');
});
test('signature tampering cannot produce an account',async()=>{
  const signed=token().split('.');signed[1]=Buffer.from(JSON.stringify({...claims,email:'attacker@gmail.com'})).toString('base64url');
  await assert.rejects(verifyGoogleCredential(signed.join('.'),nonce,offlineVerifier),error=>error.code==='GOOGLE_INVALID_CREDENTIAL');
});
test('third-party email is not treated as Google-authoritative for auto-registration',()=>{
  assert.equal(validateGoogleClaims({...claims,email:'user@example.test'},nonce).authoritative,false);
  assert.equal(validateGoogleClaims({...claims,email:'user@example.test',hd:'example.test'},nonce).authoritative,true);
});
test('provider outage remains unavailable and does not disclose the credential',async()=>{
  await assert.rejects(verifyGoogleCredential('not-a-real-token',nonce,{verifyIdToken:()=>{throw Object.assign(new Error('network error'),{code:'ECONNRESET'});}}),error=>error.code==='GOOGLE_UNAVAILABLE'&&!error.message.includes('not-a-real-token'));
});
