import type { AnimationCore } from '../animations/core';
import { clamp01, type Frame } from '../colors';
import { bell, color, fieldFrame, hash, mod } from './math';

export interface EventPayloads {
  build:{runId:string;progress:number;stage?:string;result?:'running'|'success'|'failure'};
  test:{runId:string;group:string;progress:number;result:'running'|'success'|'failure'};
  download:{transferId:string;completed:number;total:number};
  mute:{state:'muted'|'unmuted'|'unavailable'};
  timer:{timerId:string;phase:'work'|'break'|'complete';remaining:number;duration:number;paused:boolean};
  battery:{percent:number;charging:boolean};
  application:{process:string};
  shortcut:{process:string;keys:string[];mods:number;token:string};
  notification:{notificationId:string;state:'unread'|'acknowledged'|'expired';severity?:'info'|'warning'|'error'};
  resource:{cpu:number;memory:number};
  canvas:{overlay:'pulse'|'ripple'|'bar'|'keys';value:number;hue:number;keys?:string[]};
}
export type HostEventType=keyof EventPayloads;
export type HostEvent<K extends HostEventType=HostEventType>={version:1;id:string;source:string;at:number;type:K;data:EventPayloads[K]};
export type AnyHostEvent={[K in HostEventType]:HostEvent<K>}[HostEventType];
export interface SourceRegistration {id:string;types:readonly HostEventType[];ttlMs?:number}
export interface ShortcutGuide {process:string;mods:number;keys:readonly string[]}
const types:HostEventType[]=['build','test','download','mute','timer','battery','application','shortcut','notification','resource','canvas'];
const string=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128;
const number=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const ratio=(v:unknown)=>number(v)&&v>=0&&v<=1;
const one=(v:unknown,values:unknown[])=>values.includes(v);
const keys=(v:unknown)=>Array.isArray(v)&&v.length<=128&&v.every(string);
function validData(type:HostEventType,d:Record<string,unknown>):boolean {
  switch(type){
    case 'build':return string(d.runId)&&ratio(d.progress)&&(d.stage===undefined||string(d.stage))&&(d.result===undefined||one(d.result,['running','success','failure']));
    case 'test':return string(d.runId)&&string(d.group)&&ratio(d.progress)&&one(d.result,['running','success','failure']);
    case 'download':return string(d.transferId)&&number(d.completed)&&d.completed>=0&&number(d.total)&&d.total>=0&&(!d.total||d.completed<=d.total);
    case 'mute':return one(d.state,['muted','unmuted','unavailable']);
    case 'timer':return string(d.timerId)&&one(d.phase,['work','break','complete'])&&number(d.remaining)&&d.remaining>=0&&number(d.duration)&&d.duration>0&&d.remaining<=d.duration&&typeof d.paused==='boolean';
    case 'battery':return number(d.percent)&&d.percent>=0&&d.percent<=100&&typeof d.charging==='boolean';
    case 'application':return string(d.process);
    case 'shortcut':return string(d.process)&&keys(d.keys)&&number(d.mods)&&Number.isInteger(d.mods)&&d.mods>=0&&d.mods<=15&&string(d.token);
    case 'notification':return string(d.notificationId)&&one(d.state,['unread','acknowledged','expired'])&&(d.severity===undefined||one(d.severity,['info','warning','error']));
    case 'resource':return number(d.cpu)&&d.cpu>=0&&d.cpu<=100&&number(d.memory)&&d.memory>=0&&d.memory<=100;
    case 'canvas':return one(d.overlay,['pulse','ripple','bar','keys'])&&ratio(d.value)&&ratio(d.hue)&&(d.keys===undefined||keys(d.keys));
  }
}
/** Engine clock milliseconds, never wall-clock seconds. Sources are explicit;
 * unregistered types, duplicates, future events, and stale data are rejected. */
export class HostEventBus {
  private sources=new Map<string,SourceRegistration>();
  private queue:AnyHostEvent[]=[];
  private seen=new Map<string,number>();
  private rules:Readonly<Record<string,string>>={};
  private guides:readonly ShortcutGuide[]=[];
  private applicationSnapshot:{process:string;previous:string|null;changedAt:number;at:number;source:string}|null=null;
  manualScene:string|null=null;
  constructor(private nowMs:()=>number=()=>Date.now()){}
  setClock(nowMs:()=>number){this.nowMs=nowMs;this.clear();}
  register(source:SourceRegistration):boolean{
    if(!string(source.id)||!source.types.length||source.types.some(t=>!types.includes(t))||!this.sources.has(source.id)&&this.sources.size>=16)return false;
    this.sources.set(source.id,{id:source.id,types:[...new Set(source.types)],ttlMs:Math.max(250,Math.min(300000,Number.isFinite(source.ttlMs)?source.ttlMs!:60000))});return true;
  }
  unregister(id:string){this.sources.delete(id);this.queue=this.queue.filter(e=>e.source!==id);if(this.applicationSnapshot?.source===id)this.applicationSnapshot=null;}
  clear(){this.queue=[];this.seen.clear();this.applicationSnapshot=null;}
  push(input:unknown):boolean{
    if(!input||typeof input!=='object')return false;const e=input as AnyHostEvent,s=this.sources.get(e.source),now=this.nowMs();
    if(e.version!==1||!string(e.id)||!s||!s.types.includes(e.type)||!number(e.at)||e.at>now+250||now-e.at>s.ttlMs!||!e.data||typeof e.data!=='object'||!validData(e.type,e.data as unknown as Record<string,unknown>))return false;
    this.prune(now);const key=`${e.source}:${e.id}`;if(this.seen.has(key))return false;
    // JSON copy prevents callers from mutating a validated event after enqueue.
    this.queue.push(JSON.parse(JSON.stringify(e)) as AnyHostEvent);this.seen.set(key,now);
    if(e.type==='application'){
      const previous=this.applicationSnapshot;
      this.applicationSnapshot={process:e.data.process,previous:previous?.process===e.data.process?previous.previous:previous?.process??null,changedAt:previous?.process===e.data.process?previous.changedAt:e.at,at:e.at,source:e.source};
    }
    if(this.queue.length>128)this.queue.shift();if(this.seen.size>1024)this.seen.delete(this.seen.keys().next().value!);return true;
  }
  private prune(now=this.nowMs()){this.queue=this.queue.filter(e=>now-e.at<=(this.sources.get(e.source)?.ttlMs??0));for(const[k,at]of this.seen)if(now-at>300000)this.seen.delete(k);}
  events<K extends HostEventType>(type:K,maxAge=60000):HostEvent<K>[] {this.prune();const now=this.nowMs();return this.queue.filter(e=>e.type===type&&now-e.at<=maxAge) as HostEvent<K>[];}
  latest<K extends HostEventType>(type:K,maxAge=60000):HostEvent<K>|undefined{return this.events(type,maxAge).at(-1);}
  age(e:HostEvent){return Math.max(0,(this.nowMs()-e.at)/1000);}
  setApplicationRules(rules:Readonly<Record<string,string>>){this.rules=Object.fromEntries(Object.entries(rules).filter(([k,v])=>string(k)&&string(v)).slice(0,64));}
  sceneFor(process:string){return this.manualScene??(Object.hasOwn(this.rules,process)?this.rules[process]:null);}
  setShortcutGuides(guides:readonly ShortcutGuide[]){this.guides=guides.filter(g=>g&&string(g.process)&&keys(g.keys)&&number(g.mods)&&Number.isInteger(g.mods)&&g.mods>=0&&g.mods<=15).slice(0,64).map(g=>({...g,keys:[...g.keys]}));}
  guideFor(process:string,mods:number){return this.guides.find(g=>g.process===process&&g.mods===mods)?.keys??[];}
  get sourceCount(){return this.sources.size;}
  get size(){this.prune();return this.queue.length;}
  get application(){return this.applicationSnapshot&&this.nowMs()-this.applicationSnapshot.at<Math.min(10000,this.sources.get(this.applicationSnapshot.source)?.ttlMs??0)?{...this.applicationSnapshot}:null;}
  get now(){return this.nowMs();}
}
export function createHostRenderer(core:AnimationCore,bus:HostEventBus){
  const w=core.BOARD_W,h=Math.max(1,core.BOARD_H-1);
  return function render(n:number,t:number,a:number,b:number,seed:number):Frame{
    return fieldFrame(core,(x,y,i)=>{const u=x/w,v=y/h;let value=0,hue=.55;
      switch(n){
        case 130:{const e=bus.latest('shortcut',a*1000);if(e){let d=Infinity;for(const key of e.data.keys){const id=core.LED_FOR_CODE.get(key),p=id===undefined?null:core.LED_GEO.get(id);if(p)d=Math.min(d,Math.hypot(x-p.ux,y-p.uy));}value=bell(d-bus.age(e)*b,b*.2)*Math.exp(-bus.age(e)/a);hue=.32;}break;}
        case 169:{const e=bus.latest('build');if(e){const result=e.data.result??'running',p=e.data.progress,age=bus.age(e);if(result==='running')value=u<=p?.25+.5*bell(u-p,.08):.015;else if(age<a)value=(1-age/a)*.7;hue=result==='failure'?.0:result==='success'?.32:.56;if(result==='running')value+=bell(mod(t/b)-u,.07)*.3;}break;}
        case 170:{const map=new Map<string,HostEvent<'test'>>();for(const e of bus.events('test'))map.set(`${e.data.runId}:${e.data.group}`,e);const groups=[...map.values()].slice(-Math.round(b)),e=groups[Math.min(groups.length-1,Math.floor(v*Math.round(b)))];if(e&&(e.data.result==='running'||bus.age(e)<a)){value=u<e.data.progress?.6:.03;hue=e.data.result==='failure'?.0:e.data.result==='success'?.32:.6;}break;}
        case 171:{const e=bus.latest('download');if(e&&(e.data.total===0||e.data.completed<e.data.total||bus.age(e)<a)){const p=e.data.total?e.data.completed/e.data.total:mod(t*.2);value=e.data.total?(u<p?.6:.02):bell(u-p,b);hue=.52;}break;}
        case 172:{const e=bus.latest('mute',b*1000);if(e&&e.data.state!=='unavailable'&&i<Math.max(1,core.ALL_LEDS.length*.08)){value=a;hue=e.data.state==='muted'?.0:.32;}break;}
        case 173:case 174:{const e=bus.latest('timer',300000);if(e){const elapsed=e.data.paused?0:bus.age(e),remaining=Math.max(0,e.data.remaining-elapsed),progress=remaining/e.data.duration;if(n===173){value=u<=progress?(e.data.phase==='break'?b:a):.015;hue=e.data.phase==='break'?.32:.08;}else if(remaining<a){value=bell(Math.hypot(x-w/2,y-h/2)-remaining/a*w*.5,.4);hue=.1;if(!remaining&&elapsed-e.data.remaining<b)value=Math.max(value,.8*(1-(elapsed-e.data.remaining)/b));}}break;}
        case 175:{const e=bus.latest('battery',30000);if(e){const p=e.data.percent/100;value=u<=p?a:.01;if(e.data.charging)value+=bell(mod(t*.2)-u,.1)*a;hue=e.data.percent<b?.02:.32;}break;}
        case 176:break; // Named scene resolution happens in the compositor.
        case 177:{const e=bus.latest('application',10000),shortcut=bus.latest('shortcut',b*1000);if(e){const guide=bus.guideFor(e.data.process,shortcut?.data.mods??0);value=guide.some(key=>core.LED_FOR_CODE.get(key)===core.ALL_LEDS[i])?a:0;hue=.56;}break;}
        case 178:{const map=new Map<string,HostEvent<'notification'>>();for(const e of bus.events('notification',b*1000))map.set(e.data.notificationId,e);const unread=[...map.values()].filter(e=>e.data.state==='unread').slice(0,Math.round(a)),e=unread[i];if(e){value=.3+.2*Math.sin(t*2);hue=e.data.severity==='error'?.0:e.data.severity==='warning'?.1:.58;}break;}
        case 179:{const e=bus.latest('resource',5000);if(e){const load=(e.data.cpu*(1-v)+e.data.memory*v)/100;value=.05+load*.4+bell(Math.sin(x*.5+t/a)+y/h-load,.2)*load*.25;hue=load*100>b?.03:.57;}break;}
        case 180:{for(const e of bus.events('canvas',b*1000).slice(-Math.round(a))){const d=e.data,age=bus.age(e);let k=0;if(d.overlay==='pulse')k=d.value*Math.exp(-age*2);if(d.overlay==='ripple')k=bell(Math.hypot(x-w/2,y-h/2)-age*4,.5)*d.value*Math.exp(-age);if(d.overlay==='bar')k=u<d.value?.5:0;if(d.overlay==='keys')k=d.keys?.some(key=>core.LED_FOR_CODE.get(key)===core.ALL_LEDS[i])?d.value:0;if(k>value){value=k;hue=d.hue;}}break;}
        default:throw new Error(`No host renderer for FX-${n}`);
      }return color(hue,value);
    });
  };
}
