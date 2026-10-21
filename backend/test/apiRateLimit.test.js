import test from 'node:test';import assert from 'node:assert/strict';import request from 'supertest';
import {config} from '../src/config.js';import {createApp} from '../src/app.js';
test('ingress 429 exposes a bounded Retry-After and resets without changing authentication',async()=>{
 const previous={max:config.rateLimitMax,window:config.rateLimitWindowMs};config.rateLimitMax=2;config.rateLimitWindowMs=300;
 try {const app=createApp();assert.equal((await request(app).get('/health')).status,200);assert.equal((await request(app).get('/health')).status,200);
 const limited=await request(app).get('/health').set('Origin','http://localhost:5173');assert.equal(limited.status,429);assert.equal(limited.body.error.code,'RATE_LIMITED');assert.equal(limited.body.error.details.retryAfterSeconds,1);assert.equal(limited.headers['retry-after'],'1');assert.ok(limited.headers['access-control-expose-headers'].includes('Retry-After'));
 await new Promise(resolve=>setTimeout(resolve,350));assert.equal((await request(app).get('/health')).status,200);
 } finally {config.rateLimitMax=previous.max;config.rateLimitWindowMs=previous.window;}
});
