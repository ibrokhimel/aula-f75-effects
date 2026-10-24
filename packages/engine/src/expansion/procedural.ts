import type { AnimationCore } from '../animations/core';
import type { RGB } from '../colors';
import { clamp01 } from '../colors';
import { bell, color, fbm, hash, line, mod, noise, TAU } from './math';

export interface PixelContext {x:number;y:number;u:number;v:number;t:number;a:number;b:number;seed:number;w:number;h:number}
const ridge=(phase:number,width=.13)=>bell(Math.sin(phase),width);
const orbit=(t:number,rx:number,ry:number,phase=0)=>[Math.cos(t+phase)*rx,Math.sin(t+phase)*ry];
function stars(x:number,y:number,t:number,seed:number,shift=0):RGB {
  let light=0,hue=.58;
  for(let i=0;i<22;i++){
    const angle=hash(i,seed)*TAU,depth=mod(t*.07+hash(i+70,seed)),radius=depth*12;
    const d=Math.hypot(x-Math.cos(angle)*radius,y-Math.sin(angle)*radius*.5);
    const value=bell(d,.15+depth*.25)*Math.sin(depth*Math.PI);if(value>light){light=value;hue=.6-shift*depth;}
  }return color(hue,light,.35);
}
/** Hilbert's integer distance-to-coordinate transform, capped to 256 points. */
export function hilbert(order:number):{x:number;y:number}[]{
  const size=2**Math.min(4,Math.max(1,Math.round(order))),out=[];
  for(let d=0;d<size*size;d++){let x=0,y=0,t=d;for(let s=1;s<size;s*=2){const rx=1&Math.floor(t/2),ry=1&(t^rx);if(!ry){if(rx){x=s-1-x;y=s-1-y;}[x,y]=[y,x];}x+=s*rx;y+=s*ry;t=Math.floor(t/4);}out.push({x:x/(size-1),y:y/(size-1)});}return out;
}
export function peano(order:number):{x:number;y:number}[]{
  let path=[{x:0,y:0}],size=1;
  for(let depth=0;depth<Math.min(3,Math.max(1,Math.round(order)));depth++){
    const next:{x:number;y:number}[]=[];
    // Nine reflected copies of the prior traversal form one continuous path.
    for(let row=0;row<3;row++)for(let step=0;step<3;step++){
      const col=row%2?2-step:step,flipX=row%2===1,flipY=col%2===1;
      for(const p of path)next.push({x:col*size+(flipX?size-1-p.x:p.x),y:row*size+(flipY?size-1-p.y:p.y)});
    }path=next;size*=3;
  }return path.map(p=>({x:p.x/(size-1),y:p.y/(size-1)}));
}
export function createProcedural(core:AnimationCore) {
  const paths=new Map<string,{x:number;y:number}[]>();
  return function pixel(n:number,p:PixelContext):RGB {
    const {x,y,u,v,t,a,b,seed,w,h}=p,r=Math.hypot(x,y),angle=Math.atan2(y,x);
    let value=0,hue=.56,saturation=.8;
    switch(n){
      case 13:{ // Inverse-square magnetic field, ridged isocontour.
        let f=0;for(let i=0;i<Math.round(a);i++){const [cx,cy]=orbit(t*.2,w*.3,h*.25,i*TAU/a);f+=1/(.4+(x-cx)**2+(y-cy)**2);}
        value=bell(f-.7-.12*Math.sin(angle*12+t),.18)*(.45+.55*Math.max(0,Math.cos(angle*12+t))**b);hue=.66;break;
      }
      case 24:{const refractive=u<.5?u:u*.55+.225;value=.12+.8*ridge((refractive*w+v*h*Math.sin(b*Math.PI/180)-t*2)*a*3,.25);hue=.52+u*.12;break;}
      case 25:{const theta=b*Math.PI/180,beamY=x*Math.tan(theta)*.2;
        if(x<0){value=bell(y-beamY,.25);saturation=.05;}else{let red=0,green=0,blue=0;for(let k=0;k<3;k++){const d=y-beamY-x*(k-1)*a*.2;const c=bell(d,.22);if(k===0)red=c;if(k===1)green=c;if(k===2)blue=c;}return [Math.round(red*255),Math.round(green*255),Math.round(blue*255)];}break;
      }
      case 26:{const [cx,cy]=orbit(t*.3,w*.25,h*.2);const dx=x-cx,dy=y-cy,f=1+b*bell(Math.hypot(dx,dy),a);value=.25+.65*ridge((cx+dx/f)*1.2+t,.3)*(.5+.5*Math.sin((cy+dy/f)*2-t));hue=.58+(cx+dx/f)*.03;break;}
      case 27:{const opening=Math.abs(y)<a,blocked=x>0&&!opening;value=x<0?(.3+.3*Math.cos(x*TAU/b-t*2)):blocked?(.5+.5*Math.cos(Math.hypot(x,y)*TAU/b-t*2))*bell(y/(x+1),.6):.8;hue=.58;break;}
      case 28:{const d1=Math.hypot(x,y-a/2),d2=Math.hypot(x,y+a/2);value=x<0?.1:(Math.cos(d1*TAU/b-t*2)+Math.cos(d2*TAU/b-t*2))**2/4;hue=.72;break;}
      case 29:{value=.9;for(let i=0;i<a;i++){const cx=Math.sin(t*.4+i*2)*w*.3,cy=Math.cos(t*.3+i)*h*.25;const shadow=line(x,y,-w*.55,-h*.55,cx,cy);if(x>cx-w*.3)value*=1-.92*bell(shadow,.3+b);}hue=.12;break;}
      case 30:{const polygonRadius=(.3+b*.8)*h*.5*Math.cos(Math.PI/a)/Math.cos(mod(angle+t*.25,TAU/a)-Math.PI/a);value=clamp01((polygonRadius-r)*3)*(.35+.4*noise(u*3+t*.1,v*3,seed));hue=.62;break;}
      case 31:{const field=(xx:number)=>Math.sin(xx*1.4+t)*Math.cos(y*1.5-t*.4);const rgb=[-a,0,a].map(dx=>clamp01(Math.abs(field(x+dx+.2)-field(x+dx-.2))*b*2));return rgb.map(c=>Math.round(c*255)) as RGB;}
      case 32:{const z=(a-.5)*h+Math.sin(t*.4)*h*.3,shape=Math.sin(x*.8+t*.1)*Math.cos(y*.9)+Math.cos(z*1.5);value=bell(shape,b*3);hue=.72+z*.05;break;}
      case 33:{let d1=Infinity,d2=Infinity,owner=0;for(let i=0;i<12;i++){const d=Math.hypot(u-hash(i,seed),v-hash(i+100,seed));if(d<d1){d2=d1;d1=d;owner=i;}else d2=Math.min(d2,d);}
        value=clamp01((d2-d1-a*.3)*20)*(.15+.85*bell(x-Math.sin(t*.2)*w*.45,b));hue=hash(owner,seed);break;}
      case 34:{const f=fbm(u*3,v*3,seed);hue=f*1.6+a/360+t*.025;value=.2+.65*bell(Math.sin(f*9+t*.3+a/180),.8);saturation=b;break;}
      case 35:{const orientation=Math.sin(x*.5+t*.2)+Math.cos(y*.8-t*.13);value=Math.cos(orientation*b+b*.1+b*noise(u*2,v*2,seed)+a*Math.PI/180)**2;hue=.6+orientation*.12;break;}
      case 36:{const base=.25+.4*noise(u*3+t*.1,v*3,seed),threshold=hash(Math.floor(x/b)+Math.floor(y/b)*193,seed);value=(Math.floor(base*a)+(mod(base*a)>threshold?1:0))/a;hue=.55;saturation=.15;break;}
      case 37:{for(let i=0;i<b;i++){const ph=t*.6+i*TAU/b,theta=ph+a*Math.sin(ph);const cx=Math.cos(theta)*w*.36,cy=Math.sin(theta)*h*.4*Math.sqrt(1-a*a);value+=bell(Math.hypot(x-cx,y-cy),.4);}hue=.1+t*.02;break;}
      case 38:{const [dx,dy]=orbit(t*.7,a>0?b/2:b,h*.22);const d1=Math.hypot(x-dx,y-dy),d2=Math.hypot(x+dx*a,y+dy*a);value=bell(d1,.8)+bell(d2,.8*a);if(Math.sin(t*.7)>0&&d2<.6*a)value=bell(d2,.8*a);hue=.12-dy*.03;break;}
      case 39:{for(let i=0;i<a;i++){const delay=i*b*(1+.25*Math.sin(t*.4)),ph=t-delay;const cx=Math.sin(ph*.7)*w*.38,cy=Math.sin(ph*1.4)*h*.35;value+=bell(Math.hypot(x-cx,y-cy),.3)*(1-i/(a+1));}hue=.5+t*.025;break;}
      case 40:{const ph=angle-t*a/Math.max(.5,r);value=(.15+.65*ridge(ph*b+r*2,.45))*bell(r-h*.35,h*.35);hue=.06+r*.04;break;}
      case 41:{const beam=Math.max(0,Math.cos(2*(angle-t*.7)));value=bell(r,b)+beam**Math.max(1,180/a)*Math.exp(-r/7);hue=.57;saturation=.45;break;}
      case 42:{const cycle=mod(t/b),collapse=.5-.5*Math.cos(cycle*TAU);for(let i=0;i<40;i++){const k=i%Math.round(a),cx=(hash(k,seed)-.5)*w*.6,cy=(hash(k+7,seed)-.5)*h*.5;const px=cx+(hash(i+90,seed)-.5)*w*(1-collapse),py=cy+(hash(i+170,seed)-.5)*h*(1-collapse);value+=bell(Math.hypot(x-px,y-py),.25);}hue=.72+collapse*.2;break;}
      case 43:{for(let lane=0;lane<a;lane++){const yy=(lane+.5)/a*h-h/2;for(let i=0;i<Math.ceil(b*12);i++){const xx=(mod(hash(i+lane*31,seed)+t*(.025+lane*.009))*1.4-.7)*w;value+=bell(Math.hypot((x-xx)*.8,(y-yy)*1.5),.24);}}hue=.08;saturation=.2;break;}
      case 44:{const front=Math.sin(t*.25)*w*.65+a*y*y;value=bell(x-front,.5)+.4*noise((x-b*bell(x-front,2))*.7+t*.3,y*.7,seed);hue=.48;break;}
      case 45:{const [cx,cy]=orbit(t*.2,w*.15,h*.15),dx=x-cx,dy=y-cy,dist=Math.hypot(dx,dy),factor=1+a*b/(dist*dist+.8);return stars(cx+dx*factor,cy+dy*factor,t,seed);}
      case 46:{const px=Math.sin(t*.22)*w*.6,d=Math.hypot(x-px,y);value=(.3+.5*bell(r,h*.7))*clamp01((d-a)/.15)+bell(d-a,b);hue=.1;break;}
      case 47:{let cx=0,cy=0;for(let i=0;i<a;i++){const ph=t*(i+1)/6;cx+=Math.cos(ph);cy+=Math.sin(ph);const [ox,oy]=orbit(ph,w*.4,h*.35);value+=bell(Math.hypot(x-ox,y-oy),.3);}const agreement=Math.hypot(cx,cy)/a;value+=bell(r,h)*bell(1-agreement,Math.max(.01,b/180))*.5;hue=.15;break;}
      case 48:return stars(x,y,t*(1+b*.4),seed,a);
      case 49:{const d=x-Math.sin(t*.13)*w*.4-Math.sin(y*.6+t*.15)*2;value=.1+bell(d,a)*b;hue=d>0?.57:.04;break;}
      case 50:{const cx=Math.sin(t*.15)*w*.3,cy=Math.cos(t*.2)*h*.15,rr=Math.hypot(x-cx,y-cy),ph=Math.atan2(y-cy,x-cx);value=bell(rr-a,a)*(.2+.8*ridge(ph*4+t*b+rr*1.6,.5));hue=.58+rr*.035;break;}
      case 51:{const downstream=v,center=.5+Math.sin(v*4+t*.1)*.08;value=bell(u-center,.018)*(.4+.4*Math.sin(v*20-t*b));for(let i=0;i<5;i++){const split=.2+i*.12,sign=i%2?1:-1;value+=bell(u-center-sign*Math.max(0,downstream-split)*a,.012)*clamp01((downstream-split)*10)*(.5+.3*Math.sin(v*25-t*b));}hue=.5;break;}
      case 52:{for(let past=0;past<12;past++){const tt=t-past*b/12,channel=Math.sin(v*5+tt*.06)*a;value+=bell(x-channel,.22)*(past===0?.7:.15*(1-past/12));}hue=.47;break;}
      case 53:{const crack=fbm(u*7,v*5,seed),edge=.62+Math.sin(t*.06)*.12,detached=crack<.3+a*.3;value=clamp01((edge-v)*12)*(detached?.2+.4*bell(mod(t*b+u*3)-.5,.2):.75)+.03;value*=clamp01(Math.abs(crack-(.3+a*.3))*20);hue=.53;saturation=.18;break;}
      case 54:{const stress=Math.sin(x*.6+t/b)+Math.cos(y*.9-t/b),crack=bell(stress-a,.08);value=.65*(1-crack);hue=crack>.3?.6:.51;saturation=.3;break;}
      case 55:{const phase=mod((x+Math.sin(y*.6)*.6-t*.3)/a),crest=phase<b?phase/Math.max(.01,b):(1-phase)/Math.max(.01,1-b);value=.1+.7*crest**2;hue=.1;saturation=.6;break;}
      case 56:{const ridgeHeight=a*Math.exp(-x*x/4),cloud=fbm(u*5-t*b*.12,v*3,seed),moisture=x<0?1:Math.exp(-x*a*.7);value=clamp01((cloud-.35)*2)*moisture+bell(y+ridgeHeight*h,h*.07)*.2;hue=.58;saturation=.2;break;}
      case 57:{const cell=mod(u*a),ph=t*b+Math.floor(u*a)*Math.PI;const cx=(Math.floor(u*a)+.5)/a*w-w/2,px=cx+Math.cos(ph)*w/a*.35,py=Math.sin(ph)*h*.35;value=.12+.8*bell(Math.hypot(x-px,y-py),.4)+.2*ridge(Math.hypot((cell-.5)*2,v-.5)*4,.2);hue=.64-.62*v;break;}
      case 58:{const cycle=Math.floor(t/4),age=mod(t,4);for(let j=0;j<a;j++){const start=hash(j+cycle*33,seed),xx=(start-.5)*w,yy=-h/2+Math.min(1,age/b)*h;const d=line(x,y,xx,-h/2,xx+(hash(j+100,seed)-.5)*4,yy);value+=bell(d,.15)*Math.exp(-age/Math.max(.05,b));}hue=.6;saturation=.15;break;}
      case 59:{value=.05+.15*bell(Math.hypot(x-w*.3,y+h*.2),1.2);for(let i=0;i<a;i++)value+=clamp01((noise(u*3+t*.02*(1+i*b),v*3+i*30,seed)-.5)*2)*.25;hue=.6;saturation=.3;break;}
      case 60:{const front=Math.sin(t*.1)*w*.65,field=fbm(u*3+t*.02,v*3,seed);value=clamp01((front-x+a*w*.5)/b)*clamp01((field-.2)*1.4)*.6;hue=.55;saturation=.08;break;}
      case 71:{const waterline=Math.sin(t*TAU/b)*a*h*.3,below=clamp01((waterline-y)*3+.5),colony=noise(u*8,v*4,seed);value=clamp01((colony-.5)*3)*(.4+.5*below)+bell(y-waterline,.2)*.15;hue=.12+.35*below;break;}
      case 73:{const count=Math.round(a),width=w/count;for(let i=0;i<count;i++){const cx=-w/2+(i+.5)*width,dx=x-cx,rr=Math.hypot(dx,y),ph=Math.atan2(y,dx)+(i%2?-1:1)*t;value+=bell(rr-width*.4,.2)*(.3+.7*ridge(ph*b,.45));}hue=.1;saturation=.3;break;}
      case 74:{const cycle=Math.floor(t),phase=mod(t),stroke=phase<1-b?Math.sin(phase/(1-b)*Math.PI/2):1-.08*Math.sin((phase-1+b)/b*Math.PI);const theta=(cycle+stroke)/a*TAU;value=bell(mod(angle-theta+Math.PI,TAU)-Math.PI,.12)*bell(r-h*.3,.6);hue=.08;break;}
      case 76:{const ph=t*TAU/a,px=Math.sin(ph)*b,py=-h*.35+Math.cos(ph)*h*.5;value=bell(line(x,y,0,-h*.5,px,py),.15)+bell(Math.hypot(x-px,y-py),.5);hue=.1;break;}
      case 77:{const ph=mod(t*.3+u),rise=ph<.35?(.5-.5*Math.cos(ph/.35*Math.PI)):ph<.35+b?1:.5+.5*Math.cos((ph-.35-b)/Math.max(.05,.65-b)*Math.PI);value=bell(y-(h*.35-rise*a),.3)+.15*clamp01((y-h*.35+rise*a)*2);hue=.08;break;}
      case 78:{const phase=mod(t*.5+Math.floor(u*a)*.5),lift=phase<b?Math.sin(phase/b*Math.PI/2):Math.cos((phase-b)/(1-b)*Math.PI/2);value=clamp01((v-lift*.8)*8)*.5+bell(v-lift*.8,.07);hue=.05+.5*Math.floor(u*a)%1;break;}
      case 79:{const phase=mod(t),advance=phase<b?(.5-.5*Math.cos(phase/b*Math.PI)):1,theta=(Math.floor(t)+advance)/a*TAU;value=bell(Math.sin(angle-theta),.12)*bell(r-h*.3,.5);hue=.62;break;}
      case 81:{const engaging=.5+.5*Math.sin(t*TAU/b),phase1=t*.9,phase2=t*.6+a*engaging*Math.sin(t*.3);value=bell(Math.sin(angle-(x<0?phase1:phase2)),.2)*bell(r-h*.3,.6);hue=x<0?.1:.58;break;}
      case 83:{const split=a-.5+.15*Math.sin(t*.3)*(1-b),ph=t*(1+(x<0?-1:1)*split);value=bell(Math.sin(angle-ph),.2)*bell(r-h*.3,.7);hue=x<0?.55:.08;break;}
      case 84:{const phase=t+Math.floor(u*8)*a+Math.floor(v*4)*a,edge=Math.abs(Math.cos(phase));value=clamp01((edge-b)*3)*(.2+.6*((Math.floor(u*8)+Math.floor(v*4))%2));hue=Math.sin(phase)>.0?.55:.1;break;}
      case 85:{const ix=Math.floor((x+w/2)/a),iy=Math.floor((y+h/2)/a),xx=mod((x+w/2)/a)-.5,yy=mod((y+h/2)/a)-.5,phase=t/b+hash(ix+iy*31,seed)*7,turn=Math.floor(phase)+(.5-.5*Math.cos(mod(phase)*Math.PI)),rotation=(Math.floor(hash(ix+iy*31,seed)*4)+turn)*Math.PI/2,rx=xx*Math.cos(rotation)-yy*Math.sin(rotation)+.5,ry=xx*Math.sin(rotation)+yy*Math.cos(rotation)+.5;value=Math.max(bell(Math.hypot(rx,ry)-.5,.07),bell(Math.hypot(rx-1,ry-1)-.5,.07));hue=.48;break;}
      case 86:case 87:{const key=`${n}:${a}`;let path=paths.get(key);if(!path){path=n===86?hilbert(a):peano(a);paths.set(key,path);}
        const head=mod(t*.08),tail=n===86?b:.12,walkers=n===86?1:b;let best=0;for(let i=0;i<path.length;i++){const point=path[i];for(let k=0;k<walkers;k++){const age=mod(head+k/walkers-i/path.length);if(age<tail)best=Math.max(best,bell(Math.hypot((u-point.x)*w,(v-point.y)*h),.35)*(1-age/tail));}}value=best;hue=.6+head*.3;break;}
      case 88:{let d1=Infinity,d2=Infinity,owner=0;for(let i=0;i<8*Math.min(3,Math.round(a));i++){const parent=i%8,split=Math.sin(t*TAU/b)*.07*(Math.floor(i/8)+1),cx=hash(parent,seed)+Math.cos(i*2.4)*split,cy=hash(parent+93,seed)+Math.sin(i*2.4)*split,d=Math.hypot((u-cx)*w,(v-cy)*h);if(d<d1){d2=d1;d1=d;owner=i;}else d2=Math.min(d2,d);}value=clamp01((d2-d1)*4);hue=hash(owner,seed);break;}
      case 89:{const points=Array.from({length:Math.min(24,Math.round(a))},(_,i)=>({x:(hash(i,seed)-.5)*w+Math.sin(t*.1+i)*.3,y:(hash(i+83,seed)-.5)*h+Math.cos(t*.1+i)*.3}));for(let i=0;i<points.length;i++){const neighbors=points.map((q,j)=>({q,j,d:Math.hypot(q.x-points[i].x,q.y-points[i].y)})).filter(q=>q.j!==i).sort((p,q)=>p.d-q.d).slice(0,3);for(const {q}of neighbors)value=Math.max(value,bell(line(x,y,points[i].x,points[i].y,q.x,q.y),.1+b*.2));}hue=.51;break;}
      case 90:{let sum=0;for(let i=0;i<5;i++){const ph=i*Math.PI/5+b*Math.PI/180;sum+=Math.cos((x*Math.cos(ph)+y*Math.sin(ph))*a+t*.12);}value=bell(sum, .35)+.2*clamp01(sum*.2+.5);hue=.12+sum*.05;break;}
      case 91:{const round=b+.2*Math.sin(t*.2),radius=h*.3/(.3+Math.abs(Math.cos(a*angle/4))**(1+round*3)+Math.abs(Math.sin(a*angle/4))**(1+round*3));value=bell(r-radius,.2);hue=.68;break;}
      case 92:{for(let i=0;i<a;i++){const ph=u*TAU*2+t*.3+i*TAU/a,yy=Math.sin(ph)*h*.3;value=Math.max(value,bell(y-yy,b)*(.45+.55*(.5+.5*Math.cos(ph))));}hue=.55+u*.3;break;}
      case 93:{let d=1e3;for(let i=0;i<b;i++){const [cx,cy]=orbit(t*.2,w*.25,h*.25,i*TAU/b),q=Math.hypot(x-cx,y-cy)-.8;const k=Math.max(.01,a),blend=clamp01(.5+.5*(q-d)/k);d=q*(1-blend)+d*blend-k*blend*(1-blend);}d=Math.max(d,-(Math.hypot(x,y)-.7));value=bell(d,.2);hue=.6+d*.1;break;}
      case 94:{const elevation=fbm(u*3+Math.sin(t*.06)*.2,v*3+t*.008,seed);value=bell(Math.sin(elevation*a*Math.PI),Math.max(.02,b*3));hue=.48+elevation*.15;break;}
      case 95:{let size=1,xx=u,yy=v,depth=0;for(;depth<a;depth++){const detail=noise(Math.floor(xx)*1.7+depth,Math.floor(yy)*1.7+t*.05,seed);if(detail<b)break;xx=mod(xx)*2;yy=mod(yy)*2;size*=2;}const d=Math.min(mod(xx),1-mod(xx),mod(yy),1-mod(yy));value=.1+bell(d,.06)*.8;hue=.1+depth*.12+size*.001;break;}
      case 96:{const s1=Math.sin(x*TAU/a+t*.2),s2=Math.sin((y+x*.25)*TAU/(a*b)-t*.15);value=Math.max(bell(s1,.15)*(s2>0?.85:.3),bell(s2,.15)*(s1>0?.3:.85));hue=s1>s2?.08:.55;break;}
      default:throw new Error(`No procedural renderer for FX-${n}`);
    }
    return color(hue,clamp01(value),saturation);
  };
}
