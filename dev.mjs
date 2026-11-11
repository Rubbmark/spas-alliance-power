// Local development server using the same API handler as the hosted Worker.
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import worker from './api/worker.mjs';
const db=new DatabaseSync(process.env.LOCAL_DATABASE||'local.sqlite');
db.exec(readFileSync(new URL('./api/schema.sql',import.meta.url),'utf8'));
const DB={prepare(sql){const stmt=db.prepare(sql);const query=(args)=>({run:()=>stmt.run(...args),first:()=>stmt.get(...args),all:()=>({results:stmt.all(...args)})});return {...query([]),bind:(...args)=>query(args)}}};
const port=Number(process.env.PORT||8787), origin='http://localhost:'+port;
const joinCode=process.env.JOIN_CODE;if(!joinCode)throw Error('Set JOIN_CODE for local registration.');
http.createServer(async(req,res)=>{
 const url=new URL(req.url,origin);
 const files={'/':'index.html','/app.js':'app.js','/config.js':'config.js','/style.css':'style.css'};
 if(Object.hasOwn(files,url.pathname)){const file=files[url.pathname];res.setHeader('Content-Type',file.endsWith('js')?'application/javascript':file.endsWith('css')?'text/css':'text/html');res.end(readFileSync(new URL('./docs/'+file,import.meta.url)));return;}
 const chunks=[];for await(const chunk of req)chunks.push(chunk);
 const response=await worker.fetch(new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?Buffer.concat(chunks):undefined}),{DB,JOIN_CODE:joinCode,SITE_ORIGIN:origin});
 res.writeHead(response.status,Object.fromEntries(response.headers));res.end(await response.text());
}).listen(port,'127.0.0.1',()=>console.log('Tracker at '+origin));
