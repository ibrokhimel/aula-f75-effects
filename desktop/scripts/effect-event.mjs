#!/usr/bin/env node
/** Send explicit events, or wrap a real build/test command. Token stays in env. */
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
const token=process.env.KEYBOARD_EFFECTS_EVENT_TOKEN;
if(!token)throw new Error('Set KEYBOARD_EFFECTS_EVENT_TOKEN to the same token as the desktop app');
const base=`http://127.0.0.1:${process.env.KEYBOARD_EFFECTS_EVENT_PORT??9735}`;
async function request(path,data){const response=await fetch(base+path,{method:data===undefined?'GET':'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(JSON.stringify(result));return result;}
const [mode,...args]=process.argv.slice(2),source='command-line';
const allowed=['build','test','download','mute','timer','battery','application','shortcut','notification','resource','canvas'];
await request('/sources',{id:source,types:allowed,ttlMs:60000});
async function event(type,data){const {now}=await request('/clock');await request('/events',{version:1,id:randomUUID(),source,at:now,type,data});}
if(mode==='build'||mode==='test'){
  const separator=args.indexOf('--'),command=separator>=0?args.slice(separator+1):args;
  if(!command.length)throw new Error(`Usage: node desktop/scripts/effect-event.mjs ${mode} -- executable args`);
  const runId=randomUUID(),group=process.env.KEYBOARD_EFFECTS_TEST_GROUP??'default';
  await event(mode,{runId,group,progress:0,result:'running'});
  // shell is deliberately disabled; pass a real executable such as node.exe.
  const child=spawn(command[0],command.slice(1),{stdio:'inherit',shell:false,windowsHide:true});
  const code=await new Promise(resolve=>{child.once('error',()=>resolve(1));child.once('exit',code=>resolve(code??1));});
  await event(mode,{runId,group,progress:1,result:code===0?'success':'failure'});process.exitCode=code;
}else if(mode==='download'){
  const url=args[0];if(!url)throw new Error('Usage: effect-event.mjs download https://example/file');
  const response=await fetch(url);if(!response.ok||!response.body)throw new Error(`Download failed: ${response.status}`);
  const transferId=randomUUID(),total=Number(response.headers.get('content-length'))||0;let completed=0,last=0;
  for await(const chunk of response.body){completed+=chunk.length;if(performance.now()-last>100){await event('download',{transferId,completed,total});last=performance.now();}}
  await event('download',{transferId,completed,total:total||completed});
  console.log(`Received ${completed} bytes (discarded; use this adapter around your downloader to save them)`);
}else if(allowed.includes(mode))await event(mode,JSON.parse(args.join(' ')));
else throw new Error('Choose build, test, download, or an event type followed by a JSON payload');
