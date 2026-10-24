import type { AnimationCore } from '../animations/core';
import { clamp01, type Frame } from '../colors';
import { bell, color, fieldFrame, hash, line, mod, TAU, type Point } from './math';

export interface Maze {width:number;height:number;edges:number[][];order:number[];parent:number[]}
/** Seeded depth-first maze, with a real graph used by carving and search. */
export function makeMaze(width:number,height:number,seed:number):Maze {
  width=Math.max(2,Math.min(24,Math.round(width)));height=Math.max(2,Math.min(12,Math.round(height)));
  const edges:number[][]=Array.from({length:width*height},()=>[]),parent=new Array(width*height).fill(-1),order=[0],stack=[0],seen=new Set([0]);let turn=0;
  while(stack.length){const i=stack[stack.length-1],x=i%width,y=Math.floor(i/width);
    const options=[x>0?i-1:-1,x<width-1?i+1:-1,y>0?i-width:-1,y<height-1?i+width:-1].filter(j=>j>=0&&!seen.has(j));
    if(!options.length){stack.pop();continue;}
    const j=options[Math.floor(hash(turn++,seed)*options.length)];edges[i].push(j);edges[j].push(i);parent[j]=i;order.push(j);seen.add(j);stack.push(j);
  }return {width,height,edges,parent,order};
}
export function shortestPath(graph:readonly (readonly number[])[],start:number,end:number):number[]{
  const queue=[start],parent=new Map<number,number>([[start,-1]]);
  for(let k=0;k<queue.length&&!parent.has(end);k++)for(const j of graph[queue[k]]??[])if(!parent.has(j)){parent.set(j,queue[k]);queue.push(j);}
  if(!parent.has(end))return[];const out=[end];while(out[out.length-1]!==start)out.push(parent.get(out[out.length-1])!);return out.reverse();
}
interface Body extends Point {vx:number;vy:number;r:number;energy:number;kind:number;target:number;wait:number;path:number[];progress:number}
interface World {bodies:Body[];graph:Maze;growth:Float64Array;owner:Int16Array;phase:Float64Array;velocity:Float64Array;tick:number;seed:number;nextId:number;pieces:{cells:Point[];x:number;y:number;vx:number;vy:number}[]}
export function createWorldRenderer(core:AnimationCore,n:number){
  let world:World|undefined,last=0,key='',epoch=-1;
  const w=Math.max(1,core.BOARD_W),h=Math.max(1,core.BOARD_H-1);
  const coord=(g:Maze,i:number):Point=>({x:(i%g.width+.5)/g.width*w,y:(Math.floor(i/g.width)+.5)/g.height*h});
  function reset(t:number,a:number,b:number,seed:number){
    const e=Math.floor(t/48),g=makeMaze(n===97?a:n===8?6+Math.round(a*12):12,6,seed+e*997),count=g.edges.length;
    world={bodies:[],graph:g,growth:new Float64Array(count),owner:new Int16Array(count).fill(-1),phase:new Float64Array(count),velocity:new Float64Array(count),tick:0,seed:seed+e*997,nextId:0,pieces:[]};
    const s=world;
    let total= n===15?a:n===19?a:n===42?a*12:n===61?a:n===62?b*20+3:n===63?a+b:n===65?a:n===66?a:n===67?a:n===68?32:n===75?a:n===99?a:n===100?a:n===101?a:n===103?a:n===105?12:n===106?a:24;
    total=Math.max(1,Math.min(96,Math.round(total)));
    for(let i=0;i<total;i++){
      const x=hash(i,s.seed)*w,y=hash(i+81,s.seed)*h;
      s.bodies.push({x,y,vx:(hash(i+173,s.seed)-.5)*.7,vy:(hash(i+277,s.seed)-.5)*.7,r:n===15?.18+hash(i+389,s.seed)*.3:n===19?.4+hash(i+389,s.seed)*.6:.1,energy:1,kind:n===63?(i>=a?1:0):i%4,target:Math.floor(hash(i+391,s.seed)*count),wait:0,path:[],progress:0});
    }
    for(let i=0;i<count;i++){s.phase[i]=hash(i,s.seed)*TAU;if(n===65)s.owner[i]=-1;}
    if(n===65)for(let i=0;i<Math.round(a);i++)s.owner[Math.floor(hash(i+100,s.seed)*count)]=i;
    if(n===80)s.growth[Math.floor(count/2)]=1;
    if(n===81){s.growth[0]=0;s.growth[1]=1;s.velocity[0]=.9;s.velocity[1]=.5;}
    if([51,53,54,61,62,66].includes(n)){
      // Growth and fracture use the full local lattice, rather than maze walls.
      g.edges=g.edges.map((_,i)=>{const x=i%g.width,y=Math.floor(i/g.width);return [x?i-1:-1,x<g.width-1?i+1:-1,y?i-g.width:-1,y<g.height-1?i+g.width:-1].filter(j=>j>=0);});
      if(n===53)for(let i=0;i<count;i++)s.growth[i]=Math.floor(i/g.width)<4?1:0;
      if([51,61,62,66].includes(n)){const root=n===51?Math.floor(g.width/2):count-Math.floor(g.width/2);s.growth[root]=1;s.owner[root]=root;}
      if([61,62,66].includes(n))for(let i=0;i<count;i++)s.phase[i]=hash(i+70,s.seed)>(n===62?1-Math.min(20,a)/count:n===66?1-a/count:.9)?1:0;
      if(n===62)s.phase[count-Math.floor(g.width/2)-g.width]=1;
    }
    last=0;epoch=e;key=`${a}:${b}:${seed}`;
  }
  function step(s:World,a:number,b:number){
    const dt=.1,t=s.tick++*dt,g=s.graph,count=g.edges.length;
    if(n===80){const next=s.growth.slice();for(let i=0;i<count;i++){let force=-s.growth[i];for(const j of g.edges[i])force+=s.growth[j]-s.growth[i];s.velocity[i]=(s.velocity[i]+force*a*dt)*b;next[i]=Math.max(-2,Math.min(2,s.growth[i]+s.velocity[i]*dt));}if(s.tick%40===0)s.velocity[Math.floor(hash(s.tick,s.seed)*count)]+=.8;s.growth=next;return;}
    if(n===82){const next=s.growth.slice();next[0]=a;for(let i=0;i<count;i++)for(const j of g.edges[i])if(i<j){const delta=s.growth[i]-s.growth[j];if(Math.abs(delta)>b*.1){const flow=delta*.12;next[i]-=flow;next[j]+=flow;}}s.growth=next;return;}
    if(n===81){const engagement=.5+.5*Math.sin(t*TAU/b),torque=(s.velocity[0]-s.velocity[1])*a*engagement*dt;s.velocity[0]-=torque;s.velocity[1]+=torque;s.velocity[0]+=(.9-s.velocity[0])*.01;s.velocity[1]+=(.5-s.velocity[1])*.01;s.growth[0]+=s.velocity[0]*dt;s.growth[1]+=s.velocity[1]*dt;return;}
    if(n===65){const next=s.owner.slice();for(let i=0;i<count;i++)if(s.owner[i]<0||hash(i+s.tick*31,s.seed)<b*.03){const own=g.edges[i].map(j=>s.owner[j]).filter(v=>v>=0);if(own.length&&hash(i+s.tick*71,s.seed)<.2)next[i]=own[Math.floor(hash(i+s.tick*113,s.seed)*own.length)];}s.owner=next;return;}
    if(n===18){for(let i=0;i<g.width;i++){const left=s.growth[mod(i-1,g.width)],right=s.growth[mod(i+1,g.width)];s.velocity[i]+=(.08+a*.03+(left+right-2*s.growth[i])*.2)*dt;s.growth[i]+=s.velocity[i]*dt;if(s.growth[i]>b*h){s.bodies.push({x:(i+.5)/g.width*w,y:s.growth[i],vx:0,vy:.3,r:.15,energy:1,kind:0,target:0,wait:0,path:[],progress:0});s.growth[i]*=.5;s.velocity[i]=0;}}}
    if(n===23){for(let i=0;i<count;i++)s.growth[i]*=Math.exp(-dt/a);const x=(Math.sin(t*.7)*.4+.5)*g.width,y=(Math.sin(t*1.13+.4)*.4+.5)*g.height;for(let i=0;i<count;i++)s.growth[i]+=bell(Math.hypot(i%g.width-x,Math.floor(i/g.width)-y),b)*dt;return;}
    if(n===61||n===62||n===66){
      const resources=g.edges.map((_,i)=>i).filter(i=>s.phase[i]>.05),tips=g.edges.map((_,i)=>i).filter(i=>s.growth[i]>.1&&g.edges[i].some(j=>!s.growth[j]));
      const budget=n===61?Math.min(24,Math.round(a)):n===66?Math.max(1,Math.round(a/8)):2;
      for(let k=0;k<budget&&tips.length;k++){
        const i=tips[Math.floor(hash(k+s.tick*83,s.seed)*tips.length)],p=coord(g,i);let target=resources[0]??0,best=Infinity;
        for(const r of resources){const q=coord(g,r),d=Math.hypot(p.x-q.x,p.y-q.y);if(d<best){best=d;target=r;}}
        const targetPoint=coord(g,target),candidates=g.edges[i].filter(j=>!s.growth[j]).sort((j,k)=>{const p=coord(g,j),q=coord(g,k);return Math.hypot(p.x-targetPoint.x,p.y-targetPoint.y)-Math.hypot(q.x-targetPoint.x,q.y-targetPoint.y);});
        if(candidates.length&&hash(k+s.tick*193,s.seed)<(n===61?.1+b*.4:.3)){const j=candidates[0];s.growth[j]=.2;s.owner[j]=i;if(s.phase[j]>.05){s.phase[j]=Math.max(0,s.phase[j]-(n===62?b:.25));let current=i;for(let d=0;d<count&&s.owner[current]!==current&&s.owner[current]>=0;d++){s.growth[current]=Math.min(1,s.growth[current]+.2);current=s.owner[current];}}}
      }
      for(let i=0;i<count;i++)if(s.growth[i]>0)s.growth[i]=Math.min(1,s.growth[i]+dt*.2);return;
    }
    if(n===51){
      for(let i=0;i<count;i++)if(s.growth[i]>0&&Math.floor(i/g.width)<g.height-1){const x=i%g.width,y=Math.floor(i/g.width);if(hash(i+s.tick*131,s.seed)<b*.03){const j=(y+1)*g.width+Math.max(0,Math.min(g.width-1,x+(hash(i+s.tick*71,s.seed)>.5?1:-1)));s.growth[j]=Math.min(1,s.growth[j]+s.growth[i]*.6);s.owner[j]=i;if(hash(i+s.tick*311,s.seed)<a){const other=(y+1)*g.width+x;s.growth[other]=Math.min(1,s.growth[other]+s.growth[i]*.4);s.owner[other]=i;}}}return;
    }
    if(n===53){
      if(s.tick%10===0&&s.pieces.length<16){const row=1+Math.floor(hash(s.tick,s.seed)*3);for(let x=0;x<g.width;x++)if(hash(x+s.tick*113,s.seed)<a*2)s.growth[row*g.width+x]=0;
        const anchored=new Set<number>(),queue:number[]=[];for(let x=0;x<g.width;x++)if(s.growth[x]){queue.push(x);anchored.add(x);}for(let k=0;k<queue.length;k++)for(const j of g.edges[queue[k]])if(s.growth[j]&&!anchored.has(j)){anchored.add(j);queue.push(j);}
        const detached=new Set(g.edges.map((_,i)=>i).filter(i=>s.growth[i]&&!anchored.has(i)));
        while(detached.size&&s.pieces.length<16){const first=detached.values().next().value!,component=[first];detached.delete(first);for(let k=0;k<component.length;k++)for(const j of g.edges[component[k]])if(detached.delete(j))component.push(j);for(const i of component)s.growth[i]=0;s.pieces.push({cells:component.map(i=>coord(g,i)),x:0,y:0,vx:(hash(first,s.seed)-.5)*b,vy:b});}
      }for(const p of s.pieces){p.x+=p.vx*dt;p.y+=p.vy*dt;}return;
    }
    if(n===54){for(let i=0;i<count;i++){const p=coord(g,i),stress=Math.sin(p.x*.5+t*.13)+Math.cos(p.y*.8-t*.09);s.growth[i]*=Math.exp(-dt/b);if(Math.abs(stress-a)<.12)s.growth[i]=1;}return;}
    if(n===106){for(let i=0;i<Math.round(a);i++){const cycle=mod(t*b/8+hash(i,s.seed)),height=cycle<.55?cycle/.55:cycle<.8?1:(1-cycle)/.2;s.growth[i]=height*(.35+hash(i+94,s.seed)*.65);}return;}
    for(let k=0;k<s.bodies.length;k++){
      const p=s.bodies[k];
      if(n===42){const k=p.kind%Math.max(1,Math.round(a)),cx=(.15+hash(k,s.seed)*.7)*w,cy=(.15+hash(k+83,s.seed)*.7)*h,collapse=Math.sin(t*TAU/b);p.vx+=(cx-p.x)*collapse*.04;p.vy+=(cy-p.y)*collapse*.04;}
      if(n===50){const cx=w/2+Math.sin(t*.15)*w*.3,cy=h/2+Math.cos(t*.2)*h*.15,dx=p.x-cx,dy=p.y-cy,r=Math.hypot(dx,dy),force=Math.exp(-r/Math.max(.1,a));p.vx+=(-dy*b-dx*.3)*force*dt;p.vy+=(dx*b-dy*.3)*force*dt;}
      if([75,99,100,101,105].includes(n)){
        if(p.wait>0){p.wait-=dt;continue;}
        if(p.path.length<2||p.progress>=p.path.length-1){const start=p.path[p.path.length-1]??Math.floor(hash(k,s.seed)*count);p.target=Math.floor(hash(s.nextId++ +k*91,s.seed)*count);p.path=shortestPath(g.edges,start,p.target);p.progress=0;p.wait=n===105?b:n===75?b*.1:0;}
        const edge=Math.min(p.path.length-2,Math.floor(p.progress)),current=p.path[Math.max(0,edge)]??0,next=p.path[edge+1]??current;
        let blocked=false;
        if(n===75)blocked=mod(t/b)>.65&&next%g.width===g.width-2;
        if(n===100||n===101){const occupancy=s.bodies.slice(0,k).filter(q=>{const j=Math.floor(q.progress);return q.path[j]===current&&q.path[j+1]===next||q.path[j]===next&&q.path[j+1]===current;}).length;blocked=occupancy>=(n===100?Math.round(b):1);}
        if(n===105&&Math.floor(p.progress)>0&&Math.floor(p.progress)%Math.max(1,Math.floor(count/a))===0&&mod(p.progress)<.15){p.wait=b;p.progress+=.16;p.kind=mod(p.kind+1,4);}
        if(!blocked){if(n===101&&p.wait<=0&&mod(p.progress)>.85){p.wait=b;p.progress+=.16;}else p.progress+=dt*(n===101?1.5:3);}else if(n===100&&s.tick%20===0){const alternative=g.edges[current].find(j=>j!==next);if(alternative!==undefined){p.path=[current,...shortestPath(g.edges,alternative,p.target)];p.progress=0;}}
        const j=Math.min(p.path.length-2,Math.floor(p.progress)),start=coord(g,p.path[Math.max(0,j)]??0),end=coord(g,p.path[j+1]??0),f=mod(p.progress);p.x=start.x+(end.x-start.x)*f;p.y=start.y+(end.y-start.y)*f;if(n===105&&p.progress>=p.path.length-1)p.kind=mod(p.kind+1,4);continue;
      }
      if(n===103){const target=coord(g,p.target);if(Math.abs(p.y-target.y)<.08){p.wait+=dt;if(p.wait>b){p.target=Math.floor(hash(s.nextId++,s.seed)*count);p.wait=0;}}else p.y+=Math.sign(target.y-p.y)*dt;p.x=(k+.5)/s.bodies.length*w;continue;}
      if(n===67){const target=coord(g,p.target),dist=Math.hypot(target.x-p.x,target.y-p.y);p.vx=(target.x-p.x)/Math.max(.2,dist);p.vy=(target.y-p.y)/Math.max(.2,dist);if(dist<.2){s.growth[p.target]=1;p.wait+=dt;if(p.wait>b*.2){p.target=Math.floor(hash(s.nextId++,s.seed)*count);p.wait=0;}}}
      if(n===63){const targets=s.bodies.filter(q=>q.kind!==p.kind&&q.energy>0);let nearest:Body|undefined,d=Infinity;for(const q of targets){const dd=Math.hypot(q.x-p.x,q.y-p.y);if(dd<d){d=dd;nearest=q;}}
        if(nearest){const sign=p.kind?1:-1;p.vx+=(nearest.x-p.x)/Math.max(.2,d)*sign*dt;p.vy+=(nearest.y-p.y)/Math.max(.2,d)*sign*dt;if(p.kind&&d<.2){nearest.energy=0;p.energy=Math.min(2,p.energy+.5);}}
        p.energy+=dt*(p.kind?-.04:.04);if(p.energy>1.4&&s.bodies.length<96){p.energy*=.5;s.bodies.push({...p,x:mod(p.x+.3,w),path:[]});}
      }
      if(n===15||n===19){for(let j=k+1;j<s.bodies.length;j++){const q=s.bodies[j],dx=q.x-p.x,dy=q.y-p.y,d=Math.hypot(dx,dy);if(d<p.r+q.r){if(n===15&&p.r+q.r<1.1){const area=p.r*p.r+q.r*q.r;p.vx=(p.vx*p.r*p.r+q.vx*q.r*q.r)/area;p.vy=(p.vy*p.r*p.r+q.vy*q.r*q.r)/area;p.r=Math.sqrt(area);q.energy=0;}else{const push=(p.r+q.r-d)*dt*(n===15?b:1);p.vx-=dx/(d||1)*push;q.vx+=dx/(d||1)*push;p.vy-=dy/(d||1)*push;q.vy+=dy/(d||1)*push;}}}
        if(n===19&&mod(t,b)<dt&&k===Math.floor(hash(s.tick,s.seed)*s.bodies.length))p.r=.25+hash(k+s.tick,s.seed)*.7;
      }
      if(n===68){p.vx+=(a*.3-p.vx)*.05;p.vy+=.01;if(hash(k+s.tick*331,s.seed)<b*.01){const cell=Math.min(count-1,Math.floor(p.x/w*g.width)+Math.floor(p.y/h*g.height)*g.width);s.growth[cell]=1;p.y=0;}}
      if(n===18)p.vy+=.02;
      const speed=Math.hypot(p.vx,p.vy);if(speed>1.5){p.vx*=1.5/speed;p.vy*=1.5/speed;}
      p.x=mod(p.x+p.vx*dt,w);p.y=mod(p.y+p.vy*dt,h);
    }
    s.bodies=s.bodies.filter(p=>p.energy>0).slice(-96);if(n===68||n===67)for(let i=0;i<count;i++)s.growth[i]*=.997;
  }
  return {reset(){world=undefined;},render(t:number,a:number,b:number,seed:number):Frame{
    t=Math.max(0,Number.isFinite(t)?t:0);const target=Math.floor(mod(t,48)*10);
    if(!world||key!==`${a}:${b}:${seed}`||epoch!==Math.floor(t/48)||target<last)reset(t,a,b,seed);
    const s=world!;for(;last<target;last++)step(s,a,b);
    const g=s.graph,count=g.edges.length;
    const visible=new Set(g.order.slice(0,Math.min(count,Math.floor(mod(t,48)*(n===97?b:6))+1)));
    let search:number[]=[];if(n===98){const queue=[0],seen=new Set([0]);for(let k=0;k<queue.length;k++)for(const j of g.edges[queue[k]])if(!seen.has(j)){seen.add(j);queue.push(j);}search=queue.slice(0,Math.floor(mod(t,48)*a)+1);}
    const found=n===98&&search.includes(count-1),route=found?shortestPath(g.edges,0,count-1):[];
    const routeFade=n===98?Math.max(.1,1-Math.max(0,mod(t,48)-count/a)/b):1;
    const positions=g.edges.map((_,i)=>coord(g,i)),rank=new Int16Array(count);g.order.forEach((id,i)=>rank[id]=i);
    const edges:{p:Point;q:Point;strength:number}[]=[];
    if([8,17,51,61,62,66,97,98,99,100,101,102,105,107].includes(n))for(let i=0;i<count;i++)for(const j of g.edges[i])if(i<j){
      let strength=.07;
      if(n===97)strength=visible.has(i)&&visible.has(j)?.65:.015;
      if(n===98)strength=route.includes(i)&&route.includes(j)?.95*routeFade:search.includes(i)?.35:.035;
      if([51,61,62,66].includes(n))strength=s.owner[i]===j||s.owner[j]===i?Math.min(s.growth[i],s.growth[j]):0;
      if(n===8)strength=bell(mod(t*b-rank[j],count),3);
      if(n===17)strength=clamp01((t*a-rank[j]*(1+b))*2);
      if(n===102)strength=rank[j]<mod(t*b,count)&&j%(Math.max(2,Math.floor(count/(a+1))))!==0?.7:.03;
      if(n===107)strength=clamp01((t-rank[j]*b/Math.max(1,a))*3);
      if(strength>.001)edges.push({p:positions[i],q:positions[j],strength});
    }
    if(n===51)for(let i=0;i<count;i++)if(s.owner[i]>=0&&s.owner[i]!==i)edges.push({p:positions[i],q:positions[s.owner[i]],strength:s.growth[i]*(.55+.35*Math.sin(t*b-positions[i].y*3))});
    return fieldFrame(core,(x,y)=>{
      let value=0,hue=.52;const gx=x/w*g.width,gy=y/h*g.height,cell=Math.min(count-1,Math.max(0,Math.floor(gx)+Math.floor(gy)*g.width));
      if([8,17,51,61,62,66,97,98,99,100,101,102,105,107].includes(n)){
        for(const {p,q,strength}of edges)value=Math.max(value,bell(line(x,y,p.x,p.y,q.x,q.y),n===66?b:.12)*strength);
        if(n===97){const active=coord(g,g.order[Math.min(count-1,visible.size-1)]);value+=bell(Math.hypot(x-active.x,y-active.y),.4);}
        if(n===98)hue=found?.32:.57;
      }
      if([15,19,42,50,63,67,68,75,99,100,101,103,105].includes(n))for(const p of s.bodies){const d=Math.hypot(x-p.x,y-p.y),v=n===19?bell(d-p.r,.14):n===15?bell(d,p.r):bell(d,.3);if(v>value){value=v;hue=n===63?(p.kind?.02:.32):.1+p.kind*.19;}if(n===99){const j=Math.floor(p.progress),start=Math.max(0,j-Math.ceil(b*3));for(let k=start;k<j&&k+1<p.path.length;k++){const q=coord(g,p.path[k]),r=coord(g,p.path[k+1]);value=Math.max(value,bell(line(x,y,q.x,q.y,r.x,r.y),.1)*Math.exp(-(j-k)/Math.max(.1,b*3))*.4);}}}
      switch(n){
        case 18:{const i=Math.min(g.width-1,Math.floor(x/w*g.width));value=clamp01((s.growth[i]-y)*8)*.7;for(const p of s.bodies)value+=bell(Math.hypot(x-p.x,y-p.y),.2);hue=.6;break;}
        case 19:hue=.52;break;
        case 23:value=clamp01(s.growth[cell]);hue=.06+s.growth[cell]*.15;break;
        case 53:{value=s.growth[cell]*.65;for(const piece of s.pieces)for(const p of piece.cells)value=Math.max(value,bell(Math.hypot(x-p.x-piece.x,y-p.y-piece.y),.35)*.65);hue=.53;break;}
        case 54:value=.7*(1-s.growth[cell]);hue=.52;break;
        case 65:value=s.owner[cell]>=0?.6+.3*Math.sin(t*.2):.01;hue=s.owner[cell]/Math.max(1,a);break;
        case 62:value+=s.phase[cell]*.25;hue=s.phase[cell]>.05?.12:.32;break;
        case 67:case 68:value+=s.growth[cell]*.3;break;
        case 80:value=.06+Math.abs(s.growth[cell])*.8;hue=s.growth[cell]>0?.08:.58;break;
        case 82:value=.03+s.growth[cell]*2;hue=.58-s.growth[cell]*.25;break;
        case 81:{const phase=x<w/2?s.growth[0]:s.growth[1],cx=x<w/2?w*.25:w*.75;value=bell(Math.sin(Math.atan2(y-h/2,x-cx)-phase),.18)*bell(Math.hypot(x-cx,y-h/2)-h*.3,.6);hue=x<w/2?.1:.58;break;}
        case 104:{const district=Math.floor(x/w*a),day=mod(t/b),scheduled=hash(cell+district*93,seed);value=day>.25&&day<.85&&scheduled<(.75+.15*Math.sin(district+day*12))?.3+.5*hash(cell,seed):.12;hue=.1+district*.012;break;}
        case 106:{const block=Math.min(Math.round(a)-1,Math.floor(x/w*a));value=clamp01((y/h-(1-s.growth[block]))*20)*.6+bell(y/h-(1-s.growth[block]),.035)*.3;hue=.11;break;}
        case 108:{const cycle=Math.floor(t/(b+8)),tx=hash(cycle,seed)*w,ty=hash(cycle+83,seed)*h,phase=mod(t,b+8),reach=Math.max(.25,w*(1-Math.min(1,Math.floor(phase*a/8)/a)));value=bell(Math.hypot(x-tx,y-ty)-reach,.3)*.8+bell(Math.hypot(x-tx,y-ty),.3)*clamp01((phase-7)*2);hue=.3;break;}
      }
      return color(hue,value);
    });
  }};
}
