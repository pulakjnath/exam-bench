/* ===== Engine: pure planning logic ===== */
const E=(function(){
const pad=n=>String(n).padStart(2,'0');
const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const parse=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2],12)};
const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return iso(d)};
const diffDays=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const dowMon=s=>(parse(s).getDay()+6)%7;
const WD=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const MN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmtDate=s=>{const d=parse(s);return WD[dowMon(s)]+' '+d.getDate()+' '+MN[d.getMonth()]};
const shortDate=s=>{const d=parse(s);return d.getDate()+' '+MN[d.getMonth()]};
const tmin=t=>{const a=(t||'21:30').split(':').map(Number);return (a[0]||0)*60+(a[1]||0)};
const fmtTime=m=>{m=((Math.round(m)%1440)+1440)%1440;const h=Math.floor(m/60),mm=m%60;return ((h%12)||12)+':'+pad(mm)+' '+(h<12?'am':'pm')};
const RF={weak:1.5,okay:1,strong:.7}, WF={1:.8,2:1,3:1.3};
const BRK=['Drink water, stand up and stretch your neck and wrists.','Walk to a window and look at something far away.','Eat a light snack: fruit or nuts.','Take 20 slow breaths, then walk around the room.','Step outside or onto the balcony for fresh air.'];
const nq=n=>n+' question'+(n===1?'':'s');
const r5=x=>Math.max(5,Math.round(x/5)*5);

function layout(M,brk){
  if(M<45) return null;
  const big=M>=105,S0=big?10:5,LOG=big?10:5,SH=5,minR=big?20:10;
  const n=Math.max(1,Math.floor((M-S0-LOG-SH-minR)/(50+brk)));
  let L=50,free=M-S0-LOG-SH-minR-n*(L+brk);
  if(free<0){
    L=Math.floor((M-S0-LOG-SH-minR-n*brk)/n);
    if(L<20) return {S0,LOG,SH,n:1,L:Math.max(10,M-S0-LOG-SH-minR),R:minR,brk:0};
    free=M-S0-LOG-SH-minR-n*(L+brk);
  }
  const g=Math.min(10,Math.floor(free/n/5)*5);L+=g;free-=g*n;
  return {S0,LOG,SH,n,L,R:minR+free,brk};
}

function buildPlan(S){
  const st=S.settings,subs=S.subjects.filter(s=>s.name&&s.name.trim());
  const warnings=[];
  const none=m=>({days:[],warnings:[m],stats:{},empty:true,subs});
  if(!subs.length) return none('Add at least one subject in Setup to build a plan.');
  const ex=s=>s.examDate||st.examDate;
  if(!subs.every(ex)) return none('Set your first exam date in Setup.');
  const lastExam=subs.map(ex).sort().pop();
  const start=st.startDate,endDate=addDays(lastExam,-1),n=diffDays(start,endDate)+1;
  if(n<1) return none('Your start date is on or after the last exam. Change the dates in Setup.');
  const days=[];
  for(let i=0;i<n;i++){
    const date=addDays(start,i),dow=dowMon(date),m=Math.round((+st.hours[dow]||0)*60);
    days.push({i,date,dow,min:m,buffer:dow===st.bufferDay&&m>0,rows:[],out:[],exams:subs.filter(s=>ex(s)===date).map(s=>s.name),phase:m>0?(dow===st.bufferDay?'buffer':''):'rest',headline:[]});
  }
  const kc={};
  const mk=(day,kind,dur,title,o)=>{o=o||{};const k=day.date+'|'+kind;kc[k]=(kc[k]||0)+1;
    return Object.assign({id:day.date+'|'+kind+'|'+(o.ref||kc[k]),kind,dur,title},o)};

  /* tasks: assignments, lab records, projects */
  const sepBy={},shBy={},shLoad={},sepLoad={};let sepTotal=0;
  const modeOf=t=>t.mode==='separate'||t.mode==='shared'?t.mode:(t.type==='lab'?'separate':'shared');
  for(const t of S.tasks){
    const rem=Math.max(0,(+t.totalMin||0)-(S.taskDone[t.id]||0));if(!rem) continue;
    const mode=modeOf(t),cm=Math.max(10,Math.min(+t.chunkMin||60,mode==='shared'?90:180));
    const lens=[];for(let r=rem;r>0;r-=cm) lens.push(Math.min(cm,r));
    let endIdx=t.due?diffDays(start,t.due)-1:n-1;
    if(t.due&&t.due<=start){endIdx=0;warnings.push('"'+t.title+'" is due on or before the first plan day, so it is placed on day 1.')}
    endIdx=Math.max(0,Math.min(endIdx,n-1));
    const placed=[],per={};let left=lens.length;
    for(let pass=1;pass<=3&&left>0;pass++)for(let i=endIdx;i>=0&&left>0;i--){
      const d=days[i];
      while(left>0&&(per[i]||0)<pass){
        const len=lens[left-1];
        if(mode==='shared'){
          if(d.min<60) break;
          const cap=d.buffer?.6*d.min:.4*d.min;
          if(pass<3&&(shLoad[d.date]||0)+len>Math.max(cap,len)) break;
          shLoad[d.date]=(shLoad[d.date]||0)+len;
        }else{
          if(pass<3&&(sepLoad[d.date]||0)+len>120) break;
          sepLoad[d.date]=(sepLoad[d.date]||0)+len;
        }
        placed.push({i,len,shared:mode==='shared'});per[i]=(per[i]||0)+1;left--;
      }
    }
    if(left>0){
      warnings.push('"'+t.title+'" does not fully fit before its due date. Add study time or move the due date.');
      while(left>0){placed.push({i:0,len:lens[left-1],shared:false});left--}
    }
    placed.sort((a,b)=>a.i-b.i);
    placed.forEach((p,k)=>{
      const rec={t,len:p.len,k:k+1,of:placed.length},d=days[p.i].date;
      const bag=p.shared?shBy:sepBy;(bag[d]=bag[d]||[]).push(rec);
    });
  }

  /* subjects */
  const queues={},pool={},ptr={},last={},stats={};
  const topicsOf=s=>s.topics.map(x=>x.trim()).filter(Boolean);
  subs.forEach(s=>{
    const tp=topicsOf(s);
    queues[s.id]=tp.filter(x=>!S.coveredBase[s.id+'|'+x]);
    pool[s.id]=tp.filter(x=>S.coveredBase[s.id+'|'+x]);
    ptr[s.id]=0;last[s.id]=-99;stats[s.id]={cover:0,practice:0,review:0,work:0};
  });
  const reviewQ=[],OFFS=[1,3,7,14];
  const addRev=(s,topic,cdate)=>OFFS.forEach(o=>{const due=addDays(cdate,o);if(due>=start&&due<=endDate) reviewQ.push({s,topic,due,off:o})});
  subs.forEach(s=>topicsOf(s).forEach(x=>{const c=S.coveredBase[s.id+'|'+x];if(c) addRev(s,x,c)}));
  const poolOf=s=>pool[s.id].length?pool[s.id]:topicsOf(s);
  const qUsage={},topicUsage={};
  const qKey=q=>q.id||(q.text+'|'+(q.topic||''));
  const qtypeOf=q=>(q.qtype==='numerical'?'numerical':'descriptive');
  const nk=x=>String(x||'').toLowerCase().replace(/[^a-z0-9 ]+/g,' ').replace(/\s+/g,' ').trim();
  const bankOf=s=>(s.questions||[]).filter(q=>q&&q.text);
  /* take questions for maximum coverage: complete bank rotation, broad topic coverage, and balanced numerical vs descriptive types. */
  const takeQ=(s,budget,easyFirst)=>{
    const all=bankOf(s);if(!all.length) return null;
    const cov=new Set([...topicsOf(s).filter(x=>S.coveredBase[s.id+'|'+x]),...(pool[s.id]||[])].map(nk));
    const covered=q=>!q.topic||[...cov].some(c=>c&&(c===nk(q.topic)||c.indexOf(nk(q.topic))>=0||nk(q.topic).indexOf(c)>=0));
    let cand=all.filter(covered);if(!cand.length) cand=all.slice();
    const out=[];let sum=0,nNum=0,nDesc=0;
    const avail=cand.slice();
    while(avail.length){
      const hasNum=avail.some(q=>qtypeOf(q)==='numerical'),hasDesc=avail.some(q=>qtypeOf(q)==='descriptive');
      const prefType=hasNum&&hasDesc?(nNum<=nDesc?'numerical':'descriptive'):null;
      avail.sort((a,b)=>{
        const uA=qUsage[qKey(a)]||0,uB=qUsage[qKey(b)]||0;
        if(uA!==uB) return uA-uB;
        const tA=topicUsage[s.id+'|'+(a.topic||'')]||0,tB=topicUsage[s.id+'|'+(b.topic||'')]||0;
        if(tA!==tB) return tA-tB;
        if(prefType){
          const pA=qtypeOf(a)===prefType?0:1,pB=qtypeOf(b)===prefType?0:1;
          if(pA!==pB) return pA-pB;
        }
        return (a.diff||2)-(b.diff||2);
      });
      let idx=-1;
      for(let i=0;i<avail.length;i++){
        const m=Math.max(2,+avail[i].min||8);
        if(out.length&&sum+m>budget*1.15) continue;
        idx=i;break;
      }
      if(idx<0) break;
      const q=avail.splice(idx,1)[0],m=Math.max(2,+q.min||8);
      out.push(q);sum+=m;
      if(qtypeOf(q)==='numerical') nNum++;else nDesc++;
      if(sum>=budget*.85) break;
    }
    if(!out.length&&cand.length){out.push(cand[0]);sum+=Math.max(2,+cand[0].min||8)}
    out.forEach(q=>{
      qUsage[qKey(q)]=(qUsage[qKey(q)]||0)+1;
      topicUsage[s.id+'|'+(q.topic||'')]=(topicUsage[s.id+'|'+(q.topic||'')]||0)+1;
    });
    if(easyFirst) out.sort((a,b)=>(a.diff||2)-(b.diff||2));
    return {qs:out,sum};
  };
  const qline=q=>({m:'~'+Math.max(2,+q.min||8)+'m',text:q.text+' ('+qtypeOf(q)+' · '+['','easy','medium','hard'][q.diff||2]+(q.marks?', '+q.marks+' marks':'')+')'});
  const pending=()=>subs.reduce((a,s)=>a+queues[s.id].length,0);
  const units=()=>subs.reduce((a,s)=>a+(s.kind==='lab'?Math.ceil(queues[s.id].length/2):queues[s.id].length),0);

  const study=days.filter(d=>d.min>0&&!d.buffer),D=study.length;
  const examStart=D>=10?Math.floor(D*.8):Math.max(0,D-2),coverEnd=Math.max(1,Math.floor(D*.7));
  const urg=(s,date)=>{const dl=diffDays(date,ex(s));return dl<=2?3:dl<=5?2:dl<=9?1.4:1};
  const sc=(s,date)=>RF[s.rating]*WF[s.weight||2]*urg(s,date);
  const pick=(list,date,used,day)=>list.map(s=>({s,v:sc(s,date)*(1+Math.min(12,day.i-last[s.id])/12)*(used&&used.has(s.id)?.35:1)})).sort((a,b)=>b.v-a.v).map(x=>x.s);
  let pi=0,vi=0,bi=0,studyK=0,prevTopics='',compressWarned=false;

  for(const day of days){
    const date=day.date,A=subs.filter(s=>ex(s)>date);
    for(let q=reviewQ.length-1;q>=0;q--) if(ex(reviewQ[q].s)<=date) reviewQ.splice(q,1);
    const slotOf=c=>tmin(c.t.slot||'17:00');
    (sepBy[date]||[]).forEach(c=>{
      const r=mk(day,'task',c.len,c.t.title,{ref:c.t.id+'|'+c.k,out:true,start:slotOf(c),subj:c.t.subjectId||null,task:c.t.id,
        how:c.t.type==='lab'?'labrecord':'assignment',
        detail:(c.t.type==='lab'?'Own slot, outside your study window. ':'Own slot, outside your study window. ')+'Part '+c.k+' of '+c.of+'.'});
      day.out.push(r);sepTotal+=c.len;
    });
    if(!(day.min>0)||!A.length) continue;
    const shared=shBy[date]||[],sharedMin=shared.reduce((a,c)=>a+c.len,0),M=Math.max(0,day.min-sharedMin);
    if(day.buffer&&subs.every(s=>!pool[s.id].length)){day.buffer=false;day.phase=''}
    const isStudy=!day.buffer;
    let phase='buffer';
    if(isStudy){
      phase=studyK>=examStart?'exam':(pending()>0?'cover':'practice');
      day.phase=phase;if(study.indexOf(day)>=0) studyK++;
    }
    const win=[],brkT=st.breakMin;
    const brkRow=()=>mk(day,'break',brkT,'Break',{detail:BRK[bi++%BRK.length],how:'break'});
    const setupRow=dur=>mk(day,'setup',dur,'Setup + recall',{how:'setup',detail:'Phone in another room, water ready. On a blank page, with no notes, write what you remember from '+(prevTopics||'your last session')+'. Check it, then circle the gaps.'});
    const logRow=dur=>mk(day,'log',dur,'Error log',{how:'log',detail:'Write each mistake from today: the question, the cause (concept, calculation, silly mistake, time) and the correct method in one line.'});
    const shutRow=()=>mk(day,'shutdown',5,'Shutdown',{how:'shutdown',detail:'Write tomorrow\'s first task on a sticky note. Phone stays away. Lights out by '+fmtTime(tmin(st.lightsOut))+'.'});
    const sharedRows=()=>shared.map(c=>{
      if(c.t.subjectId&&stats[c.t.subjectId]) stats[c.t.subjectId].work+=c.len;
      return mk(day,'task',c.len,c.t.title,{ref:c.t.id+'|'+c.k,subj:c.t.subjectId||null,task:c.t.id,how:c.t.type==='lab'?'labrecord':'assignment',
        detail:'Inside your study window. Part '+c.k+' of '+c.of+'.'+(c.t.type==='lab'?'':' It counts as practice for this subject.')});
    });
    const reviewRow=(dur,title)=>{
      const cap=Math.max(1,Math.floor(dur/6));
      const due=reviewQ.filter(x=>x.due<=date).sort((a,b)=>a.due<b.due?-1:a.due>b.due?1:a.off-b.off);
      const take=due.slice(0,cap);take.forEach(x=>reviewQ.splice(reviewQ.indexOf(x),1));
      take.forEach(x=>{stats[x.s.id].review+=6});
      return mk(day,'review',dur,title||'Spaced review',{how:'review',
        detail:take.length?'Quiz yourself closed book: write answers to 2 or 3 questions per topic, then check.':'Nothing is due today. Redo yesterday\'s error-log questions closed book instead.',
        sub:take.map(x=>({m:'+'+x.off+'d',text:'['+x.s.name+'] '+x.topic+(x.due<date?' (carried over)':'')}))});
    };
    const vivaRow=dur=>{
      const labs=A.filter(s=>s.kind==='lab');if(!labs.length) return null;
      const s=labs[vi++%labs.length],p=poolOf(s);
      return mk(day,'viva',dur,'Lab viva: '+s.name,{how:'viva',subj:s.id,detail:'Stand up and answer aloud: aim, apparatus, theory in two lines, procedure, observations, precautions, result and one real use.',
        sub:p.slice(0,3).map(x=>({m:'·',text:x}))});
    };
    const coverBlock=(L,usedSet)=>{
      const cand=A.filter(s=>queues[s.id].length);
      if(!cand.length) return practiceBlock(L,usedSet);
      const k=Math.max(0,studyK-1),horizonEnd=k<coverEnd?coverEnd:Math.max(k+1,examStart);
      const remBlocks=study.slice(k,Math.max(k+1,horizonEnd)).reduce((a,d)=>{const l=layout(d.min-(shLoad[d.date]||0),brkT);return a+(l?l.n:1)},0);
      const tpb=Math.min(3,Math.max(1,Math.ceil(units()/Math.max(1,remBlocks))));
      if(tpb>1&&!compressWarned&&units()>remBlocks*1.2){compressWarned=true;warnings.push('The syllabus is large for the time you have, so some study blocks cover '+tpb+' topics each. Add hours in Setup for deeper coverage.')}
      const s=cand.map(c=>({c,v:queues[c.id].length*sc(c,date)*(usedSet.has(c.id)?.35:1)})).sort((a,b)=>b.v-a.v)[0].c;
      usedSet.add(s.id);
      const take=s.kind==='lab'?(tpb>1?3:2):tpb;
      const topics=queues[s.id].splice(0,Math.min(take,queues[s.id].length));
      const sub=[];
      topics.forEach((tp,ti)=>{
        const share=ti<topics.length-1?Math.floor(L/topics.length):L-Math.floor(L/topics.length)*(topics.length-1);
        const big=share>=40,sk=big?r5(share*.2):Math.max(3,Math.round(share*.2)),nu=big?r5(share*.5):Math.max(3,Math.round(share*.5)),rc=Math.max(2,share-sk-nu);
        const lab=s.kind==='lab';
        sub.push({m:sk+'m',text:lab?'Read the procedure for "'+tp+'" and redraw the circuit or block diagram without looking.':'Skim your notes on "'+tp+'" once. Pen only, no highlighter.'});
        sub.push({m:nu+'m',text:lab?'Say the viva answers aloud: aim, apparatus, precautions, result, one real use.':'Solve '+Math.max(2,Math.round(nu/6))+' numericals on "'+tp+'". Cover the solution, attempt first, then check.'});
        sub.push({m:rc+'m',text:lab?'Write the observation table and name one source of error.':'Close everything. Write the key definitions, formulas and steps for "'+tp+'" from memory, then fix the gaps.'});
        pool[s.id].push(tp);addRev(s,tp,date);
      });
      stats[s.id].cover+=L;last[s.id]=day.i;
      day.headline.push(s.name+': '+topics.join(' + '));prevTopics=topics.join(' and ');
      return mk(day,'cover',L,s.name+': '+topics.join(' + '),{ref:s.id+'~'+topics[0],subj:s.id,how:'cover',sub,detail:s.kind==='lab'?'New experiment prep.':'New topic. Study it once, then test yourself.',cov:topics.map(x=>({s:s.id,t:x}))});
    };
    const practiceBlock=(L,usedSet)=>{
      const type=['interleaved','timed','interleaved','weakspot'][pi++%4];
      if(type==='timed') return timedBlock(L,usedSet,'Timed section');
      if(type==='weakspot'){
        const lead=pick(A,date,usedSet,day)[0];usedSet.add(lead.id);stats[lead.id].practice+=L;last[lead.id]=day.i;
        day.headline.push('Error-log redo');
        return mk(day,'weakspot',L,'Error-log redo',{how:'weakspot',subj:lead.id,detail:'Fix what you got wrong before adding anything new.',
          sub:[{m:r5(L*.6)+'m',text:'Redo every question in your error log from the last 3 days, closed book.'},{m:r5(L*.4)+'m',text:'Solve 3 fresh questions on the same topics to prove the fix holds.'}]});
      }
      const th=A.filter(s=>s.kind!=='lab'),cand=pick(th.length?th:A,date,usedSet,day).slice(0,3),m=cand.length;
      const q=Math.max(3,Math.round(L/5.5)),sub=[],ids=[];
      cand.forEach((s,k)=>{
        const tk=takeQ(s,L/m,false);
        if(tk&&tk.qs.length){tk.qs.forEach(x=>sub.push(Object.assign(qline(x),{text:s.name+' · '+qline(x).text})));stats[s.id].practice+=Math.round(L/m);last[s.id]=day.i;usedSet.add(s.id);ids.push(s.id);return}
        const p=poolOf(s),tp=p.length?p[ptr[s.id]++%p.length]:s.name,cnt=Math.floor(q/m)+(k<q%m?1:0);
        sub.push({m:Math.max(3,Math.round(L*cnt/q))+'m',text:s.name+' · '+tp+': '+nq(cnt)});
        stats[s.id].practice+=Math.round(L/m);last[s.id]=day.i;usedSet.add(s.id);ids.push(s.id);
      });
      sub.push({m:'',text:'Spend 10 seconds naming the topic and method before you solve each one. Cover solutions and check after every question.'});
      day.headline.push('Interleaved set');
      return mk(day,'interleaved',L,'Interleaved set',{how:'interleaved',subjs:ids,sub,detail:q+' questions, shuffled across subjects.'});
    };
    const timedBlock=(L,usedSet,label)=>{
      const th=A.filter(s=>s.kind!=='lab'),s=pick(th.length?th:A,date,usedSet,day)[0];
      usedSet.add(s.id);const k=Math.max(2,Math.round(L/16)),p=poolOf(s);
      stats[s.id].practice+=L;last[s.id]=day.i;day.headline.push((L>=90?'Half paper: ':'Timed: ')+s.name);
      const tk=takeQ(s,L,true);
      if(tk&&tk.qs.length) return mk(day,'timed',L,(L>=90?'Timed half paper':label)+': '+s.name,{how:'timed',subj:s.id,
        detail:'Closed book, written answers, real time limit. Time is split by each question\'s size. Stop when time is up.',
        sub:tk.qs.map(qline).concat([{m:'',text:'Easy ones first. If a question passes its time, mark it and move on.'}])});
      return mk(day,'timed',L,(L>=90?'Timed half paper':label)+': '+s.name,{how:'timed',subj:s.id,
        detail:'Closed book, written answers, real time limit. Stop when time is up.',
        sub:[{m:L+'m',text:'Do '+k+' questions from '+(s.pastPapers?'past papers':'your textbook in university style')+(p.length?' on topics such as '+p.slice(0,3).join(', '):'')+'. Easy ones first, mark the skipped ones.'}]});
    };
    const eveBlock=(L,s)=>{
      stats[s.id].practice+=L;last[s.id]=day.i;day.headline.push('Exam tomorrow: '+s.name);
      return mk(day,'eve',L,'Exam tomorrow: '+s.name,{how:'eve',subj:s.id,detail:'Light revision only. Do not start anything new.',
        sub:[{m:r5(L*.3)+'m',text:'Write the formula and concept sheet for '+s.name+' from memory, then check it.'},{m:r5(L*.4)+'m',text:'Redo the 6 hardest questions from your error log, closed book.'},{m:Math.max(5,L-r5(L*.3)-r5(L*.4))+'m',text:'Skim the topics that repeat most in past papers.'}]});
    };
    const light=()=>{
      const w=[];
      if(M>=15) w.push(reviewRow(M-5,'Short session: spaced review'));
      w.push(shutRow());w.forEach(r=>win.push(r));
    };

    if(day.buffer){
      const S0=5,T=Math.min(45,Math.max(10,Math.round(M*.3/5)*5)),LOG=15,SH=5,R=20,C=M-S0-T-brkT-LOG-SH-R;
      if(M<60||C<0) light();
      else{
        win.push(setupRow(S0));
        const th=A.filter(s=>s.kind!=='lab'),cand=pick(th.length?th:A,date,new Set(),day).slice(0,4),q=Math.max(4,Math.round(T/6));
        win.push(mk(day,'minitest',T,'Weekly mini-test',{how:'minitest',detail:'Closed book, mixed topics, timed. Mark it right after.',
          sub:cand.map((s,k)=>{const p=poolOf(s),tp=p.length?p[ptr[s.id]++%p.length]:s.name;last[s.id]=day.i;return {m:'·',text:s.name+' · '+tp+': '+nq(Math.floor(q/cand.length)+(k<q%cand.length?1:0))}})}));
        win.push(brkRow());
        if(C>=15) win.push(mk(day,'catchup',C,'Catch-up',{how:'catchup',dyn:'catchup',detail:'Finish what you skipped this week. Pick the highest-weight items first.'}));
        sharedRows().forEach(r=>win.push(r));
        win.push(reviewRow(C>=15?R:R+C));
        win.push(logRow(LOG));win[win.length-1].title='Weekly error-log review';win[win.length-1].detail='Reread every entry from this week. Redo the 5 hardest closed book.';
        win.push(shutRow());
        day.headline.push('Mini-test and catch-up');
      }
    }else{
      const eve=A.filter(s=>diffDays(date,ex(s))===1);
      const lay=layout(M,brkT);
      if(!lay) light();
      else if(phase==='exam'&&!eve.length&&M>=60){
        const S0=lay.S0,LOG=lay.LOG,SH=5,RR=M>=105?30:15,b=brkT;
        let T=M-S0-LOG-SH-b-RR;const extra=Math.max(0,T-150);T=Math.min(T,150);
        if(T<20) light();
        else{
          const used=new Set(),rrDur=RR+extra,v=(M>=105&&A.some(s=>s.kind==='lab')&&vi%2===0)?15:0;
          win.push(setupRow(S0));win[0].title='Setup + formula recall';win[0].detail='Phone away. On a blank page write the formula and concept sheet for today\'s paper subject from memory, then check it.';
          win.push(timedBlock(T,used,'Timed section'));win.push(brkRow());
          win.push(mk(day,'redo',rrDur-v,'Mark + redo',{how:'redo',detail:'Mark with a different pen. Label each lost mark: concept, calculation, silly mistake or time. Redo every lost question closed book until it is correct.'}));
          if(v){const vr=vivaRow(v);if(vr) win.push(vr);else win[win.length-1].dur+=v}
          sharedRows().forEach(r=>win.push(r));
          win.push(logRow(LOG));win.push(shutRow());
        }
      }else{
        const used=new Set();
        win.push(setupRow(lay.S0));
        for(let b=0;b<lay.n;b++){
          let r;
          if(eve[b]) r=eveBlock(lay.L,eve[b]);
          else if(phase==='cover') r=coverBlock(lay.L,used);
          else if(phase==='exam') r=timedBlock(lay.L,used,'Timed section');
          else r=practiceBlock(lay.L,used);
          win.push(r);if(lay.brk) win.push(brkRow());
        }
        sharedRows().forEach(r=>win.push(r));
        const doViva=lay.R>=35&&A.some(s=>s.kind==='lab')&&(studyK%3===0);
        const rv=doViva?15:0;
        win.push(reviewRow(lay.R-rv));
        if(doViva){const vr=vivaRow(rv);if(vr) win.push(vr);else win[win.length-1].dur+=rv}
        win.push(logRow(lay.LOG));win.push(shutRow());
      }
    }
    let t=tmin(st.startTime);
    win.forEach(r=>{r.start=t;t+=r.dur});
    day.rows=win;day.end=t;
  }

  const left=pending();
  if(left) warnings.push(left+' topic'+(left>1?'s':'')+' could not be scheduled before your exams. Add study hours or trim the topic list in Setup.');
  if(D<7) warnings.push('Only '+D+' study day'+(D===1?'':'s')+' before your exams. The plan is a short revision pass.');
  return {days,warnings,stats,subs,D,end:endDate,lastExam,n,sepTotal,firstExam:subs.map(ex).sort()[0]};
}
return {buildPlan,iso,parse,addDays,diffDays,dowMon,fmtDate,shortDate,fmtTime,tmin,WD,RF,WF};
})();
