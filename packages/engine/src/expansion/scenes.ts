import type { AnimationCore } from '../animations/core';
import type { Press } from '../reactive/core';
import type { AudioState } from '../audio';
import { clamp01, type Frame, type RGB } from '../colors';
import { bell, color, fieldFrame, hash, mod, sampleFrame, TAU } from './math';
import type { HostEventBus } from './events';

export interface SceneLayer {source:string;opacity:number;blend:'add'|'screen'|'normal';mask?:'edges'|'center'}
export interface SceneDefinition {version:1;number:number;layers:readonly SceneLayer[]}
const layer=(source:string,opacity:number,blend:SceneLayer['blend']='screen',mask?:SceneLayer['mask']):SceneLayer=>({source,opacity,blend,mask});
/** Serializable layer roles. Every source shares the scene clock, while each
 * stateful layer owns a separate simulation instance through its renderer. */
export const EXPANSION_SCENES:readonly SceneDefinition[]=[
  {version:1,number:70,layers:[layer('fx:62',.7),layer('springbloom',.6),layer('fx:68',.3)]},
  {version:1,number:72,layers:[layer('sunrise',.45),layer('springbloom',.55)]},
  {version:1,number:141,layers:[layer('fx:135',.6),layer('fx:94',.25)]},
  {version:1,number:142,layers:[layer('rain',.6),layer('fx:137',.15)]},
  {version:1,number:157,layers:[layer('caustics',.35),layer('fx:117',.45),layer('fx:146',.2)]},
  {version:1,number:158,layers:[layer('rain',.6),layer('nightlight',.15),layer('reactive:fade',.5)]},
  {version:1,number:159,layers:[layer('fx:55',.25),layer('fx:149',.3),layer('fx:118',.5)]},
  {version:1,number:160,layers:[layer('fx:61',.45),layer('fx:68',.35),layer('reactive:holdbloom',.5)]},
  {version:1,number:161,layers:[layer('fx:7',.55),layer('fx:94',.2),layer('fx:109',.25)]},
  {version:1,number:162,layers:[layer('nightlight',.2),layer('reactive:fade',.15)]},
  {version:1,number:163,layers:[layer('matrixrain',.2),layer('fx:123',.5),layer('reactive:sndconfetti',.25)]},
  {version:1,number:164,layers:[layer('fx:35',.15),layer('fx:154',.3),layer('reactive:trail',.35)]},
  {version:1,number:165,layers:[layer('fx:40',.6),layer('reactive:heatbuild',.4),layer('reactive:chargeburst',.5)]},
  {version:1,number:166,layers:[layer('lanterns',.7),layer('reactive:fade',.25)]},
  {version:1,number:167,layers:[layer('fx:15',.6),layer('fx:117',.4),layer('nightlight',.1,'screen','edges')]},
  {version:1,number:168,layers:[layer('fx:5',.6),layer('reactive:pulse',.4)]},
];
export function blendFrames(core:AnimationCore,layers:readonly {frame:Frame;opacity:number;blend:SceneLayer['blend'];mask?:SceneLayer['mask']}[]):Frame{
  const result:Frame=new Map();for(const id of core.ALL_LEDS){let rgb:RGB=[0,0,0];const p=core.LED_GEO.get(id)!,u=p.x,v=p.y;
    for(const l of layers){const mask=l.mask==='edges'?clamp01(Math.max(Math.abs(u-.5),Math.abs(v-.5))*2):l.mask==='center'?bell(Math.hypot(u-.5,v-.5),.4):1,alpha=clamp01(l.opacity)*mask,c=l.frame.get(id)??[0,0,0];rgb=rgb.map((old,i)=>Math.round(l.blend==='add'?Math.min(255,old+c[i]*alpha):l.blend==='screen'?255-(255-old)*(1-c[i]*alpha/255):old*(1-alpha)+c[i]*alpha)) as RGB;}
    result.set(id,rgb);
  }return result;
}
export function createScenes(core:AnimationCore,audio:AudioState,bus:HostEventBus,source:(id:string,t:number,presses:readonly Press[],seed:number)=>Frame){
  return function render(n:number,t:number,presses:readonly Press[],a:number,b:number,seed:number):Frame {
    const def=EXPANSION_SCENES.find(d=>d.number===n);if(!def)throw new Error(`Unknown scene ${n}`);
    const last=presses.filter(p=>p.t<=t).at(-1),idle=last?t-last.t:t;
    let time=t,ceiling=1;const weights=def.layers.map(l=>l.opacity);
    switch(n){
      case 70:{time=mod(t,a)*24/a;const season=mod(t/a)*4,overlap=Math.max(.01,b*4);weights[0]*=clamp01((1.7-season)/overlap);weights[1]*=bell(season-1.5,.7+overlap);weights[2]*=bell(season-2.5,.7+overlap);ceiling=Math.min(1,mod(t,a),a-mod(t,a));break;}
      case 72:{time=t*24/a;const day=.5-.5*Math.cos(t*TAU/a);weights[0]=.45;weights[1]=day*.55;ceiling=b+(1-b)*day;break;}
      case 141:{const phase=mod(t/a),activity=Math.min(1,presses.filter(p=>t-p.t<10).length/20);time=t*.2;weights[0]=.2+activity*b;weights[1]=.1+.2*Math.sin(phase*TAU)**2;break;}
      case 142:{const reservoir=Math.min(b,presses.filter(p=>p.t<=t&&t-p.t<60).length),rain=clamp01(idle-a)*clamp01((reservoir-(idle-a)*2)/Math.max(1,b));weights[0]=rain;weights[1]=.1*(1-rain);break;}
      case 157:weights[1]=a;weights[2]=b;break;
      case 158:weights[0]=a;weights[2]=b;break;
      case 159:weights[0]=a*.45;weights[2]=b;break;
      case 160:weights[1]=a;weights[2]=b;break;
      case 161:weights[1]=b;weights[2]=a;break;
      case 162:ceiling=a*Math.max(.1,Math.exp(-Math.max(0,idle-b)/b));break;
      case 163:weights[0]=a;weights[1]=b;break;
      case 164:weights[1]=a;weights[2]=b;break;
      case 165:weights[0]=a;weights[2]=b;break;
      case 166:weights[1]=b;ceiling=Math.max(.15,Math.exp(-Math.max(0,idle-30)/30));break;
      case 167:weights[0]=a;weights[1]=b;break;
      case 168:weights[0]=a;weights[1]=b;break;
    }
    const layers=def.layers.map((l,i)=>({...l,opacity:weights[i],frame:l.source==='lanterns'?fieldFrame(core,(x,y)=>{
      let v=0;for(let k=0;k<Math.round(a);k++)v+=bell(Math.hypot(x-hash(k,seed)*core.BOARD_W,y-hash(k+81,seed)*core.BOARD_H),.8)*(.4+.1*Math.sin(t*.2+k));return color(.09,v,.55);
    }):source(l.source,time,presses,seed)}));
    let frame=blendFrames(core,layers);
    if(n===157||n===167){
      const source=frame;
      frame=fieldFrame(core,(x,y)=>{let xx=x,yy=y;
        for(const p of presses.slice(-64)){if(p.t>t)continue;const envelope=p.release===null||p.release>t?1:Math.exp(-(t-p.release)/.6),dx=xx-p.ux,dy=yy-p.uy,f=1+envelope*(n===157?a:b)*bell(Math.hypot(dx,dy),1.8);xx=p.ux+dx/f;yy=p.uy+dy/f;}
        if(n===157&&audio.audioAlive()){const dx=xx-core.CX,dy=yy-core.CY,f=1+audio.SOUND_STATE.bass*b*bell(Math.hypot(dx,dy),4);xx=core.CX+dx/f;yy=core.CY+dy/f;}
        return sampleFrame(core,source,Math.max(0,Math.min(core.BOARD_W,xx)),Math.max(0,Math.min(core.BOARD_H-1,yy)));
      });
    }
    // Shared palette and luminance ceiling avoid unrelated layer palettes flashing white.
    const warm=[158,165,166].includes(n),cold=[157,164,167].includes(n);
    frame=new Map([...frame].map(([id,rgb])=>{let c=rgb;if(warm)c=color(.07+rgb[0]/255*.035,Math.max(...rgb)/255,.65);if(cold)c=color(.5+rgb[2]/255*.11,Math.max(...rgb)/255,.5);return[id,c.map(v=>Math.round(v*ceiling)) as RGB];}));
    if(n===168){const build=bus.latest('build');if(build&&build.data.result!=='running'&&bus.age(build)<2){const hue=build.data.result==='failure'?.0:.32;frame=new Map([...frame].map(([id,c])=>[id,color(hue,Math.max(...c)/255)]));}}
    return frame;
  };
}
