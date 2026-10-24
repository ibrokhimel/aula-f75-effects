/** Optional loopback bridge for explicit integrations. No listener is opened
 * unless the host opts in with a token. Application code can also push directly. */
import { createServer, type Server } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import type { HostEventBus, SourceRegistration } from '../../packages/engine/src';

export interface EventServerOptions {token:string;port?:number;log?:(message:string)=>void}
export function startEffectEventServer(bus:HostEventBus,options:EventServerOptions):Server {
  if(options.token.length<24)throw new Error('The local event token must contain at least 24 characters');
  const secret=Buffer.from(`Bearer ${options.token}`);
  const server=createServer((req,res)=>{
    const reply=(code:number,value:unknown)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
    const auth=Buffer.from(req.headers.authorization??'');
    if(req.headers.origin||auth.length!==secret.length||!timingSafeEqual(auth,secret)){reply(403,{error:'Forbidden'});return;}
    if(req.method==='GET'&&req.url==='/clock'){reply(200,{version:1,now:performance.now()});return;}
    if(req.method!=='POST'||!['/sources','/events','/application-rules','/shortcut-guides'].includes(req.url??'')){reply(404,{error:'Unknown route'});return;}
    let text='',tooLarge=false;
    req.on('data',(chunk:Buffer)=>{if(tooLarge)return;text+=chunk.toString('utf8');if(Buffer.byteLength(text)>16384){tooLarge=true;reply(413,{error:'Payload too large'});req.resume();}});
    req.on('end',()=>{if(tooLarge)return;try{
      const value=JSON.parse(text) as Record<string,unknown>;
      if(req.url==='/sources'){
        const accepted=Array.isArray(value.types)&&bus.register(value as unknown as SourceRegistration);reply(accepted?200:400,{accepted});
      }else if(req.url==='/events'){
        const accepted=bus.push(value);reply(accepted?200:400,{accepted});
      }else if(req.url==='/application-rules'){
        if(!value||Array.isArray(value)||Object.values(value).some(v=>typeof v!=='string')){reply(400,{error:'Expected process-to-scene map'});return;}bus.setApplicationRules(value as Record<string,string>);reply(200,{accepted:true});
      }else {
        if(!Array.isArray(value)){reply(400,{error:'Expected shortcut guide array'});return;}bus.setShortcutGuides(value);reply(200,{accepted:true});
      }
    }catch{reply(400,{error:'Invalid JSON or event schema'});}});
  });
  server.requestTimeout=5000;server.headersTimeout=5000;server.maxConnections=8;
  server.on('error',error=>options.log?.(`Local effects event bridge: ${error.message}`));
  server.listen(options.port??9735,'127.0.0.1',()=>options.log?.(`Local effects event bridge: http://127.0.0.1:${(server.address() as {port:number}).port}`));
  return server;
}
