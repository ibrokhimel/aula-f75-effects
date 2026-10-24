import {writeFileSync} from 'node:fs';
import {createEffectLibrary,EXPANSION_CATALOG,type KeyboardLayout} from '../../packages/engine/src';
import {F75_LAYOUT} from '../src/lib/bridges/f75/layout';
const pad:KeyboardLayout={id:'pad',name:'12 keys',leds:Array.from({length:12},(_,i)=>({id:100+i*17,label:String(i),keyCode:`Key${String.fromCharCode(65+i)}`,x:i%4,y:Math.floor(i/4),row:Math.floor(i/4),column:i%4}))};
const rows=[];
for(const layout of [pad,F75_LAYOUT]){
 const l=createEffectLibrary(layout);let now=0;l.audio.setSoundClock(()=>now);l.events.setClock(()=>now);l.events.register({id:'benchmark',types:['canvas','resource','build','application']});
 const presses=Array.from({length:120},(_,i)=>{const key=layout.leds[i%layout.leds.length],p=l.reactiveCore.makePress(key.id,i*.03,i,key.keyCode);p.release=i%5?p.t+.15:null;return p;});
 for(const spec of EXPANSION_CATALOG){l.expansion.reset();const times=[];for(let i=0;i<96;i++){
  now=4000+i*1000/30;const t=now/1000,beat=i%15<3?.9:.05;
  l.audio.pushAudioSample({level:beat,bass:beat,mid:beat,treble:beat,spectrum:new Array(20).fill(beat),centroid:.5,left:.3,right:.6,pitch:{hz:440,confidence:.95,pitchClass:9}});
  l.events.push({version:1,id:`canvas-${i}-${spec.number}`,source:'benchmark',at:now,type:'canvas',data:{overlay:'ripple',value:.7,hue:.5}});
  const start=performance.now();const frame=l.animations[spec.id]?.fn(t)??l.reactive[spec.id].fn(t,presses);times.push(performance.now()-start);if(frame.size>layout.leds.length)throw new Error('Invalid frame');
 }times.sort((a,b)=>a-b);rows.push({layout:layout.id,id:spec.id,p50ms:times[48],p95ms:times[91],maxMs:times[95],frames:96,inputs:'120 typing events, measured-format audio fixture, canvas events; some event types intentionally absent'});}
}
const report={runtime:process.versions,measuredAt:new Date().toISOString(),notes:['CPU render timings on this machine. No hardware transport or real-time FPS guarantee.','First sampled frame may include seek replay. Input-driven effects without their specific host event are idle.'],rows};
const output=process.argv[2]??'docs/EFFECTS-PERFORMANCE.json';writeFileSync(output,JSON.stringify(report,null,2));
console.log(JSON.stringify({output,worstP95:Math.max(...rows.map(r=>r.p95ms)),over33ms:rows.filter(r=>r.p95ms>33.3).map(r=>({id:r.id,layout:r.layout,p95ms:r.p95ms}))}));
