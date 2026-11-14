/* ===== State, persistence, guide content ===== */
const $app=document.getElementById('app');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>'x'+Math.random().toString(36).slice(2,9);
const todayISO=()=>E.iso(new Date());
const KEY='exam-bench-v1';

const GUIDE={
  setup:{t:'Setup + recall',s:['Put your phone in another room, keep water ready and clear your desk.','On a blank page, with no notes, write everything you remember from the last session: definitions, formulas, steps.','Check against your notes with a different pen and circle what you missed. The circled items go into today\'s review.']},
  cover:{t:'Cover a new topic',s:['Skim once: read the headings, then each worked example. Use a pen, not a highlighter.','Cover the solution, read the question, name the method in one line, then attempt it on paper. If stuck for 5 minutes, look only at the first step of the solution and continue alone.','Close everything and write the key definitions, formulas and steps from memory. Check with a different pen and fix every gap.','Add every miss to your error log.']},
  interleaved:{t:'Interleaved set',s:['Take questions from different topics and subjects and shuffle them. Do not do one topic at a time.','Before solving, spend 10 seconds naming the topic and method.','Solve, then check each answer before the next question. It feels slower than doing one topic at a time. That is normal: it trains you to pick the right method, which is what the exam asks.']},
  timed:{t:'Timed paper or section',s:['Closed book, written answers, real time limit. Stop when time is up, even if unfinished.','Do the easiest questions first and mark the ones you skipped.','No pausing and no peeking at notes. Marking happens afterwards.']},
  weakspot:{t:'Error-log redo',s:['Open your error log and take the entries from the last 3 days.','Redo each question closed book. If it is wrong again, rewrite the method in one line.','Solve 3 fresh questions on the same topics to prove the fix holds.']},
  review:{t:'Spaced review',s:['Review by quizzing, not by reading.','Turn each due topic into 2 or 3 questions from your notes and answer them closed book.','Check the answers. Anything missed moves into tomorrow\'s review automatically if you re-plan, or into your error log.']},
  redo:{t:'Mark + redo',s:['Mark with a different pen, giving marks as an examiner would.','Label each lost mark: concept, calculation, silly mistake or time.','Redo every lost question closed book until it is fully correct. Redo it again a week later.']},
  viva:{t:'Lab viva',s:['Stand up and answer aloud: aim, apparatus, theory in two lines, procedure, observations, precautions, result and one real use.','Note every question you hesitated on and repeat those tomorrow.']},
  minitest:{t:'Weekly mini-test',s:['Closed book and timed. Questions come from this week\'s topics, mixed.','Mark it straight away with a different pen.','Every lost mark goes into the error log with its cause.']},
  catchup:{t:'Catch-up',s:['List what you skipped this week. The app shows unticked items above.','Do the highest-weight items first. Drop the lowest-weight topic if time runs out, then re-plan.']},
  eve:{t:'Exam tomorrow',s:['Light revision only. Nothing new tonight.','Write the formula and concept sheet from memory, then check it.','Redo the hardest error-log questions, closed book, and skim the topics that repeat in past papers.','Stop on time and sleep. Sleep is part of the plan.']},
  log:{t:'Error log',s:['Write one row per mistake: the question, the cause (concept, calculation, silly mistake, time) and the correct method in one line.','Redo each entry the next day and again a week later.']},
  labrecord:{t:'Write the lab record',s:['Do one experiment per sitting, in a low-focus slot so it does not use your peak study time.','Copy from your own lab sheet and observation table, in this order: aim, apparatus, circuit or diagram, procedure, observations, calculations, result, precautions.','Draw circuits in pencil first, then ink them.','Before closing the file, say 3 viva questions for this experiment aloud: aim, one precaution, one source of error.']},
  assignment:{t:'Do an assignment',s:['Attempt every question closed book on rough paper first. This is the practice part.','Check against your notes or the solution, fix mistakes and add each miss to the error log.','Write the neat copy only after that, and copy only verified answers.','Before submitting, check name, date, question numbers and page order, then photograph the pages as a backup.']},
  break:{t:'Break',s:['Set a timer. Drink water, stand, stretch, look at something far away, walk around.','No phone, no videos, no new tasks. A break that includes a screen is not a break.']},
  shutdown:{t:'Shutdown',s:['Write tomorrow\'s first task on a sticky note: subject, topic, question numbers.','Phone stays away. Lights out on time.']}
};
const GUIDE_ORDER=['cover','interleaved','timed','weakspot','review','redo','viva','minitest','catchup','eve','log','labrecord','assignment','setup','break','shutdown'];

function defaultSettings(start,exam){
  return {startDate:start,examDate:exam,startTime:'21:30',lightsOut:'01:00',hours:[3,3,3,3,3,3,2],bufferDay:6,breakMin:10};
}
function makeSample(){
  const start=todayISO(),A=n=>E.addDays(start,n);
  const S=(name,kind,rating,weight,pp,topics)=>({id:uid(),name,kind,rating,weight,pastPapers:pp,examDate:'',topics});
  const ss=S('Signals & Systems','theory','weak',3,true,['Basic signals and classification','LTI systems and convolution','Fourier series','Fourier transform','Laplace transform','Z-transform','Sampling']);
  const mt=S('Engineering Mathematics','theory','okay',2,false,['Matrices and eigenvalues','Differential equations','Partial derivatives','Multiple integrals','Vector calculus']);
  const nt=S('Network Theory','theory','okay',2,true,['Mesh and nodal analysis','Network theorems','Transient response','Resonance','Two-port networks','Passive filters']);
  const ed=S('Electronic Devices and Circuits','theory','okay',2,true,['PN junction diode','BJT biasing','BJT small-signal model','FET and MOSFET','Feedback amplifiers']);
  const de=S('Digital Electronics','theory','strong',2,true,['Boolean algebra and K-maps','Combinational circuits','Flip-flops','Counters and registers','Memories']);
  const em=S('EM Fields','theory','weak',3,true,['Vector analysis','Electrostatics and Gauss\'s law','Magnetostatics','Maxwell\'s equations','Wave propagation','Transmission lines']);
  const al=S('Analog Lab','lab','okay',1,false,['Diode characteristics','Rectifiers','BJT CE amplifier','Op-amp circuits','RC oscillator']);
  const dl=S('Digital Lab','lab','okay',1,false,['Logic gates','Adders and subtractors','Multiplexer','Flip-flops','Counters','Shift registers']);
  const T=(title,type,subj,total,chunk,due,mode)=>({id:uid(),title,type,subjectId:subj.id,totalMin:total,chunkMin:chunk,due,mode,slot:'17:00'});
  return {v:1,sample:true,updatedAt:0,settings:defaultSettings(start,A(31)),subjects:[ss,mt,nt,ed,de,em,al,dl],
    tasks:[T('Signals & Systems Assignment 2','assignment',ss,180,60,A(13),'hybrid'),T('Mathematics Assignment','assignment',mt,240,60,A(20),'hybrid'),
      T('Analog Lab record','lab',al,180,30,A(16),'hybrid'),T('Digital Lab record','lab',dl,240,30,A(23),'hybrid')],
    coveredBase:{},taskDone:{},done:{}};
}
function makeBlank(){const t=todayISO();return {v:1,sample:false,updatedAt:0,settings:defaultSettings(t,E.addDays(t,30)),subjects:[],tasks:[],coveredBase:{},taskDone:{},done:{}}}
function normalize(x){
  const b=makeBlank();x=x&&typeof x==='object'?x:b;
  x.settings=Object.assign(b.settings,x.settings||{});
  if(!Array.isArray(x.settings.hours)||x.settings.hours.length!==7) x.settings.hours=b.settings.hours;
  x.subjects=(x.subjects||[]).map(s=>{
    s=Object.assign({id:uid(),name:'',kind:'theory',rating:'okay',weight:2,pastPapers:false,examDate:'',topics:[],questions:[]},s);
    s.questions=(s.questions||[]).map(q=>{
      if(!q.qtype){
        const isNum=/(calculate|find|compute|determine|evaluate|solve|design|derive|impedance|voltage|current|transfer function|fourier|bode)\b/i.test(q.text||'');
        q.qtype=isNum?'numerical':'descriptive';
      }
      return q;
    });
    return s;
  });
  x.tasks=(x.tasks||[]).map(t=>Object.assign({id:uid(),title:'',type:'assignment',subjectId:'',totalMin:60,chunkMin:60,due:'',mode:'hybrid',slot:'17:00'},t));
  x.coveredBase=x.coveredBase||{};x.taskDone=x.taskDone||{};x.done=x.done||{};x.updatedAt=+x.updatedAt||0;x.sample=!!x.sample;
  return x;
}

/* ---- persistence: account store when available, this device otherwise ---- */
let S=null,db=null,userId=null,docRef=null,saveTimer=null,saving=false,again=false,storeMode='device',dl=null;
function loadLocal(){try{const r=localStorage.getItem(KEY);return r?normalize(JSON.parse(r)):null}catch(e){return null}}
function writeLocal(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}
function setStatus(t){const el=document.getElementById('savestate');if(el) el.textContent=t}
function statusText(){return storeMode==='account'?'Saved to your account':'Saved on this device'}
function touch(){S.updatedAt=Date.now();planDirty=true;writeLocal();setStatus('Saving…');clearTimeout(saveTimer);saveTimer=setTimeout(flush,700)}
async function flush(){
  if(!docRef){setStatus(statusText());return}
  if(saving){again=true;return}
  saving=true;
  try{await docRef.set({json:JSON.stringify(S),updatedAt:S.updatedAt});storeMode='account';setStatus(statusText())}
  catch(e){storeMode='device';setStatus('Saved on this device only')}
  saving=false;if(again){again=false;flush()}
}
async function initCaps(){
  const use=window.claude&&typeof window.claude.use==='function'?window.claude.use.bind(window.claude):null;
  if(!use) return;
  try{const u=await use('user');userId=u?await u.id():null}catch(e){}
  try{db=await use('db')}catch(e){}
  try{dl=await use('downloads');if(dl) render()}catch(e){}
  if(db&&userId){
    docRef=db.collection('data/users/'+userId).doc('state');
    docRef.onSnapshot(snap=>{
      if(snap.metadata&&snap.metadata.hasPendingWrites) return;
      const d=snap.exists?snap.data():null;
      if(d&&d.json){
        let r=null;try{r=normalize(JSON.parse(d.json))}catch(e){}
        if(r&&(r.updatedAt>S.updatedAt||(S.sample&&!r.sample&&r.updatedAt>0))){S=r;writeLocal();planDirty=true;storeMode='account';setStatus(statusText());render();return}
        if(S.updatedAt>(d.updatedAt||0)&&!(snap.metadata&&snap.metadata.fromCache)){storeMode='account';flush()}
        else{storeMode='account';setStatus(statusText())}
      }else if(!(snap.metadata&&snap.metadata.fromCache)){
        storeMode='account';if(!S.sample&&S.updatedAt>0) flush();else setStatus(statusText());
      }
    },()=>{storeMode='device';setStatus('Saved on this device')});
  }
}

/* ---- plan memo + helpers ---- */
let plan=null,planDirty=true;
function getPlan(){if(planDirty||!plan){plan=E.buildPlan(S);planDirty=false}return plan}
const subjIdx=id=>S.subjects.findIndex(s=>s.id===id);
const col=id=>{const i=subjIdx(id);return i<0?'var(--ink2)':'var(--c'+(i%10)+')'};
const subjName=id=>{const s=S.subjects.find(x=>x.id===id);return s?s.name:''};
const COUNT_SKIP={break:1,setup:1,log:1,shutdown:1};
const countable=r=>!COUNT_SKIP[r.kind];
function dayRows(d){
  const ws=E.tmin(S.settings.startTime);
  const pre=d.out.filter(r=>r.start<ws),post=d.out.filter(r=>r.start>=ws);
  return pre.concat(d.rows,post);
}
function taskProgress(t,P){
  let done=S.taskDone[t.id]||0;
  P.days.forEach(d=>d.rows.concat(d.out).forEach(r=>{if(r.task===t.id&&S.done[r.id]) done+=r.dur}));
  return Math.min(done,t.totalMin);
}
function toast(msg){
  let el=document.getElementById('toast');
  if(!el){el=document.createElement('div');el.id='toast';el.className='toast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.textContent=msg;el.classList.add('on');clearTimeout(el._t);el._t=setTimeout(()=>el.classList.remove('on'),2600);
}
