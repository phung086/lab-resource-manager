import assert from "node:assert/strict";
import fs from "node:fs";
const base = "http://127.0.0.1:15005/api";
const rows = [];
for (const [name, role] of [["admin","ADMIN"],["staff","LAB_STAFF"],["lecturer","LECTURER"],["student","STUDENT"]]) {
  const response = await fetch(base + "/auth/login", { method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:`${name}@lrm.local`,password:"LabDemo!2026Pass"}) });
  assert.equal(response.status,200);
  const data = await response.json();
  assert.equal(data.user.role,role);
  const resources = await (await fetch(base + "/resources",{headers:{Authorization:`Bearer ${data.accessToken}`}})).json();
  assert.equal(resources.length,11);
  assert.equal(new Set(resources.map(r=>r.category)).size,5);
  rows.push({email:data.user.email,role,resourceCount:resources.length,categories:[...new Set(resources.map(r=>r.category))]});
}
fs.writeFileSync("screenshots_temp_productization_review/local_demo_accounts.json",JSON.stringify({launcher:"npm run demo:local (alternate ports 15005/15180)",accounts:rows},null,2));
console.log("All four local demo credentials/roles and five resource categories verified through launcher API");
