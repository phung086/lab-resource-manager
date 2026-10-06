import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const report={root,branch:git('branch','--show-current'),head:git('rev-parse','--short','HEAD'),dirtyEntries:git('status','--short').split('\n').filter(Boolean).length,node:process.version,files:{},runtime:{}};
for(const f of ['CLAUDE.md','.claude/settings.local.json','.claude/launch.json','.claude/skills/lab-product-redesign/SKILL.md','.claude/skills/lab-preflight/SKILL.md','frontend/node_modules/vite/bin/vite.js'])report.files[f]=existsSync(path.join(root,f));
for(const f of ['.claude/settings.local.json','.claude/launch.json']){if(report.files[f])JSON.parse(readFileSync(path.join(root,f),'utf8').replace(/^\uFEFF/,''));}
for(const [name,url] of Object.entries({ui:'http://localhost:5173',api:'http://localhost:8000/health/ready'})){try{const r=await fetch(url,{signal:AbortSignal.timeout(5000)});report.runtime[name]={status:r.status,...(name==='api'?{readiness:await r.json()}:{})};}catch{report.runtime[name]={available:false};}}
console.log(JSON.stringify(report,null,2));
if(!Object.values(report.files).every(Boolean)||Object.values(report.runtime).some(r=>r.status!==200))process.exitCode=1;
