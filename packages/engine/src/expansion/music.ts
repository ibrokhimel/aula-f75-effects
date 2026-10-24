import type { AnimationCore } from '../animations/core';
import type { AudioState } from '../audio';
import { clamp01, type Frame } from '../colors';
import { bell, color, fieldFrame, hash, mod, TAU } from './math';

export function createMusic(core:AnimationCore,audio:AudioState){
  const w=core.BOARD_W,h=Math.max(1,core.BOARD_H-1),route=core.SNAKE_PATH;
  return function render(n:number,t:number,a:number,b:number,seed:number):Frame{
    const alive=audio.audioAlive(),s=audio.SOUND_STATE,f=audio.features,now=audio.soundNow(),beat=f.beat(now),stereo=f.left!==null&&f.right!==null;
    if(!alive||([145,155].includes(n)&&!stereo))return new Map();
    const onsets=f.onsets.filter(o=>now-o.at<10000);
    return fieldFrame(core,(x,y,i)=>{
      const u=x/w,v=y/h,r=Math.hypot(x-w/2,y-h/2),angle=Math.atan2(y-h/2,x-w/2);let value=0,hue=.55;
      switch(n){
        case 145:{const spread=clamp01((u-.5)*a+.5);value=(f.left!*(1-spread)+f.right!*spread)*(.5+.5*b);hue=u<.5?.57:.04;break;}
        case 146:{const factor=1+a*s.bass*bell(r,b),xx=w/2+(x-w/2)/factor,yy=h/2+(y-h/2)/factor;value=(.12+.7*bell(Math.sin(xx*.9+t*.4)*Math.cos(yy),.3))*s.level;hue=.6;break;}
        case 147:{for(const o of onsets){if(o.strength<a||now-o.at<0)continue;const age=(now-o.at)/1000;if(age>3||onsets.some(q=>q!==o&&q.band===o.band&&q.at<o.at&&o.at-q.at<b*1000))continue;const px=(o.band+.5)/3*w+Math.sin(o.at)*w*.07,py=age*2;value+=bell(Math.hypot(x-px,y-py),.3)*Math.exp(-age);}hue=.52;break;}
        case 148:{const pitch=f.pitch;if(pitch&&pitch.confidence>=a){const target=pitch.pitchClass/11*w;value=bell(x-target,.55)*(.3+.7*s.level)*Math.exp(-Math.max(0,now-f.lastAt)/1000/b);hue=pitch.pitchClass/12;}break;}
        case 149:{const index=route.indexOf(core.ALL_LEDS[i]);for(const o of onsets){const age=(now-o.at)/1000,head=age*a,distance=head-index;if(distance>=0&&distance<b)value=Math.max(value,(1-distance/b)*o.strength*4);}hue=.1;break;}
        case 150:{const radius=a*s.level,phase=t*.8+s.centroid*TAU/(1+b),cx=w/2+Math.cos(phase)*radius,cy=h/2+Math.sin(phase)*Math.min(h*.4,radius);value=bell(Math.hypot(x-cx,y-cy),.5)*s.level;hue=s.centroid;break;}
        case 151:{const confident=beat.confidence>=a,phase=confident?beat.phase*TAU:t*TAU/2,corrected=phase+(confident?Math.sin(phase)*b:0),px=w/2+Math.sin(corrected)*w*.35;value=bell(x-px,.5)*(.15+.85*s.level);hue=confident?.12:.6;break;}
        case 152:{const band=Math.min(2,Math.floor(u*3)),pulse=onsets.filter(o=>o.band===band&&now-o.at<a*1000).reduce((sum,o)=>sum+o.strength*Math.exp(-(now-o.at)/1000/b)*3,0);value=pulse*bell(v-.5,.4);hue=band*.24;break;}
        case 153:{const quiet=clamp01((a-s.level)/Math.max(.01,a)),duration=f.history.filter(c=>now-c.at<5000&&c.level<a).length/30;value=quiet*bell(r-Math.min(h,duration*b),.7)*.6;hue=.3;break;}
        case 154:{const wanted=now-(1-u)*a*1000;let nearest=f.history[0];for(const c of f.history)if(Math.abs(c.at-wanted)<Math.abs((nearest?.at??Infinity)-wanted))nearest=c;const band=Math.min(19,Math.floor((1-v)*19));value=(nearest?.spectrum[band]??0)**b;hue=.67-band*.02;break;}
        case 155:{let balance=(f.right!-f.left!)/Math.max(.05,f.left!+f.right!);if(Math.abs(balance)<b)balance=0;value=(.2+.8*bell(Math.sin(angle*3-r-t*balance*a),.35))*bell(r-s.level*h*.5,1)*s.level;hue=.55+balance*.2;break;}
        case 156:{const history=f.history.filter(c=>now-c.at<a*1000),first=history.slice(0,Math.max(1,Math.floor(history.length/2))),second=history.slice(Math.floor(history.length/2)),avg=(v:typeof history)=>v.reduce((sum,c)=>sum+c.level,0)/Math.max(1,v.length),build=avg(second)-avg(first);let last=-Infinity;for(const onset of onsets){if(onset.at-last<b*1000)continue;const previous=f.history.filter(c=>c.at<onset.at&&c.at>onset.at-a*1000),mid=Math.floor(previous.length/2);if(avg(previous.slice(mid))-avg(previous.slice(0,mid))>.05&&onset.strength>.15)last=onset.at;}const age=(now-last)/1000;value=Math.max(0,build)*.3+bell(r-age*5,.7)*Math.exp(-age);hue=age<2?.05:.6;break;}
        default:throw new Error(`No music renderer for FX-${n}`);
      }return color(hue,clamp01(value)*alive);
    });
  };
}
