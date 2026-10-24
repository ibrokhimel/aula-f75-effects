import { clamp01 } from '../colors';
import { hash, mod, noise, TAU } from './math';

export interface Simulation { a:Float64Array;b:Float64Array; width:number;height:number;tick:number;seed:number;extra:number[] }
export const GRID_W=24, GRID_H=12;
export function createSimulation(seed:number,width=GRID_W,height=GRID_H):Simulation {
  return {a:new Float64Array(width*height),b:new Float64Array(width*height),width,height,tick:0,seed,extra:[]};
}
export function at(s:Simulation,x:number,y:number):number{return mod(Math.floor(x),s.width)+mod(Math.floor(y),s.height)*s.width;}
export function sample(s:Simulation,x:number,y:number,field=s.a):number {
  const ix=Math.floor(x),iy=Math.floor(y),fx=mod(x),fy=mod(y);
  return field[at(s,ix,iy)]*(1-fx)*(1-fy)+field[at(s,ix+1,iy)]*fx*(1-fy)+field[at(s,ix,iy+1)]*(1-fx)*fy+field[at(s,ix+1,iy+1)]*fx*fy;
}
export function lifeStep(cells:Float64Array,width:number,height:number):Float64Array {
  const next=new Float64Array(cells.length);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let n=0;for(let j=-1;j<=1;j++)for(let i=-1;i<=1;i++)if(i||j)n+=cells[mod(x+i,width)+mod(y+j,height)*width]>0?1:0;
    next[x+y*width]=n===3||cells[x+y*width]>0&&n===2?1:0;
  }return next;
}
export function initCells(n:number,s:Simulation,a:number,b:number):void {
  for(let i=0;i<s.a.length;i++){
    const r=hash(i,s.seed);
    switch(n){
      case 1:case 2:s.a[i]=r<a?1:0;break;
      case 3:s.a[i]=Math.floor(r*a);break;
      case 4:s.a[i]=0;break;
      case 5:{const x=i%s.width,y=Math.floor(i/s.width);s.a[i]=y%3===1||x%5===2&&hash(Math.floor(x/5),s.seed)<a?1:0;break;}
      case 6:s.a[i]=Math.floor(r*3);break;
      case 7:s.a[i]=1;s.b[i]=r>.86?.7:0;break;
      case 9:s.a[i]=r>.35?1:0;break;
      case 10:s.a[i]=r<a?(hash(i+1000,s.seed)>.5?1:2):0;break;
      case 11:s.a[i]=r>.5?1:0;break;
      case 12:s.a[i]=r<a?1:0;break;
      case 16:case 22:s.a[i]=r>.5?1:0;break;
      case 20:s.a[i]=r;s.b[i]=0;break;
      case 21:s.a[i]=1;s.b[i]=0;break;
      case 64:s.a[i]=r*TAU;s.b[i]=1+(hash(i+811,s.seed)-.5)*b;break;
      default:s.a[i]=noise(i%s.width*.24,Math.floor(i/s.width)*.24,s.seed);
    }
  }
  if(n===4)for(let w=0;w<Math.round(a);w++)s.extra.push(Math.floor(hash(w,s.seed)*s.width),Math.floor(hash(w+83,s.seed)*s.height),w%4);
  if(n===69)for(let i=0;i<Math.min(96,Math.round(a));i++)s.extra.push(hash(i,s.seed)*s.width,hash(i+181,s.seed)*s.height,hash(i+371,s.seed)*TAU);
}
export function stepCells(n:number,s:Simulation,a:number,b:number):void {
  const {width:w,height:h}=s,old=s.a,next=old.slice(),t=s.tick++;
  if(n===1){s.a=lifeStep(old,w,h);if(t%120===119)initCells(n,s,a,b);return;}
  if(n===4){for(let k=0;k<s.extra.length;k+=3)for(let z=0;z<Math.round(b);z++){
    let [x,y,d]=s.extra.slice(k,k+3);const i=at(s,x,y);d=mod(d+(next[i]>0?-1:1),4);next[i]=1-next[i];
    x=mod(x+[0,1,0,-1][d],w);y=mod(y+[-1,0,1,0][d],h);s.extra.splice(k,3,x,y,d);
  }s.a=next;return;}
  if(n===69){
    for(let k=0;k<s.extra.length;k+=3){let [x,y,heading]=s.extra.slice(k,k+3);const sensor=(angle:number)=>sample(s,x+Math.cos(angle)*2,y+Math.sin(angle)*2),forward=sensor(heading),left=sensor(heading-.6),right=sensor(heading+.6);
      if(left>forward||right>forward)heading+=left>right?-.35:.35;else heading+=(hash(k+t*131,s.seed)-.5)*.15;
      x=mod(x+Math.cos(heading)*.65,w);y=mod(y+Math.sin(heading)*.65,h);next[at(s,x,y)]=Math.min(1,next[at(s,x,y)]+.35);s.extra.splice(k,3,x,y,heading);
    }
    const deposited=next.slice();for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=at(s,x,y),mean=(deposited[at(s,x+1,y)]+deposited[at(s,x-1,y)]+deposited[at(s,x,y+1)]+deposited[at(s,x,y-1)])/4;next[i]=(deposited[i]*.8+mean*.2)*b;}s.a=next;return;
  }
  if(n===6){for(let k=0;k<Math.round(a);k++)next[Math.floor(hash(k,s.seed)*next.length)]+=b/6;
    for(let pass=0;pass<4;pass++)for(let i=0;i<next.length;i++)if(next[i]>=4){const x=i%w,y=Math.floor(i/w);next[i]-=4;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])if(x+dx>=0&&x+dx<w&&y+dy>=0&&y+dy<h)next[at(s,x+dx,y+dy)]++;}
    s.a=next;return;
  }
  if(n===10){const vacancies:number[]=[];for(let i=0;i<old.length;i++)if(!old[i])vacancies.push(i);
    for(let i=0;i<old.length&&vacancies.length;i++)if(old[i]){let same=0,total=0;const x=i%w,y=Math.floor(i/w);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy){const q=old[at(s,x+dx,y+dy)];if(q){total++;if(q===old[i])same++;}}
      if(total&&same/total<b){const k=Math.floor(hash(i+t*491,s.seed)*vacancies.length),dest=vacancies[k];next[dest]=old[i];next[i]=0;vacancies.splice(k,1);}
    }s.a=next;return;
  }
  if(n===12||n===16||n===22){ // Exchanges conserve phase mass exactly.
    for(let z=0;z<old.length;z++){
      const i=Math.floor(hash(z+t*431,s.seed)*old.length),x=i%w,y=Math.floor(i/w);
      const dx=n===22?(hash(z+58+t,s.seed)<b?1:-1):hash(z+58+t,s.seed)>.5?1:-1,dy=n===22?(old[i]>.5?-1:1):(hash(z+78+t,s.seed)>.5?1:0);
      const j=at(s,x+dx,y+dy);let accept=n===12?hash(z+t*43,s.seed)<.2+b*.6:false;
      if(n!==12){let delta=0;for(const [ux,uy]of [[1,0],[-1,0],[0,1],[0,-1]])delta+=Math.abs(next[j]-next[at(s,x+ux,y+uy)])-Math.abs(next[i]-next[at(s,x+ux,y+uy)]);
        accept=delta<0||hash(z+t*43,s.seed)<Math.exp(-delta/(.08+(n===16?b:a)*.25));}
      if(accept){const v=next[i];next[i]=next[j];next[j]=v;}
    }s.a=next;return;
  }
  const nb=new Float64Array(s.b.length);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const i=at(s,x,y),v=old[i],neighbors:number[]=[];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(dx||dy)neighbors.push(old[at(s,x+dx,y+dy)]);
    const mean=neighbors.reduce((p,q)=>p+q,0)/8;
    switch(n){
      case 2:next[i]=v===1?-(Math.round(b)):v<0?v+1:neighbors.filter(q=>q===1).length===2||t%18===0&&hash(i+t*171,s.seed)<a*.2?1:0;break;
      case 3:next[i]=neighbors.filter(q=>q===mod(v+1,Math.round(a))).length>=b?mod(v+1,Math.round(a)):v;break;
      case 5:next[i]=v===2?3:v===3?1:v===1&&(neighbors.filter(q=>q===2).length===1||neighbors.filter(q=>q===2).length===2)?2:v;
        if(t%Math.max(1,Math.round(b*6))===0&&x===2&&y===1)next[i]=2;break;
      case 7:{const bv=s.b[i];let lap=0;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])lap+=s.b[at(s,x+dx,y+dy)]-bv;
        const reaction=v*bv*bv;next[i]=clamp01(v+.18*(mean-v)-reaction+a*(1-v));nb[i]=clamp01(bv+.1*lap+reaction-(a+b)*bv);break;}
      case 9:next[i]=v===2?-Math.max(1,b*6):v<0?v+1:v===1&&(neighbors.includes(2)||hash(i+t*131,s.seed)<.0008)?2:v===0&&hash(i+t*211,s.seed)<a/6?1:v;break;
      case 11:{const energy=neighbors.reduce((sum,q)=>sum+(q===v?-1:1),0)*b;next[i]=energy>0||hash(i+t*337,s.seed)<Math.exp(energy/Math.max(.02,a*5))?1-v:v;break;}
      case 14:{const vx=Math.sin(y*.35+t*.03)*(.7+a),vy=Math.cos(x*.24-t*.02)*.6;next[i]=sample(s,x-vx,y-vy)*(1-b)+mean*b;break;}
      case 20:{const temp=.5+.4*Math.sin(x*.22+t*.013)+.15*Math.cos(y*.4-t*.02);nb[i]=s.b[i]?(temp>a+b?0:1):(temp<a-b?1:0);next[i]=nb[i]?v:sample(s,x-.2,y-.1);break;}
      case 21:{const r=Math.hypot((x-w/2)/(w/2),(y-h/2)/(h/2))+.04*noise(x*.3,y*.3,s.seed),wet=Math.max(.02,1-t*a/60);next[i]=r<wet?1:0;nb[i]=s.b[i]+(v>next[i]?b:0);break;}
      case 64:{let coupling=0;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])coupling+=Math.sin(old[at(s,x+dx,y+dy)]-v);
        next[i]=mod(v+(s.b[i]+a*coupling*.25)*.1,TAU);nb[i]=s.b[i];break;}
      case 69:{const angle=noise(x*.2,y*.2+t*.02,s.seed)*TAU;next[i]=sample(s,x-Math.cos(angle),y-Math.sin(angle))*.7+mean*.3;next[i]*=b;if(hash(i+t*131,s.seed)<a/old.length*.05)next[i]=Math.min(1,next[i]+.4);break;}
      default:next[i]=v;
    }
  }
  s.a=next;if([7,20,21,64].includes(n))s.b=nb;
}

/** Integer fixed-step time. At most 16 seconds of a deterministic 32s epoch
 * are replayed after a seek; ordinary monotonic playback performs only new steps.
 * Epoch changes reseed, keeping unattended playback bounded and reproducible. */
export function simulationRunner(n:number) {
  let state:Simulation|undefined,key='',last=-1,epoch=-1;
  return {reset(){state=undefined;key='';last=-1;epoch=-1;},get(t:number,a:number,b:number,seed:number,rate=10):Simulation {
    t=Math.max(0,Number.isFinite(t)?t:0);const e=Math.floor(t/32),tick=Math.floor(mod(t,32)*Math.min(20,rate));
    const k=`${a}:${b}:${seed}:${rate}`;
    if(!state||k!==key||e!==epoch||tick<last){state=createSimulation(seed+e*977);initCells(n,state,a,b);key=k;epoch=e;last=0;}
    // 640 is the maximum seek work; no integration step is enlarged to catch up.
    for(;last<tick;last++)stepCells(n,state,a,b);
    return state;
  }};
}
