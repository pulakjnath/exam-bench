const fs=require('fs');
const src=fs.readFileSync('p2.js','utf8')+';module.exports=E;';
const m={exports:{}};new Function('module',src)(m);
const E=m.exports;
const top=n=>Array.from({length:n},(_,i)=>'Topic '+(i+1));
const subs=[
 {id:'a',name:'S&S',kind:'theory',rating:'weak',weight:2,pastPapers:true,examDate:'',topics:top(8)},
 {id:'b',name:'Maths',kind:'theory',rating:'okay',weight:2,pastPapers:false,examDate:'',topics:top(6)},
 {id:'c',name:'EM',kind:'theory',rating:'weak',weight:3,pastPapers:true,examDate:'',topics:top(7)},
 {id:'d',name:'Digital',kind:'theory',rating:'strong',weight:2,pastPapers:true,examDate:'',topics:top(6)},
 {id:'e',name:'Analog Lab',kind:'lab',rating:'okay',weight:1,pastPapers:false,examDate:'',topics:top(6)},
];
const S={settings:{startDate:'2026-11-01',examDate:'2026-12-02',startTime:'21:30',lightsOut:'01:00',hours:[3,3,3,3,3,3,2],bufferDay:6,breakMin:10},
 subjects:subs,tasks:[
 {id:'t1',title:'S&S Assignment 2',type:'assignment',subjectId:'a',totalMin:180,chunkMin:60,due:'2026-11-14',mode:'hybrid'},
 {id:'t2',title:'Analog Lab record',type:'lab',subjectId:'e',totalMin:180,chunkMin:30,due:'2026-11-17',mode:'hybrid',slot:'17:00'}],
 coveredBase:{},taskDone:{},done:{}};
const P=E.buildPlan(S);
console.log(P.warnings,P.n,P.D);
for(const d of P.days.slice(0,4).concat(P.days.slice(-3))){
  console.log('\n',d.date,d.phase,d.min,d.exams.join(),d.headline.join(' | '));
  const tot=d.rows.reduce((a,r)=>a+r.dur,0);
  console.log(' sum',tot,'window',d.min,' ok:',tot===d.min-(d.rows.filter(r=>r.kind==='task').length?0:0));
  d.out.concat(d.rows).forEach(r=>console.log('  ',E.fmtTime(r.start),r.dur,r.kind,r.title));
}
let bad=0;P.days.forEach(d=>{if(d.min>0&&d.rows.length){const tot=d.rows.reduce((a,r)=>a+r.dur,0);if(tot!==d.min){bad++;console.log('MISMATCH',d.date,tot,d.min)}}});
console.log('mismatches',bad);
console.log(JSON.stringify(P.stats));
