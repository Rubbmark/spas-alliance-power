'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const number=new Intl.NumberFormat('en-US'), today=()=>new Date().toISOString().slice(0,10);
let token=localStorage.getItem('spas.member')||'', data=null, selected='', action='',pendingKey='';
async function api(path,body,key=token){
 const res=await fetch(window.TRACKER_API+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+key,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 if(!res.headers.get('content-type')?.includes('application/json'))throw Error('The shared database is unavailable. Please contact your alliance leader.');
 const result=await res.json(); if(!res.ok)throw Error(result.error||'Request failed.');return result;
}
const fmt=n=>number.format(n);
function chart(logs){
 if(!logs.length)return '<p>Your first weekly entry will appear here.</p>';
 const points=logs.map(l=>[Date.parse(l.week),l.power]),ys=points.map(p=>p[1]),min=Math.min(...ys),max=Math.max(...ys),first=points[0][0],last=points.at(-1)[0];
 const coords=points.map(([x,y])=>[last===first?260:8+(x-first)/(last-first)*504,max===min?64:108-(y-min)/(max-min)*87]);
 const line=coords.map(p=>p.join(',')).join(' ');
 return '<svg class="chart" role="img" aria-label="Weekly total hero power trend" viewBox="0 0 520 126" preserveAspectRatio="none"><path d="M0 20H520 M0 64H520 M0 108H520" stroke="#74907d" opacity=".35" stroke-dasharray="4 5"/><polyline points="'+line+'" fill="none" stroke="#d4ec89" stroke-width="3" vector-effect="non-scaling-stroke"/>'+coords.map(([x,y],i)=>'<circle cx="'+x+'" cy="'+y+'" r="4" fill="#d4ec89"><title>'+logs[i].week+' · '+fmt(logs[i].power)+'</title></circle>').join('')+'</svg><div class="axis"><span>'+logs[0].week+'</span><span>'+(logs.length>1?logs.at(-1).week:'')+'</span></div>';
}
const button=(cmd,title,primary=false)=>'<button data-action="'+cmd+'" class="'+(primary?'primary':'')+'">'+title+'</button>';
function landing(){
 $('session').hidden=true;
 const example=[52,53,55,54,57,59].map((n,i)=>({week:new Date(Date.UTC(2026,9,5+7*i)).toISOString().slice(0,10),power:n*1e6}));
 $('app').innerHTML='<div class="cards"><section class="panel dark"><small>WEEKLY THP · EXAMPLE</small><div class="power">59,000,000</div>'+chart(example)+'</section><section class="panel"><h2>Member check-in</h2><p>Join with your alliance code to start a power history under your in-game name.</p><div class="controls">'+button('join','Join alliance',true)+button('login','Member sign-in')+'</div></section></div>';
}
function dashboard(){
 if(!selected||!data.roster.some(m=>m.id===selected))selected=data.me;
 const me=data.roster.find(x=>x.id===data.me), member=data.roster.find(x=>x.id===selected),logs=data.entries.filter(x=>x.member===selected),latest=logs.at(-1);
 const options=data.roster.map(m=>'<option value="'+esc(m.id)+'" '+(m.id===selected?'selected':'')+'>'+esc(m.name)+'</option>').join('');
 const history=[...logs].reverse().map(l=>'<tr><td>'+l.week+'</td><td>'+fmt(l.power)+'</td></tr>').join('');
 const roster=data.roster.map(m=>{const p=data.entries.filter(e=>e.member===m.id).at(-1);return '<tr><td><button class="link" data-member="'+esc(m.id)+'">'+esc(m.name)+'</button></td><td>'+esc(m.profession)+'</td><td>'+esc(m.rank)+'</td><td>'+esc(m.role||'—')+'</td><td>'+ (p?fmt(p.power):'—')+'</td></tr>'}).join('');
 $('session').hidden=false;
 $('app').innerHTML='<div class="cards"><section class="panel dark"><div class="row"><small>POWER HISTORY</small><select id="player" aria-label="Select member" style="color:#172c22">'+options+'</select></div><div class="power">'+(latest?fmt(latest.power):'—')+'</div><small>LATEST THP</small>'+chart(logs)+'</section><section class="panel"><h2>'+esc(me.name)+'</h2><p>'+esc([me.profession,me.rank,me.role].filter(Boolean).join(' · '))+'</p><div class="controls">'+button('entry','Log weekly THP',true)+button('profile','Edit profile')+'</div><details><summary>My personal access key</summary><p>Keep this key private. Use it to sign in on another device.</p><code>'+esc(token)+'</code></details></section></div><section class="panel"><h2>Alliance register</h2><div class="scroll"><table><thead><tr><th>MEMBER</th><th>PROFESSION</th><th>RANK</th><th>ROLE</th><th>LATEST THP</th></tr></thead><tbody>'+roster+'</tbody></table></div></section><section class="panel"><h2>Weekly entries · '+esc(member.name)+'</h2>'+(history?'<table><thead><tr><th>WEEK STARTING</th><th>TOTAL HERO POWER</th></tr></thead><tbody>'+history+'</tbody></table>':'<p>No entries yet.</p>')+'</section>';
 $('player').onchange=e=>{selected=e.target.value;dashboard()};
}
const input=(label,name,value='',extra='')=>'<label>'+label+'<input name="'+name+'" value="'+esc(value)+'" '+extra+'></label>';
const select=(label,name,values,current)=>'<label>'+label+'<select name="'+name+'">'+values.map(v=>'<option '+(v===current?'selected':'')+'>'+v+'</option>').join('')+'</select></label>';
function openForm(cmd){
 const m=data?.roster.find(m=>m.id===data.me)||{};
 action=cmd;$('formerr').textContent='';$('submit').disabled=false;
 let fields='',title='';
 if(cmd==='join'||cmd==='profile'){
 title=cmd==='join'?'Join alliance':'Edit profile';
 if(cmd==='join')fields=input('Alliance join code','code','','required autocomplete="off"');
 fields+=input('In-game name','name',m.name,'required maxlength="48"')+select('Profession','profession',['Engineer','War Leader','Undecided'],m.profession)+select('Alliance rank','rank',['R1','R2','R3','R4','R5'],m.rank)+input('Alliance role (optional)','role',m.role,'maxlength="64" placeholder="e.g. Desert Storm coordinator"');
 }else if(cmd==='login'){title='Member sign-in';fields=input('Personal access key','key','','required type="password" autocomplete="current-password"');}
 else {title='Log weekly THP';fields=input('Reporting date (UTC)','date',today(),'required type="date" max="'+today()+'"')+input('Total hero power','power','','required type="number" min="1" step="1" placeholder="e.g. 55000000"')+'<p class="subtle" id="weeknote">Weeks begin on Monday. Submitting again updates that week.</p>';}
 $('formtitle').textContent=title;$('fields').innerHTML=fields;$('submit').textContent=cmd==='login'?'Sign in':cmd==='join'?'Register member':'Save';
 if(cmd==='entry'){const date=$('form').elements.date;const prefill=()=>{const d=new Date(date.value+'T00:00:00Z');if(isNaN(+d))return;d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);const old=data.entries.find(x=>x.member===data.me&&x.week===d.toISOString().slice(0,10));$('form').elements.power.value=old?.power??'';$('weeknote').textContent=old?'Editing the saved entry for the week of '+old.week+'.':'This entry will cover the week beginning '+d.toISOString().slice(0,10)+'.';};date.onchange=prefill;prefill();}
 $('dialog').showModal();
}
$('app').onclick=e=>{const b=e.target.closest('button');if(b?.dataset.action)openForm(b.dataset.action);if(b?.dataset.member){selected=b.dataset.member;dashboard();$('app').scrollIntoView({behavior:'smooth'})}};
$('close').onclick=()=>$('dialog').close();
$('session').onclick=()=>{if(!confirm('Sign out on this device? Save your personal access key first so you can sign in again.'))return;localStorage.removeItem('spas.member');token='';selected='';data=null;$('notice').textContent='';landing()};
$('form').onsubmit=async e=>{
 e.preventDefault();$('submit').disabled=true;$('formerr').textContent='';
 const b=Object.fromEntries(new FormData(e.target));
 try{
 if(action==='join'){
 pendingKey=pendingKey||Array.from(crypto.getRandomValues(new Uint8Array(32)),v=>v.toString(16).padStart(2,'0')).join('');
 await api('/join',b,pendingKey);token=pendingKey;pendingKey='';localStorage.setItem('spas.member',token);
 }else if(action==='login'){
 const candidate=b.key.trim();data=await api('/tracker',null,candidate);token=candidate;localStorage.setItem('spas.member',token);
 }else await api('/'+action,b);
 if(action!=='login')data=await api('/tracker');
 $('dialog').close();dashboard();$('notice').textContent=action==='join'?'Registered. Save your personal access key for use on another device.':'Saved.';
 if(action==='join')document.querySelector('details').open=true;
 }catch(err){$('formerr').textContent=err.message;}finally{$('submit').disabled=false}
};
landing();
if(token)api('/tracker').then(result=>{data=result;dashboard()}).catch(err=>{$('notice').textContent=err.message});
