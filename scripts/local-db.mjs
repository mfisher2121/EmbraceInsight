import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
export function localDatabase(filename){
  const invoke=payload=>new Promise((resolve,reject)=>{
    const child=execFile('python3',[path.join(root,'scripts/sqlite-bridge.py'),filename],{maxBuffer:8*1024*1024},(error,stdout)=>{if(error){reject(new Error('Local database operation failed.'));return;}try{resolve(JSON.parse(stdout));}catch{reject(new Error('Local database returned an invalid response.'));}});
    child.stdin.end(JSON.stringify(payload));
  });
  class Statement{
    constructor(sql,params=[]){this.sql=sql;this.params=params;}
    bind(...params){return new Statement(this.sql,params);}
    async first(){return (await invoke({statements:[{sql:this.sql,params:this.params,mode:'first'}]}))[0];}
    async all(){return (await invoke({statements:[{sql:this.sql,params:this.params,mode:'all'}]}))[0];}
    async run(){return (await invoke({statements:[{sql:this.sql,params:this.params,mode:'run'}]}))[0];}
  }
  return {
    prepare:sql=>new Statement(sql),
    batch:statements=>invoke({statements:statements.map(s=>({sql:s.sql,params:s.params,mode:'run'}))}),
    async migrate(){const migrations=[];for(const name of (await fs.readdir(path.join(root,'drizzle'))).filter(x=>x.endsWith('.sql')).sort()){migrations.push({name,sql:await fs.readFile(path.join(root,'drizzle',name),'utf8')});}await invoke({migrations});}
  };
}
