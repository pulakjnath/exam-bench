/* ===== Views ===== */
let route='today',viewDate=null,openHow={},editTask=null,confirmKey=null;
const ROUTES=['today','plan','tasks','setup','guide'];
const IC={
  today:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  plan:'<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>',
  tasks:'<svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>',
  setup:'<svg viewBox="0 0 24 24"><path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></svg>',
  guide:'<svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2zM4 21V5"/><path d="M9 8h6"/></svg>'
};
const TABS=[['today','Today'],['plan','Plan'],['tasks','Tasks'],['setup','Setup'],['guide','Guide']];
const PHASE={cover:'Cover',practice:'Practice',exam:'Exam phase',buffer:'Buffer day',rest:'Rest day'};
const phaseChip=p=>p?'<span class="chip ph-'+esc(p)+'">'+esc(PHASE[p]||p)+'</span>':'';
const plural=(n,w)=>n+' '+w+(n===1?'':'s');
const hrs=m=>{const h=m/60;return (Math.round(h*10)/10)+' h'};

function header(){
  return '<header class="top"><div class="brand"><span class="bands"><i></i><i></i><i></i><i></i></span>Exam Bench</div><div class="grow"></div><span class="savestate" id="savestate">'+esc(statusText())+'</span></header>'+
  '<nav class="tabs" aria-label="Sections">'+TABS.map(t=>'<a href="#'+t[0]+'"'+(route===t[0]?' aria-current="page"':'')+'>'+IC[t[0]]+'<span>'+t[1]+'</span></a>').join('')+'</nav>';
}
function emptyPanel(msg,btn){
  return '<div class="empty" style="margin-top:20px"><p>'+esc(msg)+'</p>'+(btn?'<p style="margin-top:12px"><a class="btn pri" href="#setup" style="text-decoration:none;display:inline-block">'+esc(btn)+'</a></p>':'')+'</div>';
}
function sampleBanner(){
  return S.sample?'<div class="notice info" style="margin:12px 0"><div class="grow"><strong>This is an example plan.</strong> The subjects, topics and deadlines are made up so you can see how it works.</div><button class="btn pri" data-act="startblank">Start with my subjects</button></div>':'';
}

/* ---- Today ---- */
function rowHTML(r,d,P){
  const done=!!S.done[r.id],brk=r.kind==='break',how=r.how&&GUIDE[r.how];
  const ids=r.subjs||(r.subj?[r.subj]:[]);
  const bands=ids.map(id=>'<span class="band" style="background:'+col(id)+'"></span>').join('');
  const dot=ids.length?col(ids[0]):'var(--ink)';
  let sub='';
  if(r.sub&&r.sub.length) sub='<ul class="sub">'+r.sub.map(x=>'<li><span class="m">'+esc(x.m)+'</span><span>'+esc(x.text)+'</span></li>').join('')+'</ul>';
  if(r.dyn==='catchup'){
    const lo=E.addDays(d.date,-6),miss=[];
    P.days.forEach(x=>{if(x.date<d.date&&x.date>=lo) dayRows(x).forEach(y=>{if(countable(y)&&!S.done[y.id]) miss.push({date:x.date,title:y.title})})});
    sub='<ul class="sub">'+(miss.length?miss.slice(0,8).map(m=>'<li><span class="m">'+esc(E.shortDate(m.date))+'</span><span>'+esc(m.title)+'</span></li>').join('')+(miss.length>8?'<li><span class="m">+'+(miss.length-8)+'</span><span>more unticked items from this week</span></li>':''):'<li><span class="m">·</span><span>Nothing is waiting. Use the time for extra practice on your weakest subject.</span></li>')+'</ul>';
  }
  const howBox=openHow[r.id]&&how?'<div class="how"><strong>'+esc(how.t)+'</strong><ol>'+how.s.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div>':'';
  const acts=brk?'':'<div class="acts"><label class="chk"><input type="checkbox" data-chg="tick" data-rid="'+esc(r.id)+'"'+(done?' checked':'')+'><span>Done</span></label>'+(how?'<button class="btn sm ghost" data-act="how" data-rid="'+esc(r.id)+'" aria-expanded="'+(!!openHow[r.id])+'">How to do it</button>':'')+(r.out?'<span class="chip">Own slot</span>':'')+'</div>';
  return '<li class="'+(brk?'brk ':'')+(done?'done ':'')+(r.out?'out':'')+'"><div class="t">'+E.fmtTime(r.start).replace(' ','&nbsp;')+'</div><div class="rail"><span class="dot" style="border-color:'+dot+'"></span></div>'+
    '<div class="card"><div class="head"><div class="ttl">'+bands+esc(r.title)+'</div><div class="dur">'+r.dur+' min</div></div>'+
    (r.detail?'<div class="detail">'+esc(r.detail)+'</div>':'')+sub+acts+howBox+'</div></li>';
}
function viewToday(){
  const P=getPlan();
  if(P.empty) return sampleBanner()+emptyPanel(P.warnings[0],'Open Setup');
  const t=todayISO(),start=P.days[0].date,end=P.days[P.days.length-1].date;
  if(!viewDate||viewDate<start||viewDate>end) viewDate=t<start?start:(t>end?end:t);
  const d=P.days.find(x=>x.date===viewDate),rows=dayRows(d);
  const toExam=E.diffDays(t,P.firstExam);
  const examTxt=toExam>0?plural(toExam,'day')+' to your first exam':(toExam===0?'Your first exam is today':'Exams are under way');
  let missed=0;
  if(!S.sample&&t>start) P.days.forEach(x=>{if(x.date<t) dayRows(x).forEach(r=>{if(countable(r)&&!S.done[r.id]) missed++})});
  const cnt=rows.filter(countable),dn=cnt.filter(r=>S.done[r.id]).length;
  let h='<div class="hero"><div><div class="daynum">DAY '+(d.i+1)+'<small>/ '+P.n+'</small></div></div><div class="stack" style="gap:6px"><div style="font:700 1.25rem var(--font-body)">'+esc(E.fmtDate(d.date))+(d.date===t?' · today':'')+'</div><div class="row" style="gap:8px">'+phaseChip(d.phase)+'<span class="muted small">'+esc(examTxt)+'</span></div></div><div class="grow"></div>'+
    '<div class="row" style="gap:6px"><button class="btn sm" data-act="day" data-v="-1"'+(d.i===0?' disabled':'')+' aria-label="Previous day">&larr;</button><button class="btn sm" data-act="jump">Today</button><button class="btn sm" data-act="day" data-v="1"'+(d.i===P.n-1?' disabled':'')+' aria-label="Next day">&rarr;</button></div></div>';
  h+='<div class="dayrail" role="img" aria-label="Plan timeline, day '+(d.i+1)+' of '+P.n+'">'+P.days.map(x=>'<i class="'+(x.phase&&x.phase!=='rest'?'ph-'+x.phase:'')+(x.date<t?' past':'')+(x.date===viewDate?' cur':'')+(x.exams.length?' ex':'')+'" title="'+esc(E.fmtDate(x.date))+'"></i>').join('')+'</div>';
  h+='<div class="legend" style="margin:8px 0 14px"><span style="--lc:var(--ph-cover)">Cover</span><span style="--lc:var(--ph-practice)">Practice</span><span style="--lc:var(--ph-exam)">Exam phase</span><span style="--lc:var(--ph-buffer)">Buffer day</span></div>';
  h+=sampleBanner();
  if(t<start) h+='<div class="notice info" style="margin-bottom:12px">Your plan starts in '+plural(E.diffDays(t,start),'day')+', on '+esc(E.fmtDate(start))+'.</div>';
  if(t>end&&!S.sample) h+='<div class="notice info" style="margin-bottom:12px">Your plan ended on '+esc(E.fmtDate(end))+'.</div>';
  if(missed>0) h+='<div class="notice" style="margin-bottom:12px"><div class="grow"><strong>'+plural(missed,'task')+' from earlier days '+(missed===1?'is':'are')+' not ticked.</strong> Re-plan to spread them over the days you have left. Ticked topics are kept as covered.</div><button class="btn pri" data-act="replan">Re-plan from today</button></div>';
  if(P.warnings.length) h+='<div class="notice bad" style="margin-bottom:12px"><div class="grow">'+plural(P.warnings.length,'planning warning')+'. <a href="#plan">See the Plan tab</a>.</div></div>';
  if(d.exams.length) h+='<div class="notice bad" style="margin-bottom:12px"><strong>Exam today:</strong>&nbsp;'+esc(d.exams.join(', '))+'</div>';
  let main;
  if(!rows.length) main='<div class="empty">'+(d.phase==='rest'?'Rest day. No study window is set for this weekday.':'Nothing is scheduled for this day.')+'</div>';
  else main='<ol class="tl">'+rows.map(r=>rowHTML(r,d,P)).join('')+'</ol>';
  const dl_=S.tasks.filter(x=>x.title).slice().sort((a,b)=>(a.due||'9')<(b.due||'9')?-1:1);
  const side='<aside class="stack"><div class="panel"><h3>This day</h3><div class="prog'+(cnt.length&&dn===cnt.length?' ok':'')+'" style="margin:10px 0 6px"><b style="width:'+(cnt.length?Math.round(dn/cnt.length*100):0)+'%"></b></div><div class="small muted">'+dn+' of '+cnt.length+' tasks ticked</div>'+
    (d.min>0?'<div class="small" style="margin-top:10px">Study window <span class="mono">'+E.fmtTime(E.tmin(S.settings.startTime))+' to '+E.fmtTime(d.end||E.tmin(S.settings.startTime)+d.min)+'</span> ('+hrs(d.min)+')</div>':'')+'</div>'+
    '<div class="panel"><h3>Deadlines</h3><div class="stack" style="gap:12px;margin-top:10px">'+(dl_.length?dl_.map(x=>{const p=taskProgress(x,P),pc=Math.round(p/Math.max(1,x.totalMin)*100),dd=x.due?E.diffDays(t,x.due):null;
      return '<div><div class="row" style="gap:6px;flex-wrap:nowrap"><span class="band" style="background:'+col(x.subjectId)+'"></span><strong style="flex:1;min-width:0;overflow-wrap:anywhere">'+esc(x.title)+'</strong></div><div class="prog'+(pc>=100?' ok':'')+'" style="margin:6px 0 3px"><b style="width:'+pc+'%"></b></div><div class="small muted">'+pc+'% done'+(x.due?' · due '+esc(E.shortDate(x.due))+(dd!==null&&dd>=0?' ('+dd+' d)':' (past)'):'')+'</div></div>'}).join(''):'<div class="small muted">No assignments or lab records yet. Add them in Tasks.</div>')+'</div></div>'+
    '<div class="panel"><h3>Exams</h3><div class="stack" style="gap:8px;margin-top:10px">'+P.subs.slice().sort((a,b)=>((a.examDate||S.settings.examDate)<(b.examDate||S.settings.examDate)?-1:1)).map(s=>{const ed=s.examDate||S.settings.examDate,n=E.diffDays(t,ed);return '<div class="row" style="gap:6px;flex-wrap:nowrap"><span class="band" style="background:'+col(s.id)+'"></span><span style="flex:1;min-width:0;overflow-wrap:anywhere">'+esc(s.name)+'</span><span class="mono small muted">'+esc(E.shortDate(ed))+(n>=0?' · '+n+'d':'')+'</span></div>'}).join('')+'</div></div></aside>';
  return h+'<div class="cols"><div>'+main+'</div>'+side+'</div>';
}

/* ---- Plan ---- */
function viewPlan(){
  const P=getPlan();
  if(P.empty) return sampleBanner()+emptyPanel(P.warnings[0],'Open Setup');
  const t=todayISO(),dueMap={};
  S.tasks.forEach(x=>{if(x.due) (dueMap[x.due]=dueMap[x.due]||[]).push(x.title)});
  let h=sampleBanner()+'<div class="hero" style="margin-bottom:6px"><h2>Plan</h2><div class="grow"></div>'+(dl?'<button class="btn sm" data-act="download">Download plan (.txt)</button>':'')+'</div>';
  h+=P.warnings.map(w=>'<div class="notice bad" style="margin-bottom:10px">'+esc(w)+'</div>').join('');
  h+='<div class="panel"><h3>Every day at a glance</h3><p class="small muted" style="margin:6px 0 12px">Tap a day to open it. '+plural(P.D,'study day')+', '+plural(P.n,'day')+' in total, ending the day before your last exam.</p><div class="cal">'+
    P.days.map(d=>{const dd=E.parse(d.date),fl=d.exams.length?'EXAM':(dueMap[d.date]?'DUE':'');
      return '<button class="'+(d.phase&&d.phase!=='rest'?'ph-'+d.phase:'')+(d.date===(viewDate||t)?' cur':'')+'" data-act="open" data-date="'+d.date+'" aria-label="'+esc(E.fmtDate(d.date))+(fl?', '+fl:'')+'"><span class="d">'+E.WD[d.dow]+'</span><span class="n">'+dd.getDate()+'</span><span class="pb"></span><span class="fl">'+fl+'</span></button>'}).join('')+'</div>'+
    '<div class="legend" style="margin-top:12px"><span style="--lc:var(--ph-cover)">Cover</span><span style="--lc:var(--ph-practice)">Practice</span><span style="--lc:var(--ph-exam)">Exam phase</span><span style="--lc:var(--ph-buffer)">Buffer day</span><span style="--lc:var(--line)">Rest day</span></div></div>';
  const mx=Math.max(1,...P.subs.map(s=>{const a=P.stats[s.id];return a.cover+a.practice+a.review+a.work}));
  h+='<div class="panel"><h3>Planned time per subject</h3><p class="small muted" style="margin:6px 0 12px">Hours inside your study window. Weak subjects and high-weight subjects get more.</p><div class="scroll"><table class="t"><thead><tr><th>Subject</th><th>Exam</th><th style="width:44%">Split</th><th>Hours</th></tr></thead><tbody>'+
    P.subs.map(s=>{const a=P.stats[s.id],tot=a.cover+a.practice+a.review+a.work,seg=(v,c)=>'<i style="width:'+(v/mx*100)+'%;background:'+c+'"></i>';
      return '<tr><td><span class="band" style="background:'+col(s.id)+'"></span>'+esc(s.name)+'</td><td class="mono small">'+esc(E.shortDate(s.examDate||S.settings.examDate))+'</td><td><div class="bar" role="img" aria-label="'+esc(s.name)+': cover '+hrs(a.cover)+', practice '+hrs(a.practice)+', review '+hrs(a.review)+', assignments '+hrs(a.work)+'">'+seg(a.cover,'var(--ph-cover)')+seg(a.practice,'var(--ph-practice)')+seg(a.review,'var(--ph-buffer)')+seg(a.work,'var(--accent)')+'</div></td><td class="mono">'+hrs(tot)+'</td></tr>'}).join('')+
    '</tbody></table></div><div class="legend" style="margin-top:10px"><span style="--lc:var(--ph-cover)">New topics</span><span style="--lc:var(--ph-practice)">Practice and papers</span><span style="--lc:var(--ph-buffer)">Spaced review</span><span style="--lc:var(--accent)">Assignments inside the window</span></div>'+
    (P.sepTotal?'<p class="small muted" style="margin-top:10px">Another '+hrs(P.sepTotal)+' of lab records and similar work sits in its own slots outside the study window.</p>':'')+'</div>';
  h+='<div class="panel"><h3>Day by day</h3><div class="scroll" style="margin-top:8px"><table class="t"><thead><tr><th>Day</th><th>Date</th><th>Phase</th><th>Hours</th><th>Planned</th></tr></thead><tbody>'+
    P.days.map(d=>'<tr class="clk" data-act="open" data-date="'+d.date+'"><td class="mono">'+(d.i+1)+'</td><td>'+esc(E.fmtDate(d.date))+(d.exams.length?'<div class="small" style="color:var(--bad)">Exam: '+esc(d.exams.join(', '))+'</div>':'')+'</td><td>'+phaseChip(d.phase)+'</td><td class="mono">'+(d.min?hrs(d.min):'–')+'</td><td class="small">'+esc(d.headline.join(' · '))+(d.out.length?'<div class="muted">'+esc(d.out.map(r=>r.title).join(', '))+' (own slot)</div>':'')+'</td></tr>').join('')+
    '</tbody></table></div></div>';
  return h;
}

/* ---- Tasks ---- */
const TYPES={assignment:'Assignment',lab:'Lab record',project:'Project',other:'Other'};
function modeOf(t){return t.mode==='separate'||t.mode==='shared'?t.mode:(t.type==='lab'?'separate':'shared')}
function taskForm(t){
  const isNew=!S.tasks.some(x=>x.id===t.id);
  return '<div class="subj" style="margin-bottom:16px"><h3>'+(isNew?'New task':'Edit task')+'</h3><div class="grid2">'+
   '<label class="f">Name<input class="in" id="tk-title" value="'+esc(t.title)+'" placeholder="e.g. Network Theory record"></label>'+
   '<label class="f">Type<select class="in" id="tk-type">'+Object.keys(TYPES).map(k=>'<option value="'+k+'"'+(t.type===k?' selected':'')+'>'+TYPES[k]+'</option>').join('')+'</select></label>'+
   '<label class="f">Subject<select class="in" id="tk-subj"><option value="">No subject</option>'+S.subjects.map(s=>'<option value="'+s.id+'"'+(t.subjectId===s.id?' selected':'')+'>'+esc(s.name||'Untitled')+'</option>').join('')+'</select></label>'+
   '<label class="f">Due date<input class="in" type="date" id="tk-due" value="'+esc(t.due)+'"></label></div>'+
   '<div class="grid2"><label class="f">Total hours<input class="in" type="number" min="0" step="0.5" id="tk-hours" value="'+(t.items?'':Math.round(t.totalMin/6)/10)+'"></label>'+
   '<label class="f">Or: number of items<input class="in" type="number" min="0" step="1" id="tk-items" value="'+(t.items||'')+'" placeholder="e.g. 8 experiments"></label>'+
   '<label class="f">Minutes per item<input class="in" type="number" min="0" step="5" id="tk-per" value="'+(t.perItem||'')+'" placeholder="e.g. 30"></label>'+
   '<label class="f">Work in chunks of (minutes)<input class="in" type="number" min="10" step="5" id="tk-chunk" value="'+t.chunkMin+'"></label></div>'+
   '<div class="grid2"><label class="f">Where does the time come from?<select class="in" id="tk-mode"><option value="hybrid"'+(t.mode==='hybrid'?' selected':'')+'>Automatic: lab records in their own slot, the rest inside study time</option><option value="separate"'+(t.mode==='separate'?' selected':'')+'>Its own slot, outside study time</option><option value="shared"'+(t.mode==='shared'?' selected':'')+'>Inside study time</option></select></label>'+
   '<label class="f">Own-slot start time<input class="in" type="time" id="tk-slot" value="'+esc(t.slot||'17:00')+'"></label></div>'+
   '<div class="row"><button class="btn pri" data-act="savetask" data-tid="'+t.id+'">Save task</button><button class="btn" data-act="canceltask">Cancel</button></div></div>';
}
function viewTasks(){
  const P=getPlan();
  let h=sampleBanner()+'<div class="hero" style="margin-bottom:10px"><h2>Tasks</h2><div class="grow"></div><button class="btn pri" data-act="addtask">Add task</button></div>'+
    '<p class="muted" style="margin-bottom:14px;max-width:60ch">Assignments, lab records and projects. Each one is split into chunks and placed backward from its due date, with a spare day before it. Lab records go in their own slot by default so your study hours stay free.</p>';
  if(editTask) h+=taskForm(editTask);
  if(!S.tasks.length&&!editTask) h+='<div class="empty">No tasks yet. Add an assignment or a lab record and it will show up in your daily timeline.</div>';
  h+='<div class="stack">'+S.tasks.map(t=>{
    const p=P.empty?0:taskProgress(t,P),pc=Math.round(p/Math.max(1,t.totalMin)*100),m=modeOf(t),dd=t.due?E.diffDays(todayISO(),t.due):null;
    const parts=[];if(!P.empty) P.days.forEach(d=>d.rows.concat(d.out).forEach(r=>{if(r.task===t.id) parts.push({d:d.date,r})}));
    return '<div class="panel"><div class="row" style="flex-wrap:nowrap;align-items:flex-start"><span class="band" style="background:'+col(t.subjectId)+';height:22px"></span><div style="flex:1;min-width:0"><strong style="overflow-wrap:anywhere">'+esc(t.title||'Untitled')+'</strong><div class="row" style="gap:8px;margin-top:6px"><span class="chip">'+esc(TYPES[t.type]||t.type)+'</span><span class="chip">'+(m==='separate'?'Own slot':'Inside study time')+'</span>'+(t.subjectId?'<span class="small muted">'+esc(subjName(t.subjectId))+'</span>':'')+'</div></div><div class="mono small" style="text-align:right">'+hrs(t.totalMin)+(t.due?'<div class="muted">due '+esc(E.shortDate(t.due))+(dd!==null?(dd>=0?' · '+dd+'d':' · past'):'')+'</div>':'')+'</div></div>'+
      '<div class="prog'+(pc>=100?' ok':'')+'" style="margin:12px 0 4px"><b style="width:'+pc+'%"></b></div><div class="small muted">'+pc+'% done</div>'+
      (parts.length?'<div class="row" style="gap:6px;margin-top:10px">'+parts.map(x=>'<span class="chip" style="'+(S.done[x.r.id]?'background:var(--ok);color:var(--paper);border-color:var(--ok)':'')+'">'+esc(E.shortDate(x.d))+' · '+x.r.dur+'m</span>').join('')+'</div>':'')+
      '<div class="row" style="margin-top:12px"><button class="btn sm" data-act="edittask" data-tid="'+t.id+'">Edit</button><button class="btn sm ghost" data-act="deltask" data-tid="'+t.id+'">'+(confirmKey==='dt'+t.id?'Tap again to delete':'Delete')+'</button></div></div>'}).join('')+'</div>';
  return h;
}

/* ---- Setup ---- */
const qn=s=>(s.questions||[]).length,qmin=s=>(s.questions||[]).reduce((a,q)=>a+(+q.min||8),0);
const qnum=s=>(s.questions||[]).filter(q=>q.qtype==='numerical').length;
const qdesc=s=>(s.questions||[]).filter(q=>q.qtype!=='numerical').length;
function subjCard(s,i,n){
  const cnt=s.topics.map(x=>x.trim()).filter(Boolean).length;
  const seg=(v,l)=>'<button type="button" data-act="rate" data-sid="'+s.id+'" data-v="'+v+'" aria-pressed="'+(s.rating===v)+'">'+l+'</button>';
  return '<div class="subj"><div class="hd"><span class="band" style="background:var(--c'+(i%10)+';width:14px;height:28px"></span><input class="in" data-bind="subj" data-sid="'+s.id+'" data-f="name" value="'+esc(s.name)+'" placeholder="Subject name" aria-label="Subject name">'+
    '<button class="btn sm ghost" data-act="up" data-sid="'+s.id+'"'+(i===0?' disabled':'')+' aria-label="Move up">&uarr;</button><button class="btn sm ghost" data-act="down" data-sid="'+s.id+'"'+(i===n-1?' disabled':'')+' aria-label="Move down">&darr;</button>'+
    '<button class="btn sm ghost" data-act="delsub" data-sid="'+s.id+'">'+(confirmKey==='ds'+s.id?'Tap again':'Remove')+'</button></div>'+
    '<div class="grid2"><label class="f">Type<select class="in" data-bind="subj" data-sid="'+s.id+'" data-f="kind"><option value="theory"'+(s.kind==='theory'?' selected':'')+'>Theory</option><option value="lab"'+(s.kind==='lab'?' selected':'')+'>Lab or practical</option></select></label>'+
    '<div class="f">How strong are you?<div class="seg">'+seg('weak','Weak')+seg('okay','Okay')+seg('strong','Strong')+'</div></div>'+
    '<label class="f">Marks weight<select class="in" data-bind="subj" data-sid="'+s.id+'" data-f="weight"><option value="1"'+(+s.weight===1?' selected':'')+'>Low</option><option value="2"'+(+s.weight===2?' selected':'')+'>Normal</option><option value="3"'+(+s.weight===3?' selected':'')+'>High</option></select></label>'+
    '<label class="f">Exam date (blank = first exam date)<input class="in" type="date" data-bind="subj" data-sid="'+s.id+'" data-f="examDate" value="'+esc(s.examDate)+'"></label></div>'+
    (qn(s)?'<div class="row small muted" style="margin:6px 0"><span>Question bank: '+qn(s)+' questions ('+qnum(s)+' numerical, '+qdesc(s)+' descriptive), about '+qmin(s)+' minutes in total.</span><button class="btn sm ghost" data-act="clearq" data-sid="'+s.id+'">'+(confirmKey==='cq'+s.id?'Tap again':'Clear questions')+'</button></div>':'')+
    '<label class="chk"><input type="checkbox" data-bind="subj" data-sid="'+s.id+'" data-f="pastPapers"'+(s.pastPapers?' checked':'')+'><span>I have past papers for this subject</span></label>'+
    '<label class="f"><span>Topics or experiments, one per line <span class="mono" id="cnt-'+s.id+'">('+cnt+')</span></span><textarea class="in" data-bind="subj" data-sid="'+s.id+'" data-f="topics" placeholder="Paste your syllabus here, one topic per line">'+esc(s.topics.join('\n'))+'</textarea></label></div>';
}
function viewSetup(){
  const st=S.settings;
  const wk=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  let h=sampleBanner()+'<div class="hero" style="margin-bottom:10px"><h2>Setup</h2></div><p class="muted" style="margin-bottom:14px;max-width:60ch">Change anything here and the plan rebuilds itself. Your answers are saved as you type.</p><div class="stack">';
  h+='<div class="panel"><h3>Dates and time</h3><div class="grid2" style="margin-top:12px">'+
    '<label class="f">Plan starts<input class="in" type="date" data-bind="set" data-f="startDate" value="'+esc(st.startDate)+'"></label>'+
    '<label class="f">First exam date<input class="in" type="date" data-bind="set" data-f="examDate" value="'+esc(st.examDate)+'"></label>'+
    '<label class="f">Study window starts<input class="in" type="time" data-bind="set" data-f="startTime" value="'+esc(st.startTime)+'"></label>'+
    '<label class="f">Lights out<input class="in" type="time" data-bind="set" data-f="lightsOut" value="'+esc(st.lightsOut)+'"></label>'+
    '<label class="f">Break length<select class="in" data-bind="set" data-f="breakMin">'+[5,10,15].map(v=>'<option value="'+v+'"'+(+st.breakMin===v?' selected':'')+'>'+v+' minutes</option>').join('')+'</select></label>'+
    '<label class="f">Weekly buffer day<select class="in" data-bind="set" data-f="bufferDay">'+wk.map((w,k)=>'<option value="'+k+'"'+(+st.bufferDay===k?' selected':'')+'>'+w+'</option>').join('')+'<option value="-1"'+(+st.bufferDay===-1?' selected':'')+'>None</option></select></label></div>'+
    '<h3 style="margin-top:18px">Study hours per weekday</h3><p class="small muted" style="margin:4px 0 10px">Hours you can study after college. Use 0 for a rest day. The buffer day keeps its hours for catch-up and a mini-test.</p><div class="hours">'+
    wk.map((w,k)=>'<label>'+w+'<input class="in" type="number" min="0" max="12" step="0.5" data-bind="hour" data-i="'+k+'" value="'+st.hours[k]+'"></label>').join('')+'</div></div>';
  h+='<div class="panel"><div class="row"><h3 style="flex:1">Subjects</h3><button class="btn pri" data-act="addsub">Add subject</button></div><div class="stack" style="margin-top:14px">'+
    (S.subjects.length?S.subjects.map((s,i)=>subjCard(s,i,S.subjects.length)).join(''):'<div class="empty">No subjects yet. Add each subject, including labs, with its topics.</div>')+'</div></div>';
  h+=aiPanel();
  h+='<div class="panel"><h3>Your data</h3><div class="row" style="margin-top:12px">'+
    '<button class="btn" data-act="replan">Re-plan from today</button><button class="btn ghost" data-act="sample">'+(confirmKey==='sample'?'Tap again to replace':'Load the example')+'</button><button class="btn ghost" data-act="clearall">'+(confirmKey==='clear'?'Tap again to erase':'Erase everything')+'</button></div>'+
    '<p class="small muted" style="margin-top:10px">Re-plan keeps topics you ticked as covered and the time you already spent on tasks, then rebuilds the days from today.</p></div></div>';
  return h;
}

/* ---- Guide ---- */
function viewGuide(){
  return '<div class="hero" style="margin-bottom:10px"><h2>Guide</h2></div><div class="panel"><h3>Why the plan looks like this</h3><div class="stack" style="gap:10px;margin-top:12px;max-width:68ch">'+
   '<p><strong>Test yourself instead of re-reading.</strong> A large review of study methods rated practice testing and spaced practice as high utility, and re-reading and highlighting as low. Every block in the plan ends with you recalling or solving something closed book.</p>'+
   '<p><strong>Come back to each topic.</strong> New topics return after 1, 3, 7 and 14 days. The review block lists exactly which ones are due.</p>'+
   '<p><strong>Mix problem types.</strong> In an introductory physics course, students who practised shuffled problems did better on surprise problem-solving exams than students who practised one topic at a time. The practice phase shuffles subjects for the same reason. <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC8589969/" target="_blank" rel="noopener">Read the study</a>.</p>'+
   '<p><strong>Cramming does not last.</strong> Spreading 8 hours over 8 days beats 8 hours in one night for anything you need to remember afterwards. Sleep is scheduled, not optional.</p></div></div>'+
   '<h3 style="margin:22px 0 10px">How to do each task</h3>'+GUIDE_ORDER.map(k=>{const g=GUIDE[k];return '<details class="g"><summary>'+esc(g.t)+'</summary><div class="bd"><ol>'+g.s.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ol></div></details>'}).join('');
}

/* ---- render + events ---- */
function fabHTML(){
  return '<button class="fab" data-act="ai-jump" aria-label="Import syllabus with AI" title="Import syllabus with AI">'+
    '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>'+
  '</button>';
}
function render(){
  const y=window.scrollY,ae=document.activeElement;
  const fk=ae&&ae.dataset&&ae.dataset.chg?{c:ae.dataset.chg,r:ae.dataset.rid}:null;
  let body;
  try{body=route==='plan'?viewPlan():route==='tasks'?viewTasks():route==='setup'?viewSetup():route==='guide'?viewGuide():viewToday()}
  catch(e){console.error(e);body='<div class="notice bad" style="margin-top:20px">This view could not be drawn: '+esc(e.message)+'. Try Setup, then check your dates.</div>'}
  $app.innerHTML=header()+'<main>'+body+'</main>'+fabHTML();
  window.scrollTo(0,y);
  if(fk){const el=$app.querySelector('[data-chg="'+fk.c+'"][data-rid="'+(window.CSS&&CSS.escape?CSS.escape(fk.r):fk.r)+'"]');if(el) el.focus({preventScroll:true})}
}
function replan(){
  const P=getPlan();if(P.empty) return;
  P.days.forEach(d=>d.rows.concat(d.out).forEach(r=>{
    if(!S.done[r.id]) return;
    if(r.cov) r.cov.forEach(c=>{S.coveredBase[c.s+'|'+c.t]=d.date});
    if(r.task&&r.kind==='task') S.taskDone[r.task]=(S.taskDone[r.task]||0)+r.dur;
  }));
  const t=todayISO();if(t>S.settings.startDate) S.settings.startDate=t;
  viewDate=null;touch();render();toast('Plan rebuilt from today');
}
function planText(P){
  const L=['EXAM BENCH PLAN','Plan: '+E.fmtDate(P.days[0].date)+' to '+E.fmtDate(P.end)+'. First exam: '+E.fmtDate(P.firstExam)+'.',''];
  P.days.forEach(d=>{
    L.push('DAY '+(d.i+1)+'  '+E.fmtDate(d.date)+'  ['+(PHASE[d.phase]||'Rest day')+']'+(d.exams.length?'  EXAM: '+d.exams.join(', '):''));
    dayRows(d).forEach(r=>{L.push('  '+E.fmtTime(r.start)+'  '+r.dur+' min  '+r.title+(r.out?'  (own slot)':''));(r.sub||[]).forEach(x=>L.push('        - '+(x.m?x.m+' ':'')+x.text))});
    L.push('');
  });
  return L.join('\n');
}
function setBind(el){
  const b=el.dataset.bind;
  if(b==='set'){const f=el.dataset.f;S.settings[f]=(f==='breakMin'||f==='bufferDay')?+el.value:el.value}
  else if(b==='hour'){S.settings.hours[+el.dataset.i]=Math.max(0,parseFloat(el.value)||0)}
  else if(b==='subj'){
    const s=S.subjects.find(x=>x.id===el.dataset.sid);if(!s) return;const f=el.dataset.f;
    if(f==='pastPapers') s.pastPapers=el.checked;
    else if(f==='topics'){s.topics=el.value.split('\n');const c=document.getElementById('cnt-'+s.id);if(c) c.textContent='('+s.topics.map(x=>x.trim()).filter(Boolean).length+')'}
    else if(f==='weight') s.weight=+el.value;
    else s[f]=el.value;
  }
  S.sample=false;touch();
}
$app.addEventListener('input',e=>{const el=e.target;if(el.dataset&&el.dataset.bind&&(el.dataset.f==='topics'||el.dataset.f==='name')) setBind(el)});
$app.addEventListener('change',e=>{
  const el=e.target;if(!el.dataset) return;
  if(el.dataset.chg&&el.dataset.chg.indexOf('ai')===0){aiChange(el);return}
  if(el.dataset.chg==='tick'){const id=el.dataset.rid;if(el.checked) S.done[id]=true;else delete S.done[id];touch();render();return}
  if(el.dataset.bind){setBind(el);if(el.dataset.bind==='set'||el.dataset.bind==='hour'||el.dataset.f==='kind') {if(el.dataset.f==='kind') render()}}
});
$app.addEventListener('click',e=>{
  const b=e.target.closest('[data-act]');if(!b) return;
  const a=b.dataset.act,P=plan;
  if(a.indexOf('ai-')===0){aiAct(a,b);return}
  const needConfirm=k=>{if(confirmKey!==k){confirmKey=k;render();setTimeout(()=>{if(confirmKey===k){confirmKey=null;render()}},4000);return true}confirmKey=null;return false};
  if(a==='day'){const p=getPlan();const nd=E.addDays(viewDate,+b.dataset.v);if(nd>=p.days[0].date&&nd<=p.days[p.days.length-1].date){viewDate=nd;render();window.scrollTo(0,0)}}
  else if(a==='jump'){viewDate=null;render();window.scrollTo(0,0)}
  else if(a==='open'){viewDate=b.dataset.date;if(route==='today'){render()}else location.hash='today'}
  else if(a==='how'){const id=b.dataset.rid;openHow[id]=!openHow[id];render()}
  else if(a==='replan') replan();
  else if(a==='startblank'){const keep=S.settings;S=makeBlank();S.settings=Object.assign(S.settings,{hours:keep.hours,startTime:keep.startTime,lightsOut:keep.lightsOut,breakMin:keep.breakMin,bufferDay:keep.bufferDay});touch();location.hash='setup';render();toast('Add your subjects below')}
  else if(a==='sample'){if(needConfirm('sample')) return;S=makeSample();S.sample=false;viewDate=null;touch();render();toast('Example loaded')}
  else if(a==='clearq'){if(needConfirm('cq'+b.dataset.sid)) return;const s=S.subjects.find(x=>x.id===b.dataset.sid);if(s){s.questions=[];S.sample=false;touch();render();toast('Questions cleared')}}
  else if(a==='clearall'){if(needConfirm('clear')) return;S=makeBlank();viewDate=null;touch();render();toast('Everything erased')}
  else if(a==='addsub'){S.subjects.push({id:uid(),name:'',kind:'theory',rating:'okay',weight:2,pastPapers:false,examDate:'',topics:[]});S.sample=false;touch();render()}
  else if(a==='delsub'){if(needConfirm('ds'+b.dataset.sid)) return;S.subjects=S.subjects.filter(x=>x.id!==b.dataset.sid);S.tasks.forEach(t=>{if(t.subjectId===b.dataset.sid) t.subjectId=''});touch();render()}
  else if(a==='up'||a==='down'){const i=subjIdx(b.dataset.sid),j=a==='up'?i-1:i+1;if(i>=0&&j>=0&&j<S.subjects.length){const x=S.subjects[i];S.subjects[i]=S.subjects[j];S.subjects[j]=x;touch();render()}}
  else if(a==='rate'){const s=S.subjects.find(x=>x.id===b.dataset.sid);if(s){s.rating=b.dataset.v;S.sample=false;touch();render()}}
  else if(a==='addtask'){editTask={id:uid(),title:'',type:'assignment',subjectId:'',totalMin:60,chunkMin:60,due:'',mode:'hybrid',slot:'17:00'};render()}
  else if(a==='edittask'){const t=S.tasks.find(x=>x.id===b.dataset.tid);if(t){editTask=Object.assign({},t);render()}}
  else if(a==='canceltask'){editTask=null;render()}
  else if(a==='deltask'){if(needConfirm('dt'+b.dataset.tid)) return;S.tasks=S.tasks.filter(x=>x.id!==b.dataset.tid);touch();render()}
  else if(a==='savetask'){
    const v=id=>document.getElementById(id).value,title=v('tk-title').trim(),items=+v('tk-items')||0,per=+v('tk-per')||0,hours=parseFloat(v('tk-hours'))||0;
    const total=items>0&&per>0?items*per:Math.round(hours*60);
    if(!title){toast('Give the task a name');return}
    if(total<=0){toast('Enter total hours, or items and minutes per item');return}
    const t={id:b.dataset.tid,title,type:v('tk-type'),subjectId:v('tk-subj'),totalMin:total,chunkMin:Math.max(10,+v('tk-chunk')||60),due:v('tk-due'),mode:v('tk-mode'),slot:v('tk-slot')||'17:00',items:items>0&&per>0?items:0,perItem:items>0&&per>0?per:0};
    const i=S.tasks.findIndex(x=>x.id===t.id);if(i>=0) S.tasks[i]=t;else S.tasks.push(t);
    S.sample=false;editTask=null;touch();render();toast('Task saved');
  }
  else if(a==='download'&&dl){
    const p=getPlan();if(p.empty) return;
    dl.save({filename:'exam-bench-plan.txt',data:planText(p)}).then(()=>toast('Plan saved'),err=>{if(!err||err.code!=='declined') toast('Saving a file is not available here')});
  }
});
function routeFromHash(){const h=location.hash.replace('#','');return ROUTES.indexOf(h)>=0?h:'today'}
window.addEventListener('hashchange',()=>{route=routeFromHash();confirmKey=null;render();window.scrollTo(0,0)});

S=loadLocal()||makeSample();
route=routeFromHash();
render();
initCaps();
