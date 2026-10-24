import type { AnimationCore } from '../animations/core';
import type { AnimationEntry, AnimationCategory } from '../animations';
import { normalizeControls, type AnimationValues } from '../animations/parameters';
import type { ReactiveDef, Press } from '../reactive/core';
import type { AudioState } from '../audio';
import { clamp01, type Frame } from '../colors';
import { EXPANSION_CATALOG, EXPANSION_PARAMETERS, type ExpansionSpec } from './catalog';
import { color, fieldFrame, mod } from './math';
import { sample, simulationRunner } from './simulation';
import { createProcedural } from './procedural';
import { createWorldRenderer } from './worlds';
import { createTyping } from './typing';
import { createMusic } from './music';
import { createHostRenderer, HostEventBus } from './events';
import { createScenes, blendFrames } from './scenes';
export { EXPANSION_CATALOG, EXPANSION_PARAMETERS } from './catalog';
export { EXPANSION_SCENES, blendFrames } from './scenes';
export { HostEventBus } from './events';
export type { HostEvent, AnyHostEvent, HostEventType, EventPayloads, SourceRegistration, ShortcutGuide } from './events';
export { analyzePitch } from './audio-features';
export type { Pitch } from './audio-features';

export interface EffectRequirements {typing:boolean;audio:boolean;stereo:boolean;pitch:boolean;hostEvents:readonly string[];simulation:boolean;continuity:'smooth'|'stepped'}
export function expansionRequirements(n:number):EffectRequirements {
  return {typing:n>=109&&n<=144||n>=157&&n<=168,audio:n>=145&&n<=156||[157,159,163,164].includes(n),stereo:n===145||n===155,pitch:n===148,hostEvents:n===130?['shortcut']:n>=169?[["build"],["test"],["download"],["mute"],["timer"],["timer"],["battery"],["application"],["application","shortcut"],["notification"],["resource"],["canvas"]][n-169]:[],simulation:EXPANSION_CATALOG[n-1]?.runtime==='stateful-animation',continuity:[1,2,3,4,5,6,8,9,10,11,12,16,20,21,22,36,53,58,65,74,75,76,79,85,95,97,98,100,101,102,103,104,105,106,107,108].includes(n)?'stepped':'smooth'};
}
const cells=new Set([1,2,3,4,5,6,7,9,10,11,12,14,16,20,21,22,64,69]);
const worlds=new Set([8,15,17,18,19,23,42,50,51,53,54,61,62,63,65,66,67,68,75,80,81,82,97,98,99,100,101,102,103,104,105,106,107,108]);
const sceneNumbers=new Set([70,72,141,142,157,158,159,160,161,162,163,164,165,166,167,168]);
const animationCategory=(n:number):AnimationCategory=>n<=24?'Nature':n<=36?'Waves':n<=48?'Particles':n<=72?'Nature':n<=96?'Geometric':n<=108?'Retro':'Ambient';
export function createExpansion(core:AnimationCore,audio:AudioState,baseAnimations:Record<string,AnimationEntry>,baseReactive:Record<string,ReactiveDef>){
  const events=new HostEventBus(audio.soundNow),procedural=createProcedural(core),typing=createTyping(core),music=createMusic(core,audio),host=createHostRenderer(core,events);
  const animations:Record<string,AnimationEntry>={},reactive:Record<string,ReactiveDef>={};
  type Renderer={render:(t:number,p:readonly Press[],values?:AnimationValues)=>Frame;reset:()=>void};
  function makeRenderer(n:number,depth=0):Renderer {
    if(depth>4)throw new Error('Scene nesting limit');
    const spec=EXPANSION_CATALOG[n-1],parameters=EXPANSION_PARAMETERS[spec.id],runner=cells.has(n)?simulationRunner(n):null,world=worlds.has(n)?createWorldRenderer(core,n):null;
    const children=new Map<number,Renderer>();
    const child=(id:number)=>{let r=children.get(id);if(!r){r=makeRenderer(id,depth+1);children.set(id,r);}return r;};
    const scene=sceneNumbers.has(n)?createScenes(core,audio,events,(id,t,p,seed)=>{
      if(id.startsWith('fx:'))return child(Number(id.slice(3))).render(t,p,{seed});
      if(id.startsWith('reactive:')){const entry=baseReactive[id.slice(9)];if(!entry)throw new Error(`Missing scene source ${id}`);return entry.fn(t,p);}
      const entry=baseAnimations[id];if(!entry)throw new Error(`Missing scene source ${id}`);return entry.fn(t);
    }):null;
    return {reset(){runner?.reset();world?.reset();for(const r of children.values())r.reset();children.clear();},render(t,input,values){
      const v=normalizeControls(parameters,values),a=v[spec.controls[0].id],b=v[spec.controls[1].id],seed=v.seed??1;
      t=Math.max(0,Number.isFinite(t)?t:0);
      if(scene)return scene(n,t,input,a,b,seed);
      if(n===176){
        const app=events.application,id=events.manualScene??(app?events.sceneFor(app.process):null);if(!id)return new Map();
        const frameFor=(id:string|null):Frame=>{if(!id)return new Map();const target=EXPANSION_CATALOG.find(s=>s.id===id);return target&&target.number!==176?child(target.number).render(t,input,{seed}):baseAnimations[id]?.fn(t)??new Map();};
        if(events.manualScene)return frameFor(id);
        const elapsed=app?(events.now-app.changedAt)/1000:b,alpha=clamp01((elapsed-b)/Math.max(.01,a)),previous=app?.previous?events.sceneFor(app.previous):null;
        return blendFrames(core,[{frame:frameFor(previous),opacity:1-alpha,blend:'add'},{frame:frameFor(id),opacity:alpha,blend:'add'}]);
      }
      if(spec.runtime==='host-event')return host(n,t,a,b,seed);
      if(spec.runtime==='audio')return music(n,t,a,b,seed);
      if(spec.runtime==='typing')return typing(n,t,input,a,b,seed);
      if(world){const phase=mod(t,48),fade=Math.min(1,phase,48-phase);return new Map([...world.render(t,a,b,seed)].map(([id,c])=>[id,c.map(v=>Math.round(v*fade)) as [number,number,number]]));}
      if(runner){const s=runner.get(t,a,b,seed,n===1?b:n===64?10:6);return fieldFrame(core,(x,y)=>{
        const gx=x/core.BOARD_W*(s.width-1),gy=y/Math.max(1,core.BOARD_H-1)*(s.height-1),index=Math.min(s.a.length-1,Math.floor(gx)+Math.floor(gy)*s.width),v=[1,2,3,4,5,9,10,11,12].includes(n)?s.a[index]:sample(s,gx,gy);let light=0,hue=.5;
        switch(n){
          case 1:case 4:case 11:case 12:light=v*.8+.015;hue=n===11?v*.55:.3;break;
          case 2:light=v===1?1:v<0?.1:0;hue=v===1?.1:.65;break;
          case 3:light=.65;hue=v/a;break;
          case 5:light=v===2?1:v===3?.4:v===1?.08:0;hue=v===2?.57:.08;break;
          case 6:light=clamp01(v/4);hue=.1-v*.03;break;
          case 7:light=clamp01(sample(s,gx,gy,s.b)*4);hue=.62+v*.2;break;
          case 9:light=v===2?1:v===1?.3:0;hue=v===2?.03:.32;break;
          case 10:light=v?.65:0;hue=v===1?.08:.6;break;
          case 14:light=.15+v*.7;hue=.5+v*.3;break;
          case 16:light=.25+v*a*.6;hue=v>.5?.08:.6;break;
          case 22:light=.25+v*.5;hue=v>.5?.08:.6;break;
          case 20:light=s.b[index]>.5?.8:.15+v*.3;hue=s.b[index]>.5?.53:.08;break;
          case 21:light=.1+sample(s,gx,gy,s.b)*.7;hue=.07;break;
          case 64:light=.015+Math.max(0,Math.cos(v))**12;hue=.16;break;
          case 69:light=v;hue=.3;break;
        }const phase=mod(t,32),fade=Math.min(1,phase,32-phase);return color(hue,light*fade);
      });}
      return fieldFrame(core,(xx,yy)=>procedural(n,{x:xx-core.BOARD_W/2,y:yy-Math.max(1,core.BOARD_H-1)/2,u:xx/core.BOARD_W,v:yy/Math.max(1,core.BOARD_H-1),t,a,b,seed,w:core.BOARD_W,h:Math.max(1,core.BOARD_H-1)}));
    }};
  }
  const renderers=new Map<string,Renderer>();
  for(const spec of EXPANSION_CATALOG){
    const renderer=makeRenderer(spec.number);renderers.set(spec.id,renderer);
    const controls=EXPANSION_PARAMETERS[spec.id],n=spec.number;
    if(spec.runtime==='typing'||spec.runtime==='audio'||spec.runtime==='host-event'||sceneNumbers.has(n)&&n!==70&&n!==72){
      reactive[spec.id]={name:spec.name,description:spec.description,category:spec.runtime==='audio'?'Sound':spec.runtime==='host-event'?'Field':n===132?'Release':n>=133&&n<=144?'Memory':n>=121&&n<=132?'Chord':'Field',parameters:controls,window:60,fn:(t,p,v)=>renderer.render(t,p,v)};
    }else animations[spec.id]={name:spec.name,description:spec.description,category:animationCategory(n),parameters:controls,fn:(t,v)=>renderer.render(t,[],v)};
  }
  return {animations,reactive,events,reset(id?:string){if(id)renderers.get(id)?.reset();else for(const r of renderers.values())r.reset();},requirements(id:string){const spec=EXPANSION_CATALOG.find(s=>s.id===id);return spec?expansionRequirements(spec.number):null;}};
}
