import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import net from "node:net";
import test from "node:test";
import bcrypt from "bcryptjs";
import request from "supertest";
const database = new URL(process.env.ACCOUNT_SECURITY_TEST_DATABASE_URL || "http://missing");
assert.ok(["127.0.0.1", "localhost"].includes(database.hostname));
assert.equal(database.port, "25439");
assert.equal(database.pathname, "/lab_resources_account_security_test", "Refuse business/shared databases");
// Real loopback SMTP protocol fixture. No transport mocks or external inboxes.
const messages = [], sockets = new Set();
let rejectData = false;
const smtp = net.createServer(socket => {
  sockets.add(socket); socket.on("close", () => sockets.delete(socket));
  socket.setEncoding("utf8"); socket.write("220 email-fixture.local ESMTP\r\n");
  let buffer = "", raw = "", recipient = "", data = false, auth = false;
  socket.on("data", chunk => {
    buffer += chunk;
    while (buffer.includes("\r\n")) {
      const index = buffer.indexOf("\r\n"), line = buffer.slice(0, index);
      buffer = buffer.slice(index + 2);
      if (data) {
        if (line !== ".") { raw += line.replace(/^\.\./, ".") + "\r\n"; continue; }
        data = false;
        if (rejectData) socket.write("451 4.3.0 Temporary fixture rejection\r\n");
        else { messages.push({ recipient, raw }); socket.write("250 2.0.0 Message accepted\r\n"); }
        raw = ""; continue;
      }
      if (auth) { auth = false; socket.write("235 2.7.0 Authentication successful\r\n"); }
      else if (/^EHLO /i.test(line)) socket.write("250-email-fixture.local\r\n250-AUTH PLAIN\r\n250 8BITMIME\r\n");
      else if (/^AUTH PLAIN/i.test(line)) {
        if (line.split(" ").length >= 3) socket.write("235 2.7.0 Authentication successful\r\n");
        else { auth = true; socket.write("334 \r\n"); }
      } else if (/^RCPT TO:/i.test(line)) { recipient = line.match(/<([^>]+)>/)[1]; socket.write("250 2.1.5 OK\r\n"); }
      else if (/^DATA$/i.test(line)) { data = true; socket.write("354 End with dot\r\n"); }
      else if (/^QUIT$/i.test(line)) socket.end("221 2.0.0 Bye\r\n");
      else socket.write("250 2.1.0 OK\r\n");
    }
  });
});
await new Promise(resolve => smtp.listen(0, "127.0.0.1", resolve));

Object.assign(process.env, {
 DATABASE_URL: database.href, NODE_ENV: "test", LOG_FORMAT: "dev", RATE_LIMIT_MAX: "10000",
 JWT_SECRET: "account-security-isolated-secret-at-least-32-chars", PAYMENTS_ENABLED: "false",
 SMTP_HOST: "127.0.0.1", SMTP_PORT: String(smtp.address().port), SMTP_USER: "fixture", SMTP_PASS: "fixture-only",
 EMAIL_FROM: '"LAB Fixture" <sender@security.test>', EMAIL_APP_URL: "http://localhost:5173",
 EMAIL_AUTOMATION_ENABLED: "false", REMINDER_SCHEDULER_ENABLED: "false"
});
const [{createApp},{prisma},{signUserToken}] = await Promise.all([import("../src/app.js"),import("../src/db.js"),import("../src/services/authTokens.js")]);
const app=createApp(), marker=randomUUID(), password="AccountSecurity!2026", newPassword="UpdatedSecurity!2026";
const users={}, tokens={}; let customer, resource, booking;
const call=(method,path,actor,body)=>{const q=request(app)[method]("/api"+path);if(tokens[actor])q.set("Authorization","Bearer "+tokens[actor]);return body?q.send(body):q;};
const err=(response,status,code)=>{assert.equal(response.status,status,JSON.stringify(response.body));assert.equal(response.body.error.code,code);};
const ask=(id,actor="staff")=>call("post","/users/"+id+"/password-otp/request",actor,{reason:"Customer requested assistance"});
const confirm=(id,challengeId,otp,actor="staff",pw=newPassword)=>call("post","/users/"+id+"/password-otp/confirm",actor,{challengeId,otp,newPassword:pw});
function deliveredCode(recipient){const row=messages.findLast(m=>m.recipient===recipient);assert.ok(row,"SMTP accepted a recipient-bound message");const code=row.raw.match(/\b\d{6}\b/)?.[0];assert.ok(code);return code;}
const ageChallenges=id=>prisma.passwordChallenge.updateMany({where:{targetUserId:id},data:{createdAt:new Date(Date.now()-61000)}});
async function makeCustomer(label){return prisma.user.create({data:{id:randomUUID(),email:label+"-"+marker+"@security.test",fullName:label,role:"CUSTOMER",passwordHash:await bcrypt.hash(password,4)}});}

test.before(async()=>{
 assert.equal((await prisma.$queryRaw`SELECT current_database() AS name`)[0].name,"lab_resources_account_security_test");
 assert.ok((await prisma.user.findMany({select:{email:true}})).every(u=>u.email.endsWith("@security.test")));
 for(const [name,role] of Object.entries({admin:"ADMIN",admin2:"ADMIN",staff:"LAB_STAFF",staff2:"LAB_STAFF",other:"CUSTOMER"})){
 users[name]=await prisma.user.create({data:{id:randomUUID(),email:name+"-"+marker+"@security.test",fullName:name,role,passwordHash:await bcrypt.hash(password,4)}});
 tokens[name]=signUserToken(users[name]);
 }
});
test.after(async()=>{await prisma.$disconnect();for(const socket of sockets)socket.destroy();await new Promise(r=>smtp.close(r));});

test("staff manages every CUSTOMER without needing LAB assignment, never staff/admin",async()=>{
 const created=await call("post","/users","staff",{email:"managed-"+marker+"@security.test",password,fullName:"Managed Customer",role:"CUSTOMER"});
 assert.equal(created.status,201,JSON.stringify(created.body));customer=created.body;
 assert.equal(customer.role,"CUSTOMER");assert.ok(!("passwordHash" in customer));assert.ok(!("authVersion" in customer));
 const list=await call("get","/users","staff");assert.equal(list.status,200);assert.ok(list.body.every(u=>u.role==="CUSTOMER"));assert.ok(list.body.some(u=>u.id===customer.id));
 assert.equal((await call("get","/users/"+customer.id,"staff")).status,200);
 for(const target of [users.admin,users.staff2]){
  err(await call("get","/users/"+target.id,"staff"),404,"NOT_FOUND");
  err(await call("patch","/users/"+target.id,"staff",{fullName:"Invalid"}),404,"NOT_FOUND");
  err(await ask(target.id),404,"NOT_FOUND");
 }
 err(await call("post","/users","staff",{email:"escalate-"+marker+"@security.test",password,fullName:"Escalate",role:"ADMIN"}),403,"FORBIDDEN");
 err(await call("patch","/users/"+customer.id+"/role","staff",{role:"ADMIN"}),403,"FORBIDDEN");
 err(await call("get","/users","other"),403,"FORBIDDEN");
 err(await call("get","/users/"+customer.id+"/lab-assignments","staff"),403,"FORBIDDEN");
});

test("contact validation identifies wrong fields and registered email/password cannot be edited",async()=>{
 const edited=await call("patch","/users/"+customer.id,"staff",{fullName:"Updated Customer",phone:"0901234567",organization:"LAB Client"});assert.equal(edited.status,200);
 const invalid=await call("patch","/users/"+customer.id,"staff",{phone:"abc"});err(invalid,400,"VALIDATION_ERROR");assert.ok(invalid.body.error.details.fieldErrors.phone);
 for(const body of [{email:"attacker@security.test"},{password:newPassword},{role:"ADMIN"},{}])err(await call("patch","/users/"+customer.id,"staff",body),400,"VALIDATION_ERROR");
 const saved=await prisma.user.findUniqueOrThrow({where:{id:customer.id}});assert.equal(saved.email,customer.email);assert.equal(saved.phone,"0901234567");
 const event=await prisma.systemAuditEvent.findFirstOrThrow({where:{targetId:customer.id,action:"USER_PROFILE_CHANGED"}});assert.equal(event.actorId,users.staff.id);
});

test("missing or rejected SMTP never permits a password change",async()=>{
 const target=await makeCustomer("delivery");const smtpPass=process.env.SMTP_PASS;delete process.env.SMTP_PASS;
 err(await ask(target.id),503,"SMTP_NOT_CONFIGURED");process.env.SMTP_PASS=smtpPass;
 assert.equal(await prisma.passwordChallenge.count({where:{targetUserId:target.id}}),0);
 rejectData=true;err(await ask(target.id),503,"OTP_NOT_SENT");rejectData=false;
 const row=await prisma.passwordChallenge.findFirstOrThrow({where:{targetUserId:target.id}});assert.ok(row.consumedAt);assert.equal(row.deliveredAt,null);
 err(await confirm(target.id,row.id,"123456"),400,"OTP_ATTEMPTS_EXCEEDED");
 assert.ok(await bcrypt.compare(password,(await prisma.user.findUniqueOrThrow({where:{id:target.id}})).passwordHash));
});

test("assisted OTP binds recipient, actor and target, persists wrong attempts, then revokes old tokens",async()=>{
 tokens.managed=signUserToken(await prisma.user.findUniqueOrThrow({where:{id:customer.id}}));
 const sent=await ask(customer.id);assert.equal(sent.status,200,JSON.stringify(sent.body));assert.deepEqual(Object.keys(sent.body).sort(),["challengeId","expiresAt","maskedEmail","resendAfter"].sort());
 const otp=deliveredCode(customer.email),challengeId=sent.body.challengeId;
 assert.ok(!JSON.stringify(sent.body).includes(otp));assert.ok(!sent.body.maskedEmail.includes(customer.email));assert.ok(new Date(sent.body.resendAfter)>new Date());
 const stored=await prisma.passwordChallenge.findUniqueOrThrow({where:{id:challengeId}});assert.ok(stored.deliveredAt);assert.notEqual(stored.codeHash,otp);
 err(await ask(customer.id),429,"OTP_COOLDOWN");
 err(await confirm(customer.id,challengeId,otp,"staff2"),400,"OTP_INVALID");
 err(await confirm(users.other.id,challengeId,otp),400,"OTP_INVALID");
 const wrong=otp==="000000"?"111111":"000000";err(await confirm(customer.id,challengeId,wrong),400,"OTP_INVALID");
 assert.equal((await prisma.passwordChallenge.findUniqueOrThrow({where:{id:challengeId}})).attempts,1);
 const good=await confirm(customer.id,challengeId,otp);assert.equal(good.status,200,JSON.stringify(good.body));assert.deepEqual(good.body,{success:true});
 err(await call("get","/auth/me","managed"),401,"AUTH_INVALID");
 err(await confirm(customer.id,challengeId,otp),400,"OTP_ATTEMPTS_EXCEEDED");
 err(await call("post","/auth/login",null,{email:customer.email,password}),401,"AUTH_INVALID_CREDENTIALS");
 assert.equal((await call("post","/auth/login",null,{email:customer.email,password:newPassword})).status,200);
 const event=await prisma.systemAuditEvent.findFirstOrThrow({where:{targetId:customer.id,action:"ACCOUNT_CREDENTIAL_CHANGED"}});
 const serialized=JSON.stringify(event);assert.ok(!serialized.includes(otp));assert.ok(!serialized.includes(newPassword));assert.ok(!serialized.includes("passwordHash"));assert.equal(event.metadata.assisted,true);
});

test("five wrong OTP attempts lock the challenge, expired codes are rejected",async()=>{
 const target=await makeCustomer("attempts");const sent=await ask(target.id);assert.equal(sent.status,200);const otp=deliveredCode(target.email),wrong=otp==="000000"?"111111":"000000";
 for(let i=0;i<5;i++)err(await confirm(target.id,sent.body.challengeId,wrong),400,i===4?"OTP_ATTEMPTS_EXCEEDED":"OTP_INVALID");
 err(await confirm(target.id,sent.body.challengeId,otp),400,"OTP_ATTEMPTS_EXCEEDED");
 assert.equal((await prisma.passwordChallenge.findUniqueOrThrow({where:{id:sent.body.challengeId}})).attempts,5);
 await ageChallenges(target.id);const fresh=await ask(target.id);assert.equal(fresh.status,200);
 await prisma.passwordChallenge.update({where:{id:fresh.body.challengeId},data:{expiresAt:new Date(Date.now()-1000)}});
 err(await confirm(target.id,fresh.body.challengeId,deliveredCode(target.email)),400,"OTP_EXPIRED");
});

test("concurrent valid confirmations change password and write audit exactly once",async()=>{
 const target=await makeCustomer("concurrent"),sent=await ask(target.id);assert.equal(sent.status,200);const otp=deliveredCode(target.email);
 const results=await Promise.all([confirm(target.id,sent.body.challengeId,otp),confirm(target.id,sent.body.challengeId,otp)]);
 assert.deepEqual(results.map(r=>r.status).sort(),[200,400]);
 assert.equal(await prisma.systemAuditEvent.count({where:{targetId:target.id,action:"ACCOUNT_CREDENTIAL_CHANGED"}}),1);
 assert.equal((await prisma.user.findUniqueOrThrow({where:{id:target.id}})).authVersion,1);
});

test("self service requires current password plus OTP and renews session with new credential version",async()=>{
 const target=await makeCustomer("self");tokens.self=signUserToken(target);
 err(await call("post","/auth/change-password","self",{currentPassword:password,newPassword}),400,"VALIDATION_ERROR");
 err(await call("post","/auth/password-otp/request","self",{currentPassword:"Incorrect!2026"}),400,"CURRENT_PASSWORD_INVALID");
 const sent=await call("post","/auth/password-otp/request","self",{currentPassword:password});assert.equal(sent.status,200);const otp=deliveredCode(target.email);
 const changed=await call("post","/auth/change-password","self",{challengeId:sent.body.challengeId,otp,currentPassword:password,newPassword});assert.equal(changed.status,200,JSON.stringify(changed.body));assert.ok(changed.body.accessToken);
 err(await call("get","/auth/me","self"),401,"AUTH_INVALID");tokens.self=changed.body.accessToken;assert.equal((await call("get","/auth/me","self")).status,200);
});

test("role/activation changes revoke tokens permanently and invalidate outstanding OTP context",async()=>{
 const target=await makeCustomer("context");tokens.context=signUserToken(target);const sent=await ask(target.id);assert.equal(sent.status,200);
 assert.equal((await call("patch","/users/"+target.id+"/active","staff",{isActive:false})).status,200);
 err(await call("get","/auth/me","context"),401,"ACCOUNT_INACTIVE");
 assert.equal((await call("patch","/users/"+target.id+"/active","staff",{isActive:true})).status,200);
 err(await call("get","/auth/me","context"),401,"AUTH_INVALID");err(await confirm(target.id,sent.body.challengeId,deliveredCode(target.email)),409,"OTP_CONTEXT_CHANGED");
 const changed=await call("patch","/users/"+target.id+"/role","admin",{role:"LAB_STAFF"});assert.equal(changed.status,200);
 err(await call("get","/users/"+target.id,"staff"),404,"NOT_FOUND");
});

test("admin self-lockout blocked; soft delete retains account, bookings and audit history",async()=>{
 err(await call("patch","/users/"+users.admin.id+"/active","admin",{isActive:false}),409,"SELF_LOCKOUT_FORBIDDEN");
 err(await call("patch","/users/"+users.admin.id+"/role","admin",{role:"CUSTOMER"}),409,"SELF_LOCKOUT_FORBIDDEN");
 err(await call("delete","/users/"+users.admin.id,"admin",{reason:"Remove my account"}),409,"SELF_LOCKOUT_FORBIDDEN");
 const campus=await prisma.campus.create({data:{id:randomUUID(),code:"C-"+marker,name:"Security test"}});
 const building=await prisma.building.create({data:{id:randomUUID(),code:"B-"+marker,name:"Security test",campusId:campus.id}});
 const lab=await prisma.laboratory.create({data:{id:randomUUID(),code:"L-"+marker,name:"Security test",buildingId:building.id}});
 resource=await prisma.resource.create({data:{id:randomUUID(),code:"R-"+marker,name:"Security test room",category:"ROOM",subtype:"ROOM",location:"LAB",laboratoryId:lab.id}});
 const target=await makeCustomer("removed");tokens.removed=signUserToken(target);
 const start=new Date(Date.now()+86400000);booking=await prisma.booking.create({data:{id:randomUUID(),resourceId:resource.id,requestedById:target.id,title:"Retain booking",purpose:"History",startAt:start,endAt:new Date(start.getTime()+3600000),status:"CONFIRMED"}});
 err(await call("delete","/users/"+target.id,"staff",{reason:"Requested removal"}),409,"ACCOUNT_HAS_ACTIVE_BOOKINGS");
 await prisma.booking.update({where:{id:booking.id},data:{status:"COMPLETED"}});
 assert.equal((await call("delete","/users/"+target.id,"staff",{reason:"Requested removal"})).status,200);
 const saved=await prisma.user.findUniqueOrThrow({where:{id:target.id}});assert.ok(saved.deletedAt);assert.equal(saved.isActive,false);assert.equal(await prisma.booking.count({where:{requestedById:target.id}}),1);
 err(await call("get","/auth/me","removed"),401,"ACCOUNT_INACTIVE");
 err(await call("patch","/users/"+target.id+"/active","admin",{isActive:true}),409,"ACCOUNT_REMOVED");
 assert.equal(await prisma.systemAuditEvent.count({where:{targetId:target.id,action:"USER_REMOVED"}}),1);
});


test("credential update, challenge consumption and audit commit atomically",async()=>{
 const target=await makeCustomer("audit-rollback"),sent=await ask(target.id);assert.equal(sent.status,200);
 const otp=deliveredCode(target.email),tag=randomUUID().replaceAll("-","");
 const fn="security_audit_"+tag,tr="security_audit_"+tag;
 await prisma.$executeRawUnsafe('CREATE FUNCTION '+fn+'() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.target_id = '+"'"+target.id+"'"+' AND NEW.action = '+"'ACCOUNT_CREDENTIAL_CHANGED'"+' THEN RAISE EXCEPTION '+"'Isolated audit rejection'"+'; END IF; RETURN NEW; END $$');
 await prisma.$executeRawUnsafe('CREATE TRIGGER '+tr+' BEFORE INSERT ON system_audit_events FOR EACH ROW EXECUTE FUNCTION '+fn+'()');
 try {
  const failed=await confirm(target.id,sent.body.challengeId,otp);assert.equal(failed.status,500);
  const saved=await prisma.user.findUniqueOrThrow({where:{id:target.id}});assert.equal(saved.authVersion,0);assert.ok(await bcrypt.compare(password,saved.passwordHash));
  assert.equal((await prisma.passwordChallenge.findUniqueOrThrow({where:{id:sent.body.challengeId}})).consumedAt,null);
 } finally {
  await prisma.$executeRawUnsafe('DROP TRIGGER '+tr+' ON system_audit_events');await prisma.$executeRawUnsafe('DROP FUNCTION '+fn+'()');
 }
 assert.equal((await confirm(target.id,sent.body.challengeId,otp)).status,200);
});


test("removal and in-flight booking share account locks, never leave a deleted customer with an active booking",async()=>{
 const {createBookingWithTransaction}=await import('../src/services/bookingService.js');const {removeAccount}=await import('../src/services/accountManagementService.js');
 const actor=await prisma.user.findUniqueOrThrow({where:{id:users.staff.id}});
 for(let i=0;i<2;i++){
  const target=await makeCustomer('booking-race-'+i);const timing=new Date(Date.now()+86400000+(i+8)*3600000);
  const create=()=>prisma.$transaction(tx=>createBookingWithTransaction(tx,{requestedById:target.id,expectedAuthVersion:target.authVersion,resourceId:resource.id,title:'Race booking',purpose:'Contract',startAt:timing,endAt:new Date(timing.getTime()+3600000),contact:{fullName:'Race Customer',phone:'0901234567'}}));
  const remove=()=>removeAccount(actor,target.id,'Requested removal');
  const results=await Promise.allSettled(i?[create(),remove()]:[remove(),create()]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
  const saved=await prisma.user.findUniqueOrThrow({where:{id:target.id}}),active=await prisma.booking.count({where:{requestedById:target.id,status:'CONFIRMED'}});
  assert.ok(!(saved.deletedAt&&active));assert.ok(saved.deletedAt?active===0:active===1);
 }
});

test("open customer support blocks deactivation/removal; an old request cannot enter after removal",async()=>{
 const {createSupportService}=await import('../src/services/supportService.js');const service=createSupportService();
 const target=await makeCustomer('support-block');tokens.support=signUserToken(target);
 const lab=await prisma.laboratory.findUniqueOrThrow({where:{id:resource.laboratoryId}});
 await prisma.userLabAssignment.create({data:{userId:users.staff.id,laboratoryId:lab.id}});
 const session=await service.request(target,{requestId:randomUUID(),laboratoryId:lab.id,category:'ACCOUNT',message:'Account assistance'});
 assert.equal(session.status,'WAITING');
 err(await call('delete','/users/'+target.id,'staff',{reason:'Requested removal'}),409,'ACCOUNT_HAS_OPEN_SUPPORT');
 err(await call('patch','/users/'+target.id+'/active','staff',{isActive:false}),409,'ACCOUNT_HAS_OPEN_SUPPORT');
 await service.transition(target,session.id,'cancel','Customer requested cancellation');
 assert.equal((await call('delete','/users/'+target.id,'staff',{reason:'Requested removal'})).status,200);
 await assert.rejects(service.request(target,{requestId:randomUUID(),laboratoryId:lab.id,category:'ACCOUNT',message:'Stale request'}),{code:'ACCOUNT_INACTIVE'});
 assert.equal(await prisma.supportSession.count({where:{requesterId:target.id,status:'WAITING'}}),0);
});
