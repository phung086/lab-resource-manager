import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingRoomAccessCode } from '../src/services/bookingRoomAccessCode.js';
test('room code uses booking contact snapshot and preserves leading zero', () => {
 assert.equal(bookingRoomAccessCode({contactSnapshot:{phone:'0901234567'},requestedBy:{phone:'0999999999'}}),'0901234567');
 assert.equal(bookingRoomAccessCode({contactSnapshot:{phone:'+84 912 345 678'}}),'84912345678');
});
test('missing and malformed contacts never fall back to another identity or a shared room password', () => {
 for(const phone of ['',null,12,'abc0901234567','123456','090123456789012345'])assert.equal(bookingRoomAccessCode({contactSnapshot:{phone}}),null);
 assert.equal(bookingRoomAccessCode({requestedBy:{phone:'0901234567'},roomPassword:'shared'}),null);
});
