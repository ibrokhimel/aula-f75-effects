import type { AudioSample } from '../audio';
import { clamp01 } from '../colors';

export interface Pitch {hz:number;confidence:number;pitchClass:number}
/** Normalized autocorrelation, silence rejection, and local-maximum selection.
 * PCM is needed: twenty display spectrum bins cannot identify musical notes. */
export function analyzePitch(pcm:ArrayLike<number>,sampleRate:number):Pitch|null {
  const length=Math.min(2048,pcm.length);if(length<256||!Number.isFinite(sampleRate)||sampleRate<=0)return null;
  let mean=0;for(let i=0;i<length;i++)mean+=pcm[i];mean/=length;
  let energy=0;for(let i=0;i<length;i++)energy+=(pcm[i]-mean)**2;if(energy/length<.00005)return null;
  const min=Math.max(2,Math.floor(sampleRate/1200)),max=Math.min(Math.floor(length/2),Math.ceil(sampleRate/70)),corr=new Float64Array(max+2);
  let best=0,lag=0;
  for(let k=min;k<=max;k++){
    let dot=0,e1=0,e2=0;for(let i=0;i<length-k;i++){const a=pcm[i]-mean,b=pcm[i+k]-mean;dot+=a*b;e1+=a*a;e2+=b*b;}corr[k]=dot/Math.sqrt(e1*e2||1);
  }
  for(let k=min+1;k<max;k++)if(corr[k]>.7&&corr[k]>=corr[k-1]&&corr[k]>corr[k+1]&&corr[k]>best*.98){best=corr[k];lag=k;break;}
  if(!lag)return null;
  const left=corr[lag-1],right=corr[lag+1],correction=(left-right)/(2*(left-2*best+right)||1),hz=sampleRate/(lag+Math.max(-.5,Math.min(.5,correction)));
  return {hz,confidence:clamp01(best),pitchClass:((Math.round(69+12*Math.log2(hz/440))%12)+12)%12};
}
export interface SpectrumColumn {at:number;spectrum:number[];level:number;centroid:number}
export interface Onset {at:number;band:number;strength:number}
export function createAudioFeatures(){
  const history:SpectrumColumn[]=[],onsets:Onset[]=[];let previous:number[]=[],left:number|null=null,right:number|null=null,pitch:Pitch|null=null,lastAt=-Infinity;
  function reset(){history.length=onsets.length=0;previous=[];left=right=null;pitch=null;lastAt=-Infinity;}
  function push(sample:AudioSample,at:number){
    if(!Number.isFinite(at))return;if(at<lastAt)reset();
    const spectrum=Array.from({length:20},(_,i)=>clamp01(sample.spectrum[i]??0));
    if(at-lastAt>=25){
      for(let band=0;band<3;band++){
        const lo=band===0?0:band===1?6:13,hi=band===0?6:band===1?13:20;
        let flux=0;for(let i=lo;i<hi;i++)flux+=Math.max(0,spectrum[i]-(previous[i]??spectrum[i]));flux/=hi-lo;
        const prior=onsets.filter(o=>o.band===band).at(-1);if(flux>.06&&(!prior||at-prior.at>100))onsets.push({at,band,strength:flux});
      }
      history.push({at,spectrum,level:clamp01(sample.level),centroid:clamp01(sample.centroid)});previous=spectrum;lastAt=at;
    }
    if(history.length>256)history.splice(0,history.length-256);if(onsets.length>96)onsets.splice(0,onsets.length-96);
    left=Number.isFinite(sample.left)?clamp01(sample.left!):null;right=Number.isFinite(sample.right)?clamp01(sample.right!):null;
    pitch=sample.pitch&&sample.pitch.hz>0&&Number.isFinite(sample.pitch.hz)&&Number.isFinite(sample.pitch.confidence)&&Number.isFinite(sample.pitch.pitchClass)?{...sample.pitch,confidence:clamp01(sample.pitch.confidence),pitchClass:((Math.round(sample.pitch.pitchClass)%12)+12)%12}:null;
  }
  function beat(now:number){const times=onsets.filter(o=>o.band===0&&now-o.at<12000).map(o=>o.at),intervals=times.slice(1).map((v,i)=>v-times[i]).filter(d=>d>=250&&d<=1500).sort((a,b)=>a-b);const period=intervals[Math.floor(intervals.length/2)]??500,variance=intervals.reduce((sum,d)=>sum+Math.abs(d-period)/period,0)/Math.max(1,intervals.length);return {period,phase:(now-(times.at(-1)??now))/period,confidence:clamp01(intervals.length/5)*(1-clamp01(variance)),last:times.at(-1)??-Infinity};}
  return {push,reset,history,onsets,beat,get left(){return left;},get right(){return right;},get pitch(){return pitch;},get lastAt(){return lastAt;}};
}
