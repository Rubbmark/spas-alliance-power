const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');
function profile(b){
 const name=String(b.name??'').trim(), role=String(b.role??'').trim();
 if(!name||name.length>48||role.length>64||!['Engineer','War Leader','Undecided'].includes(b.profession)||!/^R[1-5]$/.test(b.rank))fail('Check your name, profession and alliance rank.');
 return [name,b.profession,b.rank,role];
}
export default {async fetch(request,env){
 const origin=request.headers.get('Origin'), headers={'Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Origin':env.SITE_ORIGIN,'Access-Control-Allow-Headers':'Authorization, Content-Type','Access-Control-Allow-Methods':'GET, POST, OPTIONS'};
 const json=(body,status=200)=>Response.json(body,{status,headers});
 try{
 if(origin && origin!==env.SITE_ORIGIN)fail('Unrecognized website.',403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 const path=new URL(request.url).pathname, db=env.DB;
 const key=(request.headers.get('Authorization')||'').replace(/^Bearer /,'');
 if(!/^[a-f0-9]{64}$/.test(key))fail('Enter your personal access key.',401);
 const keyHash=await hash(key);
 const b=request.method==='POST'?await request.json().catch(()=>fail('Invalid form data.')):{};
 if(request.method==='POST' && path==='/join'){
 if(!env.JOIN_CODE||b.code?.trim()!==env.JOIN_CODE)fail('The alliance join code is incorrect.',403);
 await db.prepare('INSERT INTO members(id,key_hash,name,profession,rank,role) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(),keyHash,...profile(b)).run();
 return json({ok:true});
 }
 const member=await db.prepare('SELECT id FROM members WHERE key_hash=?').bind(keyHash).first();
 if(!member)fail('Personal access key not recognized.',401);
 if(request.method==='GET' && path==='/tracker'){
 const roster=await db.prepare('SELECT id,name,profession,rank,role FROM members ORDER BY name COLLATE NOCASE').all();
 const entries=await db.prepare('SELECT member,week,power FROM entries ORDER BY week').all();
 return json({me:member.id,roster:roster.results,entries:entries.results});
 }
 if(request.method==='POST' && path==='/profile'){
 await db.prepare('UPDATE members SET name=?,profession=?,rank=?,role=? WHERE id=?').bind(...profile(b),member.id).run();return json({ok:true});
 }
 if(request.method==='POST' && path==='/entry'){
 const d=new Date(b.date+'T00:00:00Z'),power=Number(b.power);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(+d)||d.toISOString().slice(0,10)!==b.date||+d>Date.now()||!Number.isSafeInteger(power)||power<=0)fail('Enter a valid date and a positive whole-number THP.');
 d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);
 await db.prepare('INSERT INTO entries VALUES(?,?,?) ON CONFLICT(member,week) DO UPDATE SET power=excluded.power').bind(member.id,d.toISOString().slice(0,10),power).run();
 return json({ok:true});
 }
 return json({error:'Unknown request.'},404);
 }catch(e){if(/UNIQUE constraint failed/i.test(e.message))return json({error:'That name or member key is already registered.'},409);return json({error:e.status?e.message:'Could not complete the request. Try again.'},e.status||500)}
}};
