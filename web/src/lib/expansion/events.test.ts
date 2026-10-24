import {describe,it,expect} from 'vitest';
import {once} from 'node:events';
import {HostEventBus} from '../../../../packages/engine/src';
import {startEffectEventServer} from '../../../../desktop/src/effect-events';
it('local integration endpoint authenticates and feeds validated engine events',async()=>{
 const bus=new HostEventBus(()=>performance.now()),token='test-only-ephemeral-token-123456789';
 const server=startEffectEventServer(bus,{token,port:0});await once(server,'listening');
 const base=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
 const post=(path:string,data:unknown,auth=token)=>fetch(base+path,{method:'POST',headers:{authorization:`Bearer ${auth}`,'content-type':'application/json'},body:JSON.stringify(data)});
 try{
  expect((await post('/sources',{id:'build',types:['build']},'incorrect')).status).toBe(403);
  expect((await post('/sources',{id:'build',types:['build']})).status).toBe(200);
  const clock=await(await fetch(base+'/clock',{headers:{authorization:`Bearer ${token}`}})).json();
  const event={version:1,id:'1',source:'build',at:clock.now,type:'build',data:{runId:'fixture',progress:.4,result:'running'}};
  expect((await post('/events',event)).status).toBe(200);expect(bus.latest('build')?.data.progress).toBe(.4);
  expect((await post('/events',event)).status).toBe(400);
  expect((await post('/events',{...event,id:'2',data:{runId:'x',progress:5}})).status).toBe(400);
  const crossOrigin=await fetch(base+'/clock',{headers:{authorization:`Bearer ${token}`,origin:'https://example.org'}});expect(crossOrigin.status).toBe(403);
 }finally{await new Promise<void>(resolve=>server.close(()=>resolve()));}
});
