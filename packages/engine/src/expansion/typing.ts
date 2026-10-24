import type { AnimationCore } from '../animations/core';
import type { Press } from '../reactive/core';
import { clamp01, type Frame, type RGB } from '../colors';
import { bell, color, fieldFrame, hash, hull, line, mod, polygonDistance, TAU, type Point } from './math';

const envelope=(t:number,p:Press,tail:number)=>p.t>t?0:p.release===null||p.release>t?1:Math.exp(-(t-p.release)/Math.max(.01,tail));
function reflect(v:number,size:number):number {const p=mod(v,size*2);return p>size?size*2-p:p;}
export function createTyping(core:AnimationCore) {
  const w=core.BOARD_W,h=Math.max(1,core.BOARD_H-1),route=core.SNAKE_PATH.map(id=>core.LED_GEO.get(id)!).map(p=>({x:p.ux,y:p.uy}));
  return function render(n:number,t:number,input:readonly Press[],a:number,b:number,seed:number):Frame {
    const presses=input.filter(p=>p.t<=t).slice(-600),recent=presses.filter(p=>t-p.t<Math.max(8,a,b)),held=presses.filter(p=>p.release===null||p.release>t);
    const poly=hull(held.map(p=>({x:p.ux,y:p.uy}))),last=presses[presses.length-1];
    const counts=new Float64Array(core.ALL_LEDS.length),short=new Float64Array(counts.length),long=new Float64Array(counts.length),hues=new Float64Array(counts.length);
    const points=[...core.LED_GEO].map(([id,p])=>({id,x:p.ux,y:p.uy}));
    const inherited=new Map<number,number>();
    if(n===135)for(let k=0;k<presses.length;k++){
      const p=presses[k];let weight=0,cx=0,cy=0;
      for(let j=Math.max(0,k-80);j<k;j++){const q=presses[j],age=p.t-q.t,d=Math.hypot(p.ux-q.ux,p.uy-q.uy),g=Math.exp(-age/b)*bell(d,3),h=inherited.get(q.seq)??hash(q.seq,seed);weight+=g;cx+=Math.cos(h*TAU)*g;cy+=Math.sin(h*TAU)*g;}
      const original=hash(p.seq,seed),previous=weight?mod(Math.atan2(cy,cx)/TAU):original;
      inherited.set(p.seq,mod(original+mod(previous-original+.5)-.5)*a+original*(1-a));
    }
    if(n>=133)for(const p of presses)for(let i=0;i<points.length;i++){
      const d=Math.hypot(points[i].x-p.ux,points[i].y-p.uy),age=t-p.t,window=n===140?b:n===139?b:n===135?b:n===143?a:n===133?b:a;
      const weight=Math.exp(-age/Math.max(.1,window))*bell(d,n===138?b:1.15);counts[i]+=weight;short[i]+=Math.exp(-age/Math.max(.1,a))*bell(d,1.15);long[i]+=Math.exp(-age/Math.max(.1,b))*bell(d,1.15);hues[i]+=weight*(n===135?inherited.get(p.seq)??hash(p.seq,seed):hash(p.seq,seed));
    }
    const maxCount=Math.max(1,...counts),total=counts.reduce((sum,q)=>sum+q,0),entropy=total?counts.reduce((sum,q)=>q>0?sum-q/total*Math.log(q/total):sum,0)/Math.max(1,Math.log(counts.length)):0;
    const pairs=new Map<string,{from:Press;to:Press;weight:number}>();
    if(n===136||n===144)for(let k=1;k<presses.length;k++){
      const p=presses[k-1],q=presses[k];if(q.t-p.t>(n===144?.6:2))continue;
      const key=n===144?[p.led,q.led].sort((a,b)=>a-b).join(':'):`${p.led}:${q.led}`,prev=pairs.get(key);pairs.set(key,{from:p,to:q,weight:(prev?.weight??0)+Math.exp(-(t-q.t)/a)});
    }
    // Physical particles receive previous-key motion, release duration, and impulses.
    const particles:{x:number;y:number;hue:number;value:number}[]=[];
    if([112,119,120,131].includes(n)){
      const sources=n===112?Array.from({length:Math.min(96,Math.round(a))},(_,i)=>({ux:hash(i,seed)*w,uy:hash(i+81,seed)*h,t:0,seq:i,release:null} as Press)):n===131?Array.from({length:Math.min(40,Math.round(a))},(_,i)=>({ux:hash(i,seed)*w,uy:hash(i+81,seed)*h,t:0,seq:i,release:null} as Press)):recent.slice(-24).reverse();
      particleLoop:for(let k=0;k<sources.length;k++)for(let j=0;j<(n===119?Math.round(a):1);j++){
        const p=sources[k],start=n===120?p.release:p.t;if(start===null||start>t)continue;const age=t-start;if(n!==112&&n!==131&&age>5)continue;
        const prev=presses[Math.max(0,presses.findIndex(q=>q.seq===p.seq)-1)],theta=prev?Math.atan2(p.uy-prev.uy,p.ux-prev.ux):hash(k+j*19,seed)*TAU;
        let vx=Math.cos(theta+j*TAU/Math.max(1,a))*(n===120?a+b*Math.min(2,(p.release??t)-p.t):2),vy=Math.sin(theta+j*TAU/Math.max(1,a))*2;
        let px=p.ux,py=p.uy;
        if(n===112){px+=vx*t*.3;py+=vy*t*.3;for(const q of recent){const originX=reflect(p.ux+vx*q.t*.3,w),originY=reflect(p.uy+vy*q.t*.3,h),dx=originX-q.ux,dy=originY-q.uy,d=Math.hypot(dx,dy),impulse=b*bell(d,2)*.9*(1-Math.exp(-(t-q.t)/.9));px+=dx/(d||1)*impulse;py+=dy/(d||1)*impulse;}}
        else if(n===131){
          // A moving free-flight reference plus six seconds of softened-force
          // replay bounds work without freezing tracers after the horizon.
          px=reflect(px+vx*Math.max(0,t-6),w);py=reflect(py+vy*Math.max(0,t-6),h);
          const steps=60,dt=Math.min(t,6)/steps;for(let z=0;z<steps;z++){for(const q of held.slice(-16)){const dx=q.ux-px,dy=q.uy-py,f=b/((dx*dx+dy*dy+1)**1.5);vx+=dx*f*dt;vy+=dy*f*dt;}px+=vx*dt;py+=vy*dt;}
        }
        else{px+=vx*age;py+=vy*age+age*age*.6;}
        particles.push({x:reflect(px,w),y:reflect(py,h),hue:hash(k+j,seed),value:n===112||n===131?.7:Math.exp(-age/2)});
        if(particles.length>=96)break particleLoop;
      }
      if(n===119){ // Symmetric pair separation prevents two sparks occupying one cell.
        for(let i=0;i<particles.length;i++)for(let j=i+1;j<particles.length;j++){const p=particles[i],q=particles[j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<.18){const f=(.18-d)*b*.5;p.x-=dx/(d||1)*f;p.y-=dy/(d||1)*f;q.x+=dx/(d||1)*f;q.y+=dy/(d||1)*f;}}
      }
    }
    return fieldFrame(core,(x,y,index):RGB=>{
      let value=0,hue=.55;
      switch(n){
        case 109:case 113:case 116:{let displacement=0,velocity=0;for(const p of recent){const age=t-p.t,d=Math.hypot(x-p.ux,y-p.uy),stiffness=n===109?9:a,damping=n===113?.85:b,amplitude=n===109?a:n===113?b:1;const osc=Math.sqrt(stiffness)*age-d*.7,envelope=Math.exp(-age*(1.5-damping))*bell(d-age*1.5,2);displacement+=Math.sin(osc)*amplitude*envelope;velocity+=Math.cos(osc)*amplitude*envelope;}const compression=n===116?presses.filter(p=>t-p.t<1).length*.02:0;value=Math.abs(displacement)*.7+compression;hue=displacement>0?.08:.58;if(n===113)value+=Math.abs(velocity)*.2;break;}
        case 110:{for(let k=1;k<recent.length;k++){const p=recent[k-1],q=recent[k],duration=Math.min(3,(q.release??t)-q.t),width=a+b*duration;value=Math.max(value,bell(line(x,y,p.ux,p.uy,q.ux,q.uy),width)*Math.exp(-(t-q.t)/4));}hue=.1;break;}
        case 111:{let d1=Infinity,d2=Infinity,owner=0;for(let k=0;k<12;k++){let cx=hash(k,seed)*w,cy=hash(k+88,seed)*h;const popped=recent.some(p=>Math.hypot(cx-p.ux,cy-p.uy)<a&&t-p.t<b);if(popped)continue;cx+=Math.sin(t*.2+k)*.2;cy+=Math.cos(t*.2+k)*.2;const d=Math.hypot(x-cx,y-cy);if(d<d1){d2=d1;d1=d;owner=k;}else d2=Math.min(d2,d);}value=bell(d2-d1,.15);hue=.5+owner*.012;break;}
        case 112:case 119:case 120:case 131:{for(const p of particles){const k=bell(Math.hypot(x-p.x,y-p.y),.25)*p.value;if(k>value){value=k;hue=p.hue;}}break;}
        case 114:{for(let k=1;k<recent.length;k++){const p=recent[k-1],q=recent[k],dx=q.ux-p.ux,dy=q.uy-p.uy,length=Math.hypot(dx,dy)||1,age=t-q.t;for(let j=0;j<Math.round(b);j++){const phase=age-j*a;if(phase<0)continue;const tx=q.ux+dx/length*j*.7,ty=q.uy+dy/length*j*.7;value=Math.max(value,bell(Math.hypot(x-tx,y-ty),.35)*Math.exp(-phase*4));}}hue=.08;break;}
        case 115:{let field=0;for(const p of recent)field+=((p.mods&1)?-1:1)*envelope(t,p,b)*a/(.5+(x-p.ux)**2+(y-p.uy)**2);value=Math.abs(Math.tanh(field));hue=field<0?.62:.04;break;}
        case 117:{let xx=x,yy=y;for(const p of recent){const dx=xx-p.ux,dy=yy-p.uy,f=1+envelope(t,p,b)*bell(Math.hypot(dx,dy),a);xx=p.ux+dx/f;yy=p.uy+dy/f;}value=.12+.6*bell(Math.sin(xx*1.5+t*.3)*Math.cos(yy*1.8),.3);hue=.58+xx*.025;break;}
        case 118:{for(let k=1;k<recent.length;k++){const p=recent[k-1],q=recent[k],dx=q.ux-p.ux,dy=q.uy-p.uy,age=t-q.t,theta=Math.atan2(y-q.uy,x-q.ux)-a*age*bell(Math.hypot(x-q.ux,y-q.uy),3);value+=bell(Math.sin(theta-Math.atan2(dy,dx))*Math.hypot(x-q.ux,y-q.uy),.22)*Math.exp(-age/b)*bell(Math.hypot(x-q.ux,y-q.uy)-age,2);}hue=.5;break;}
        case 121:{for(let k=0;k<held.length;k++)for(let j=k+1;j<held.length;j++){const p=held[k],q=held[j],age=t-Math.max(p.t,q.t),sag=Math.sin(age*Math.sqrt(a))*Math.exp(-age*(1-b))*Math.sin((x-p.ux)/(q.ux-p.ux||1)*Math.PI)*.4;value=Math.max(value,bell(line(x,y-sag,p.ux,p.uy,q.ux,q.uy),.18));}if(held.length===1)value=bell(Math.hypot(x-held[0].ux,y-held[0].uy),.5);hue=.52;break;}
        case 122:{if(poly.length){const d=polygonDistance(x,y,poly);value=bell(d,b*.3)+clamp01(-d)*a*.35;}hue=.48;break;}
        case 123:{if(held.length){const phase=mod(t*a,held.length),i=Math.floor(phase),p=held[i],q=held[(i+1)%held.length],f=mod(phase),px=p.ux+(q.ux-p.ux)*f,py=p.uy+(q.uy-p.uy)*f;value=bell(Math.hypot(x-px,y-py),.3+b)+.12*bell(line(x,y,p.ux,p.uy,q.ux,q.uy),.15);}hue=.1;break;}
        case 124:{for(let i=0;i<held.length;i++){const p=held[i],ph=mod(t/a*(1+i/Math.max(1,b)));value+=bell(Math.hypot(x-p.ux,y-p.uy),.7)*Math.exp(-ph*8);}hue=.65;break;}
        case 125:{for(let i=0;i<held.length;i++){const p=held[i];let phase=(t-p.t)*b*TAU;for(const q of held)phase+=a*Math.sin((q.t-p.t)*b*TAU)*clamp01(t-p.t)/Math.max(1,Math.hypot(q.ux-p.ux,q.uy-p.uy));value+=bell(Math.hypot(x-p.ux,y-p.uy),1)*(.2+.8*Math.max(0,Math.cos(phase))**8);}hue=.16;break;}
        case 126:{let weight=0,red=0,green=0,blue=0;for(const p of recent){const k=envelope(t,p,b)*Math.exp(-Math.hypot(x-p.ux,y-p.uy)/a),c=color(p.hue,1);weight+=k;red+=c[0]*k;green+=c[1]*k;blue+=c[2]*k;}if(weight)return [Math.round(red/weight*clamp01(weight)),Math.round(green/weight*clamp01(weight)),Math.round(blue/weight*clamp01(weight))];break;}
        case 127:{const d=polygonDistance(x,y,poly),age=last?t-last.t:0;value=bell(d-Math.sin(age*7*a)*Math.exp(-age/b)*.3,.2);hue=.12;break;}
        case 128:{let sum=0;for(const p of recent){const d=Math.hypot(x-p.ux,y-p.uy);sum+=Math.cos(d*a*TAU-(t-p.t)*b*TAU)*envelope(t,p,.5);}value=held.length||recent.some(p=>envelope(t,p,.5)>.01)?sum*sum/Math.max(1,held.length**2):0;hue=.57;break;}
        case 129:{for(const hand of [0,1]){const path=presses.filter(p=>(p.ux<w/2?0:1)===hand).slice(-Math.round(a));for(let k=1;k<path.length;k++){const p=path[k-1],q=path[k],strength=bell(line(x,y,p.ux,p.uy,q.ux,q.uy),b)*Math.exp(-(t-q.t)/6)*(hand===Math.floor(x)%2?.9:.45);if(strength>value){value=strength;hue=hand?.08:.58;}}}break;}
        case 132:{if(last&&!held.length){const released=presses.filter(p=>p.release!==null&&last.release!==null&&Math.abs(p.release!-last.release!)<.3);const time=Math.max(...released.map(p=>p.release!)),cx=released.reduce((s,p)=>s+p.ux,0)/Math.max(1,released.length),cy=released.reduce((s,p)=>s+p.uy,0)/Math.max(1,released.length),theta=Math.atan2(cy-h/2,cx-w/2),distance=(x-cx)*Math.cos(theta)+(y-cy)*Math.sin(theta),age=t-time,charge=.4+.6*clamp01(released.reduce((sum,p)=>sum+(p.release!-p.t),0)/Math.max(1,released.length)/1.5);value=bell(distance-age*b,.6)*Math.exp(-age/Math.max(.2,a/b))*charge;}hue=.58;break;}
        case 133:{let depth=0;for(let k=1;k<presses.length;k++){const p=presses[k-1],q=presses[k];depth+=bell(line(x,y,p.ux,p.uy,q.ux,q.uy),.5)*Math.exp(-(t-q.t)/b)*a;}value=.08+bell(mod(depth,.2)-.1,.035)*clamp01(depth*3);hue=.08;break;}
        case 134:{const district=counts[index]/maxCount;value=bell(district-b,.12)*clamp01(counts[index]);hue=.52;break;}
        case 135:value=clamp01(counts[index]);hue=counts[index]?hues[index]/counts[index]:.1;break;
        case 136:{for(const edge of pairs.values())value=Math.max(value,bell(line(x,y,edge.from.ux,edge.from.uy,edge.to.ux,edge.to.uy),.12+edge.weight*b*.15)*clamp01(edge.weight*b));hue=.49;break;}
        case 137:{for(const p of presses){const bucket=Math.floor(p.t/b),age=t-bucket*b,center=mod(bucket*.17+age/a)*w;value=Math.max(value,bell(x-center,.45)*bell(y-p.uy,.7)*Math.exp(-age/a));}hue=.6+y*.03;break;}
        case 138:value=clamp01(counts[index])*(.15+.85*entropy);hue=.04+entropy*.55;break;
        case 139:value=bell(Math.sin(counts[index]/maxCount*a*Math.PI),.2)*clamp01(counts[index]);hue=.48;break;
        case 140:{const fast=short[index],slow=long[index];value=clamp01(Math.abs(fast-slow*.3)+Math.min(fast,slow)*.15);hue=fast>slow*.3?.04:.6;break;}
        case 143:{const damage=counts[index],recovery=Math.exp(-damage*(1+b));value=.1+.6*recovery;hue=.3+damage*.05;break;}
        case 144:{for(const edge of pairs.values())if(edge.weight>=b)value=Math.max(value,bell(line(x,y,edge.from.ux,edge.from.uy,edge.to.ux,edge.to.uy),.17)*clamp01(edge.weight/b));hue=.62;break;}
        default:throw new Error(`No typing renderer for FX-${n}`);
      }
      return color(hue,value);
    });
  };
}
