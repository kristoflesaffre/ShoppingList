import {it,expect} from 'vitest';
import {visibleAnswers,type Answer} from './cinema-companion';
import type {Playback} from '../cinema-companion';
it('filters future conversation on rewind and invalidates it on track, offset, mode or stream changes',()=>{
 const p={sessionId:'session123',streamFingerprint:'stream'} as Playback;
 const track={hash:'track'} as Parameters<typeof visibleAnswers>[3];
 const settings={mode:'strict' as const,offsetMs:0,vision:false as const};
 const answer={sessionId:p.sessionId,fingerprint:'stream',trackHash:'track',mode:'strict',offsetMs:0,contextEndMs:20000} as Answer;
 expect(visibleAnswers([answer],p,10000,track,settings)).toEqual([]);
 expect(visibleAnswers([answer],p,30000,track,settings)).toEqual([answer]);
 expect(visibleAnswers([answer],{...p,sessionId:'other'},30000,track,settings)).toEqual([]);
 expect(visibleAnswers([answer],p,30000,{...track!,hash:'other'},settings)).toEqual([]);
 expect(visibleAnswers([answer],p,30000,track,{...settings,offsetMs:1})).toEqual([]);
 expect(visibleAnswers([answer],p,30000,track,{...settings,mode:'unrestricted'})).toEqual([]);
 expect(visibleAnswers([answer],p,null,track,settings)).toEqual([]);
});
