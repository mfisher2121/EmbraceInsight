import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
const root=path.resolve(import.meta.dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.xml':'application/xml; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf','.jpg':'image/jpeg','.png':'image/png'};
const assets={};
const styleVersion=createHash('sha256').update(await fs.readFile(path.join(root,'public/styles.css'))).digest('hex').slice(0,10);
const scriptVersion=createHash('sha256').update(await fs.readFile(path.join(root,'public/capture.js'))).digest('hex').slice(0,10);
async function walk(directory){
  for(const entry of await fs.readdir(directory,{withFileTypes:true})){
    if(entry.name.startsWith('.'))continue;
    const file=path.join(directory,entry.name);
    if(entry.isDirectory()){await walk(file);continue;}
    let route='/'+path.relative(path.join(root,'public'),file).split(path.sep).join('/');
    if(route.endsWith('/index.html'))route=route.slice(0,-10);
    let body=await fs.readFile(file);
    if(path.extname(file)==='.html')body=Buffer.from(body.toString().replaceAll('href="/styles.css"',`href="/styles.css?v=${styleVersion}"`).replaceAll('src="/capture.js"',`src="/capture.js?v=${scriptVersion}"`));
    assets[route]={type:types[path.extname(file)]||'application/octet-stream',body:body.toString('base64')};
  }
}
await walk(path.join(root,'public'));
const downloads={};
for(const entry of JSON.parse(await fs.readFile(path.join(root,'content/resources.json'),'utf8'))){downloads[entry.id]={title:entry.title,body:await fs.readFile(path.join(root,'assets-downloads',entry.id+'.md'),'utf8')};}
const worker=await fs.readFile(path.join(root,'worker/index.js'),'utf8');
await fs.mkdir(path.join(root,'dist/server'),{recursive:true});
await fs.mkdir(path.join(root,'dist/.openai'),{recursive:true});
await fs.writeFile(path.join(root,'dist/server/index.js'),`const __SITE_ASSETS__=${JSON.stringify(assets)};\nconst __DOWNLOAD_ASSETS__=${JSON.stringify(downloads)};\n${worker}`);
await fs.copyFile(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
console.log(`Built Worker with ${Object.keys(assets).length} public routes and ${Object.keys(downloads).length} protected resources.`);
