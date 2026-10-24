import { clamp01, hsv, type Frame, type RGB } from '../colors';
import type { AnimationCore } from '../animations/core';
export const TAU = Math.PI * 2;
export const mod = (v: number, n = 1) => ((v % n) + n) % n;
export const hash = (x: number, seed = 1) => mod(Math.sin(x * 127.1 + seed * 311.7) * 43758.5453);
export const bell = (d: number, width: number) => Math.exp(-d * d / Math.max(0.0001, width * width));
export const line = (x: number, y: number, ax: number, ay: number, bx: number, by: number) => {
  const dx = bx - ax, dy = by - ay;
  const u = clamp01(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1));
  return Math.hypot(x - ax - dx * u, y - ay - dy * u);
};
export function noise(x: number, y: number, seed = 1): number {
  const ix = Math.floor(x), iy = Math.floor(y);
  const sx = mod(x) ** 2 * (3 - 2 * mod(x)), sy = mod(y) ** 2 * (3 - 2 * mod(y));
  const a = hash(ix + iy * 193, seed), b = hash(ix + 1 + iy * 193, seed);
  const c = hash(ix + (iy + 1) * 193, seed), d = hash(ix + 1 + (iy + 1) * 193, seed);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}
export function fbm(x: number, y: number, seed = 1): number {
  return noise(x, y, seed) * .57 + noise(x * 2.1, y * 2.1, seed + 4) * .29 + noise(x * 4.3, y * 4.3, seed + 9) * .14;
}
export interface Point { x: number; y: number }
export function hull(points: readonly Point[]): Point[] {
  const p = [...points].sort((a,b)=>a.x-b.x||a.y-b.y);
  if (p.length < 3) return p;
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const half=(src:Point[])=>{const out:Point[]=[];for(const v of src){while(out.length>1&&cross(out[out.length-2],out[out.length-1],v)<=0)out.pop();out.push(v);}return out;};
  return [...half(p).slice(0,-1),...half(p.reverse()).slice(0,-1)];
}
export function polygonDistance(x:number,y:number,p:readonly Point[]):number {
  if(!p.length)return 1e3;
  if(p.length===1)return Math.hypot(x-p[0].x,y-p[0].y);
  let inside=false,d=Infinity;
  for(let i=0,j=p.length-1;i<p.length;j=i++){
    const a=p[i],b=p[j];d=Math.min(d,line(x,y,a.x,a.y,b.x,b.y));
    if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)inside=!inside;
  }
  return inside?-d:d;
}
export function routeDistance(x:number,y:number,path:readonly Point[]):number {
  if(path.length===1)return Math.hypot(x-path[0].x,y-path[0].y);
  let d=Infinity;for(let i=1;i<path.length;i++)d=Math.min(d,line(x,y,path[i-1].x,path[i-1].y,path[i].x,path[i].y));return d;
}
export function pathPoint(path:readonly Point[],phase:number):Point {
  if(path.length<2)return path[0]??{x:0,y:0};
  const u=mod(phase)*(path.length-1),i=Math.floor(u),a=path[i],b=path[Math.min(i+1,path.length-1)];
  return {x:a.x+(b.x-a.x)*mod(u),y:a.y+(b.y-a.y)*mod(u)};
}
/** Coordinate sampler interpolates the nearest four physical keys. */
export function sampleFrame(core:AnimationCore,frame:Frame,x:number,y:number):RGB {
  const closest=[...core.LED_GEO].map(([led,p])=>({...p,led,d:(p.ux-x)**2+(p.uy-y)**2})).sort((a,b)=>a.d-b.d).slice(0,4);
  let weight=0,r=0,g=0,b=0;
  for(const p of closest){const w=1/Math.max(.00001,p.d),c=frame.get(p.led)??[0,0,0];weight+=w;r+=c[0]*w;g+=c[1]*w;b+=c[2]*w;}
  return [Math.round(r/weight),Math.round(g/weight),Math.round(b/weight)];
}
export const color=(h:number,v:number,s=.8):RGB=>hsv(h,clamp01(s),clamp01(v));
export function fieldFrame(core:AnimationCore,fn:(x:number,y:number,i:number)=>RGB):Frame {
  return new Map([...core.LED_GEO].map(([led,p],i)=>[led,fn(p.ux,p.uy,i)]));
}
