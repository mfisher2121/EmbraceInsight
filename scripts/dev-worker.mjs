import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { webcrypto } from 'node:crypto';
import { localDatabase } from './local-db.mjs';
globalThis.crypto ||= webcrypto;
const root=path.resolve(import.meta.dirname,'..');
const worker=(await import(pathToFileURL(path.join(root,'dist/server/index.js')).href)).default;
const database=localDatabase(path.resolve(root,'../../work/email-capture-preview.sqlite'));
await database.migrate();
const origin='http://127.0.0.1:4173';
http.createServer(async(incoming,outgoing)=>{
  try {
    const url=new URL(incoming.url,origin);
    if(url.pathname==='/__dev/owner'){
      outgoing.writeHead(302,{'set-cookie':'mbrace_preview_owner=1; Path=/; HttpOnly; SameSite=Lax','location':'/admin'});outgoing.end();return;
    }
    const chunks=[];for await(const chunk of incoming)chunks.push(chunk);
    const headers=new Headers(incoming.headers);
    if(incoming.headers.cookie?.includes('mbrace_preview_owner=1')){headers.set('oai-authenticated-user-email','owner@preview.invalid');headers.set('oai-authenticated-user-id','local-preview-owner');}
    const request=new Request(url,{method:incoming.method,headers,...(!['GET','HEAD'].includes(incoming.method)?{body:Buffer.concat(chunks)}:{})});
    const response=await worker.fetch(request,{DB:database,ADMIN_EMAIL:'owner@preview.invalid',SITE_ORIGIN:origin},{});
    outgoing.writeHead(response.status,Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {outgoing.writeHead(500);outgoing.end('Preview request failed.');}
}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
