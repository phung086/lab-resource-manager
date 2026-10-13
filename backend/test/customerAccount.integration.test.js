import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import request from 'supertest';

const url = new URL(process.env.CUSTOMER_TEST_DATABASE_URL || '');
assert.ok(['localhost','127.0.0.1'].includes(url.hostname));
assert.equal(url.pathname, '/lab_resources_customer_test');
Object.assign(process.env, { DATABASE_URL: url.href, NODE_ENV: 'test', JWT_SECRET: 'customer-contract-test-secret-32-characters', LOG_FORMAT: 'dev', RATE_LIMIT_MAX: '10000', PAYMENTS_ENABLED: 'false' });
const [{ createApp }, { prisma }] = await Promise.all([import('../src/app.js'), import('../src/db.js')]);
const app = createApp(), marker = randomUUID(), password = 'Customer!2026';
const tokens = {}, users = {};
let lab, resource, customer, booking;
const call = (method, path, name, body) => {
  const req = request(app)[method]('/api'+path);
  if (tokens[name]) req.set('Authorization','Bearer '+tokens[name]);
  return body ? req.send(body) : req;
};
test.before(async () => {
  assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name,'lab_resources_customer_test');
  assert.ok((await prisma.user.findMany({select:{email:true}})).every(user => user.email.endsWith('@customer.test')));
  const hash = await bcrypt.hash(password,4);
  for(const [name,role] of Object.entries({admin:'ADMIN',staff:'LAB_STAFF',other:'CUSTOMER'})) {
    users[name] = await prisma.user.create({data:{id:randomUUID(),email:`${name}-${marker}@customer.test`,fullName:name,role,passwordHash:hash}});
    tokens[name] = (await call('post','/auth/login',null,{email:users[name].email,password})).body.accessToken;
  }
  const campus = await prisma.campus.create({data:{id:randomUUID(),code:'C-'+marker,name:'Contract test'}});
  const building = await prisma.building.create({data:{id:randomUUID(),code:'B-'+marker,name:'Contract test',campusId:campus.id}});
  lab = await prisma.laboratory.create({data:{id:randomUUID(),code:'L-'+marker,name:'Contract test',buildingId:building.id}});
  await prisma.userLabAssignment.create({data:{userId:users.staff.id,laboratoryId:lab.id}});
  resource = await prisma.resource.create({data:{id:randomUUID(),code:'R-'+marker,name:'Contract room',category:'ROOM',subtype:'ROOM',location:'Lab',laboratoryId:lab.id}});
});
test.after(() => prisma.$disconnect());

test('forward migration preserves IDs, credentials and original audit role evidence', async () => {
  for(const name of ['student','lecturer']) {
    const row = await prisma.user.findUniqueOrThrow({where:{id:'customer-migration-'+name}});
    assert.equal(row.role,'CUSTOMER'); assert.equal(row.passwordHash,'migration-unchanged');
  }
  const event = await prisma.systemAuditEvent.findUniqueOrThrow({where:{id:'customer-migration-audit'}});
  assert.equal(event.actorRoleSnapshot,'LECTURER'); assert.deepEqual(event.beforeState,{role:'STUDENT'}); assert.deepEqual(event.afterState,{role:'LECTURER'});
  const values = await prisma.$queryRaw`SELECT enumlabel FROM pg_enum e JOIN pg_type t ON e.enumtypid=t.oid WHERE t.typname='Role' ORDER BY enumsortorder`;
  assert.deepEqual(values.map(row=>row.enumlabel),['ADMIN','LAB_STAFF','CUSTOMER']);
});
test('registration accepts exactly email and password; no personal identity is invented', async () => {
  const response=await call('post','/auth/register',null,{email:`  New-${marker}@Customer.Test  `,password});
  assert.equal(response.status,201,JSON.stringify(response.body)); customer=response.body.user;tokens.customer=response.body.accessToken;
  assert.equal(customer.role,'CUSTOMER'); assert.equal(customer.fullName,''); assert.equal(customer.phone,null);
  assert.equal(customer.email,`new-${marker}@customer.test`);
  const stored=await prisma.user.findUniqueOrThrow({where:{id:customer.id}});assert.ok(await bcrypt.compare(password,stored.passwordHash));
  const welcome=await prisma.emailDelivery.findFirstOrThrow({where:{userId:customer.id,kind:'ACCOUNT_REGISTERED'}});
  assert.equal(welcome.status,'PENDING');assert.ok(!JSON.stringify(welcome).includes(password));
});
test('registration reports email/password separately, rejects role injection and duplicate email', async () => {
  const invalid=await call('post','/auth/register',null,{email:'wrong',password:'short'});
  assert.equal(invalid.status,400);assert.deepEqual(Object.keys(invalid.body.error.details.fieldErrors),['email','password']);
  const extra=await call('post','/auth/register',null,{email:`extra-${marker}@customer.test`,password,role:'ADMIN'});assert.equal(extra.status,400);
  const duplicate=await call('post','/auth/register',null,{email:customer.email,password});assert.equal(duplicate.status,409);assert.equal(duplicate.body.error.details.field,'email');
});
test('customers cannot read other accounts, administer users, operate equipment or read academic archive', async () => {
  for(const path of ['/users','/lab-workspace/groups']) assert.equal((await call('get',path,'customer')).status,403);
  assert.equal((await call('patch',`/resources/${resource.id}/operational-status`,'customer',{operationalStatus:'BROKEN',reason:'Invalid privilege attempt'})).status,403);
  for(const role of ['STUDENT','LECTURER']) assert.equal((await call('patch',`/users/${customer.id}/role`,'admin',{role})).status,400);
  assert.equal((await call('post','/lab-workspace/groups','admin',{code:'X'})).status,404);
});
const interval=offset=>{const start=Math.ceil(Date.now()/60000)*60000+86400000+offset*3600000;return {startAt:new Date(start).toISOString(),endAt:new Date(start+3600000).toISOString()};};
test('first booking requires contact; errors identify only the incorrect contact field', async () => {
  const body={resourceId:resource.id,title:'Room session',...interval(0)};
  const missing=await call('post','/bookings','customer',body);assert.equal(missing.status,400);assert.equal(missing.body.error.code,'BOOKING_CONTACT_REQUIRED');
  assert.deepEqual(Object.keys(missing.body.error.details.fieldErrors),['fullName','phone']);
  const phone=await call('post','/bookings','customer',{...body,contact:{fullName:'Real Contact',phone:'abc'}});
  assert.equal(phone.status,400);assert.deepEqual(phone.body.error.details.issues.map(issue=>issue.field),['contact.phone']);
  assert.equal(await prisma.booking.count({where:{requestedById:customer.id}}),0);
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:customer.id}})).fullName,'');
});
test('valid booking automatically confirms and saves contact + snapshot transactionally', async () => {
  const contact={fullName:'Booking Contact',phone:'0901234567'};
  const response=await call('post','/bookings','customer',{resourceId:resource.id,title:'Room session',contact,...interval(0)});
  assert.equal(response.status,201,JSON.stringify(response.body));booking=response.body;
  assert.equal(booking.status,'CONFIRMED');assert.equal(booking.approvedById,null);
  assert.deepEqual(booking.contactSnapshot,{...contact,email:customer.email});
  const saved=await prisma.user.findUniqueOrThrow({where:{id:customer.id}});assert.equal(saved.phone,contact.phone);assert.equal(saved.fullName,contact.fullName);
  assert.equal((await call('get',`/bookings/${booking.id}`,'other')).status,404);
});
test('booking conflict does not overwrite contact; later profile edit preserves booking snapshot', async () => {
  const conflict=await call('post','/bookings','customer',{resourceId:resource.id,title:'Conflict session',contact:{fullName:'Wrong overwrite',phone:'0912345678'},startAt:booking.startAt,endAt:booking.endAt});
  assert.equal(conflict.status,409);assert.equal(conflict.body.error.code,'BOOKING_CONFLICT');
  assert.equal((await prisma.user.findUniqueOrThrow({where:{id:customer.id}})).fullName,'Booking Contact');
  assert.equal((await call('patch','/users/me','customer',{fullName:'Updated Profile'})).status,200);
  assert.equal((await call('get',`/bookings/${booking.id}`,'customer')).body.contactSnapshot.fullName,'Booking Contact');
});
test('saved valid contact supports subsequent bookings; public schedule never exposes it', async () => {
  const result=await call('post','/bookings','customer',{resourceId:resource.id,title:'Another session',...interval(3)});
  assert.equal(result.status,201,JSON.stringify(result.body));assert.equal(result.body.contactSnapshot.fullName,'Updated Profile');
  const response=await call('get',`/calendar/events?resource_id=${resource.id}&start=${booking.startAt}&end=${booking.endAt}`,null);
  assert.equal(response.status,200,JSON.stringify(response.body));
  const publicData=JSON.stringify(response.body);assert.ok(!publicData.includes('0901234567'));assert.ok(!publicData.includes(customer.email));
});
