/* ===== AI import: Gemini with the student's own key, or Claude preview for photos ===== */
const AIKEY='exam-bench-ai-v1',AI_MODEL='gemini-2.5-flash';
let ai={enabled:false,provider:'gemini',key:'',model:AI_MODEL};
try{const r=JSON.parse(localStorage.getItem(AIKEY)||'null');if(r&&typeof r==='object') ai=Object.assign(ai,r)}catch(e){}
const aiUI={mode:'notes',asking:false,files:[],target:'auto',busy:false,err:'',note:'',proposal:null,undo:null,confirmOff:false};
const aiSave=()=>{try{localStorage.setItem(AIKEY,JSON.stringify(ai))}catch(e){}};
const codeErr=(c,m)=>{const e=new Error(m||c);e.code=c;return e};
const nrm=s=>String(s||'').toLowerCase().replace(/[^\p{L}\p{N} ]+/gu,' ').replace(/\s+/g,' ').trim();
const toks=s=>new Set(nrm(s).split(' ').filter(x=>x.length>1));
function jac(a,b){const A=toks(a),B=toks(b);if(!A.size||!B.size) return 0;let i=0;A.forEach(x=>{if(B.has(x)) i++});return i/(A.size+B.size-i)}
function sameTopic(a,b){const x=nrm(a),y=nrm(b);if(!x||!y) return false;if(x===y) return true;const sh=x.length<y.length?x:y,lg=x.length<y.length?y:x;return (sh.length>=6&&lg.indexOf(sh)>=0)||jac(a,b)>=.8}
function sameSubject(a,b){const x=nrm(a),y=nrm(b);if(!x||!y) return false;if(x===y) return true;const sh=x.length<y.length?x:y,lg=x.length<y.length?y:x;return (sh.length>=4&&lg.indexOf(sh)>=0)||jac(a,b)>=.6}

const AI_SCHEMA={type:'OBJECT',properties:{subjects:{type:'ARRAY',items:{type:'OBJECT',properties:{name:{type:'STRING'},kind:{type:'STRING'},topics:{type:'ARRAY',items:{type:'STRING'}},questions:{type:'ARRAY',items:{type:'OBJECT',properties:{text:{type:'STRING'},topic:{type:'STRING'},qtype:{type:'STRING',enum:['numerical','descriptive']},difficulty:{type:'INTEGER'},minutes:{type:'INTEGER'},marks:{type:'INTEGER'}},required:['text','difficulty','minutes','qtype']}}},required:['name','topics']}}},required:['subjects']};

const AI_QSCHEMA={type:'OBJECT',properties:{subjects:{type:'ARRAY',items:{type:'OBJECT',properties:{name:{type:'STRING'},questions:{type:'ARRAY',items:{type:'OBJECT',properties:{text:{type:'STRING'},topic:{type:'STRING'},qtype:{type:'STRING',enum:['numerical','descriptive']},difficulty:{type:'INTEGER'},minutes:{type:'INTEGER'},marks:{type:'INTEGER'}},required:['text','difficulty','minutes','qtype']}}},required:['name','questions']}}},required:['subjects']};
function aiQPrompt(target){
  const names=S.subjects.map(s=>s.name.trim()).filter(Boolean);
  return 'You are helping an engineering student turn past papers, assignments or problem sets into a practice question list with time estimates.\n'+
  'The attached files are photos or PDFs of exam questions.\nRules:\n'+
  '- Extract each separate question, in order. Keep sub-parts of one question together as one item.\n'+
  '- "text" is a short description of the question in at most 25 words, so the student can find it. Include the question number if shown, for example "Q3(b) Find the Fourier series of a square wave". Do not copy long statements.\n'+
  '- "topic" is the short topic name (2 to 5 words), or an empty string if unclear.\n'+
  '- "qtype" is "numerical" for calculation problems, derivations, circuit analysis or mathematical evaluation; or "descriptive" for definitions, theory, explanations, diagrams or proofs.\n'+
  '- "difficulty" is 1 for easy (direct formula or definition), 2 for medium (a few steps), 3 for hard (long, multi-concept or proof).\n'+
  '- "minutes" is how long a well prepared student needs to answer it in writing. Scale it with the marks and the size of the work: about 3 to 5 for a 2-mark short answer, 8 to 12 for a 5-mark question, 15 to 25 for a 10-mark or multi-part question. If marks are shown, use them. Never go above 40.\n'+
  '- "marks" is the marks shown, or 0 if not shown.\n- Only include questions that are actually in the files. Never invent questions. Skip anything unreadable.\n'+
  (target?'All the files belong to the subject "'+target.name+'". Return exactly one subject with that name.\n'
    :(names.length?'The student already has these subjects: '+names.join('; ')+'. If a file clearly belongs to one, use that exact name. Otherwise use the subject name in the file, or an empty string.\n':'Use the subject name in each file, or an empty string.\n'))+
  'Return only JSON like {"subjects":[{"name":"...","questions":[{"text":"...","topic":"...","qtype":"numerical","difficulty":2,"minutes":10,"marks":5}]}]}';
}
function aiPrompt(target){
  if(aiUI.mode==='papers') return aiQPrompt(target);
  const names=S.subjects.map(s=>s.name.trim()).filter(Boolean);
  return 'You are helping a student turn study material into a topic list for exam planning.\n'+
  'The attached files are photos or PDFs of a syllabus, a table of contents, a lab manual contents page, or class notes.\n'+
  'Extract the subjects and the topics inside them.\nRules:\n'+
  '- List topics in the order they appear.\n'+
  '- Each topic is a short name of 2 to 8 words, such as "Fourier series" or "BJT biasing". Remove unit numbers, marks, hours and page numbers.\n'+
  '- Only include topics that are actually in the files. Never invent or add topics.\n- Never repeat a topic.\n'+
  '- If a list is a lab manual or a list of experiments, set kind to "lab" and list each experiment as a topic. Otherwise set kind to "theory".\n'+
  '- If the files are handwritten notes, list the headings or main concepts the notes cover.\n- If you cannot read something, skip it.\n'+
  (target?'All the files belong to the subject "'+target.name+'". Return exactly one subject with that name.\n'
    :(names.length?'The student already has these subjects: '+names.join('; ')+'. If a file clearly belongs to one of them, use that exact name. Otherwise use the subject name written in the file, or an empty string if there is none.\n':'Use the subject name written in each file, or an empty string if there is none.\n'))+
  'Also look for practice questions, exercises, solved examples or problems written in the files. If there are any, list them in "questions" for the matching subject. Never invent questions, and use an empty list when the files contain none.\n'+
  'For each question: "text" is a short description in at most 25 words, "topic" is its topic name or an empty string, "qtype" is "numerical" for calculation/numerical problems or "descriptive" for theory/explanations, "difficulty" is 1 for easy, 2 for medium and 3 for hard, "minutes" is how long a well prepared student needs to write the answer (about 3 to 5 for a short answer, 8 to 12 for a medium one, 15 to 25 for a long or multi-part one, never above 40), and "marks" is the marks shown or 0.\n'+
  'Return only JSON in this shape: {"subjects":[{"name":"...","kind":"theory","topics":["..."],"questions":[{"text":"...","topic":"...","qtype":"numerical","difficulty":2,"minutes":10,"marks":0}]}]}';
}
function readB64(b){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej(r.error);r.readAsDataURL(b)})}
async function aiPrep(f){
  if(f.type==='application/pdf') return {mime:'application/pdf',b64:await readB64(f),name:f.name};
  try{
    const bmp=await createImageBitmap(f),sc=Math.min(1,1600/Math.max(bmp.width,bmp.height));
    const w=Math.max(1,Math.round(bmp.width*sc)),h=Math.max(1,Math.round(bmp.height*sc));
    const cv=document.createElement('canvas');cv.width=w;cv.height=h;cv.getContext('2d').drawImage(bmp,0,0,w,h);
    const blob=await new Promise(r=>cv.toBlob(r,'image/jpeg',.85));
    if(!blob) throw 0;
    return {mime:'image/jpeg',b64:await readB64(blob),blob,name:f.name};
  }catch(e){
    if(/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type)&&!(ai.provider==='claude'&&/hei[cf]/.test(f.type))) return {mime:f.type,b64:await readB64(f),blob:f,name:f.name};
    throw codeErr('filetype','"'+f.name+'" could not be opened. Use a JPEG, PNG or WebP photo, or a PDF.');
  }
}
async function aiHttpErr(r){let m='';try{const j=await r.json();m=(j.error&&j.error.message)||''}catch(e){}const e=codeErr('http',m||('HTTP '+r.status));e.status=r.status;return e}
async function aiAskGemini(prompt,prep){
  const parts=[{text:prompt}].concat(prep.map(p=>({inline_data:{mime_type:p.mime,data:p.b64}})));
  const body={contents:[{role:'user',parts}],generationConfig:{temperature:.1,responseMimeType:'application/json',responseSchema:aiUI.mode==='papers'?AI_QSCHEMA:AI_SCHEMA}};
  let r;const ac=new AbortController(),tm=setTimeout(()=>ac.abort(),90000);
  try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(ai.model||AI_MODEL)+':generateContent',{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':ai.key},body:JSON.stringify(body),signal:ac.signal})}
  catch(e){clearTimeout(tm);throw ac.signal.aborted?codeErr('timeout'):codeErr('network')}
  clearTimeout(tm);
  if(!r.ok) throw await aiHttpErr(r);
  const j=await r.json(),c=j.candidates&&j.candidates[0];
  if(!c||!c.content||!c.content.parts){throw codeErr(j.promptFeedback&&j.promptFeedback.blockReason?'blocked':'empty')}
  return c.content.parts.map(p=>p.text||'').join('');
}
async function aiAskClaude(prompt,prep){
  if(prep.some(p=>p.mime==='application/pdf')) throw codeErr('pdf');
  const sample=window.claude&&window.claude.use?await window.claude.use('sample'):null;
  if(!sample) throw codeErr('nosample');
  let lim=null;try{lim=await sample.limits()}catch(e){}
  if(!lim||!lim.images) throw codeErr('nosample');
  if(prep.length>lim.images.maxCount) throw codeErr('filetype','Claude can read up to '+lim.images.maxCount+' photos at once.');
  const out=await sample.json(prompt,{images:prep.map(p=>p.blob),modelTier:'default',cache:false});
  return typeof out==='string'?out:JSON.stringify(out);
}
function aiParse(raw){
  let t=String(raw||'').trim();const f=t.match(/```(?:json)?\s*([\s\S]*?)```/);if(f) t=f[1].trim();
  let o;try{o=JSON.parse(t)}catch(e){const a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{o=JSON.parse(t.slice(a,b+1))}catch(e2){}}}
  const arr=o&&(Array.isArray(o)?o:o.subjects);
  if(!Array.isArray(arr)) throw codeErr('parse');
  return arr.map(s=>{
    const seen=[],topics=[],qs=[];
    if(aiUI.mode!=='papers') (Array.isArray(s&&s.topics)?s.topics:[]).forEach(x=>{
      let v=String(x==null?'':x).replace(/\s+/g,' ').trim().replace(/^(?:[-•*]|\d+[.)])\s+/,'');
      if(v.length<2||v.length>120||seen.some(y=>sameTopic(y,v))) return;
      seen.push(v);topics.push(v);
    });
    (Array.isArray(s&&s.questions)?s.questions:[]).forEach(q=>{
      const text=String(q&&q.text||'').replace(/\s+/g,' ').trim().slice(0,200);if(text.length<4) return;
      const d=Math.min(3,Math.max(1,Math.round(+q.difficulty)||2)),mk=Math.max(0,Math.min(100,Math.round(+q.marks)||0));
      let m=Math.round(+q.minutes);if(!(m>0)) m=[4,9,16][d-1];m=Math.max(2,Math.min(40,m));
      if(qs.some(x=>sameTopic(x.text,text))) return;
      const rawQt=String(q&&q.qtype||q&&q.type||'').toLowerCase();
      const isNum=/(calculate|find|compute|determine|evaluate|solve|design|derive|impedance|voltage|current|transfer function|fourier|bode)\b/i.test(text);
      const qt=rawQt.includes('num')||rawQt.includes('calc')?'numerical':(rawQt.includes('desc')||rawQt.includes('theory')?'descriptive':(isNum?'numerical':'descriptive'));
      qs.push({text,topic:String(q.topic||'').replace(/\s+/g,' ').trim().slice(0,60),qtype:qt,diff:d,min:m,marks:mk});
    });
    return {name:String(s&&s.name||'').trim().slice(0,80),kind:s&&s.kind==='lab'?'lab':'theory',topics:topics.slice(0,80),questions:qs.slice(0,80)};
  }).filter(s=>s.topics.length||s.questions.length);
}
function aiMakeProposal(data,target){
  const out=[];
  data.forEach(d=>{
    const m=target||S.subjects.find(s=>s.name.trim()&&sameSubject(s.name,d.name));
    let e=out.find(x=>m?x.sid===m.id:(!x.sid&&sameSubject(x.name,d.name)));
    if(!e){e={name:m?m.name:(d.name||'Imported subject'),sid:m?m.id:null,kind:d.kind,topics:[],qs:[]};out.push(e)}
    const haveT=m?m.topics.map(x=>x.trim()).filter(Boolean):[],haveQ=m?(m.questions||[]):[];
    d.topics.forEach(t=>{if(e.topics.some(x=>sameTopic(x.t,t))) return;const dup=haveT.some(h=>sameTopic(h,t));e.topics.push({t,dup,on:!dup})});
    d.questions.forEach(q=>{if(e.qs.some(x=>sameTopic(x.q.text,q.text))) return;const dup=haveQ.some(h=>sameTopic(h.text,q.text));e.qs.push({t:q.text,q,dup,on:!dup})});
  });
  return {subjects:out.filter(e=>e.topics.length||e.qs.length)};
}
function aiFriendly(e){
  const c=e&&e.code,s=e&&e.status,m=(e&&e.message)||'';
  if(c==='timeout') return 'The request took too long. Try again, or use a smaller file.';
  if(c==='network') return 'Could not reach Google. Check your connection. Inside Claude\'s preview this page is not allowed to call outside servers, so use "Try with Claude" there. The Gemini key works in the Android app.';
  if(c==='http'){
    if(s===400&&/api key/i.test(m)) return 'Google rejected this key. Check that you copied all of it.';
    if(s===400) return 'Google could not read this request. Try a clearer photo or a smaller file.';
    if(s===401||s===403) return 'This key cannot use that model, or is blocked in your region. Check the key and the model name under Advanced.';
    if(s===404) return 'Google does not know the model "'+ai.model+'". Open Advanced and enter a current Gemini model name.';
    if(s===413) return 'The files are too large. Use fewer or smaller files.';
    if(s===429) return 'You have reached the free limit for now. Wait a minute and try again, or use fewer files.';
    if(s>=500) return 'Google had a problem. Try again in a moment.';
    return 'Google returned an error ('+s+').';
  }
  if(c==='blocked') return 'Google declined to read these files.';
  if(c==='empty') return 'The AI returned nothing. Try a clearer photo.';
  if(c==='parse'||c==='invalid_json') return 'The AI answer could not be understood. Try again, or use a clearer photo.';
  if(c==='pdf') return 'The Claude preview reads photos only. Use a Gemini key for PDFs.';
  if(c==='filetype') return m;
  if(c==='rate_limited') return 'Too many requests right now. Wait a bit and try again.';
  if(c==='image_rejected') return 'One of the images could not be used. Try a different photo.';
  if(c==='nosample'||c==='not_granted'||c==='sampling_disabled'||c==='not_declared'||c==='capability_disabled'||c==='capability_removed'||c==='images_unavailable') return 'Claude is not available here for reading images.';
  return 'Something went wrong while reading the files. Try again.';
}
async function aiRun(){
  if(aiUI.busy||!aiUI.files.length) return;
  aiUI.busy=true;aiUI.err='';aiUI.note='';aiUI.proposal=null;render();
  try{
    const prep=await Promise.all(aiUI.files.map(aiPrep));
    const bytes=prep.reduce((a,p)=>a+p.b64.length*.75,0);
    if(bytes>18*1048576) throw codeErr('filetype','These files are too large together. Send fewer or smaller files.');
    const target=aiUI.target==='auto'?null:S.subjects.find(s=>s.id===aiUI.target)||null;
    const prompt=aiPrompt(target);
    const raw=ai.provider==='claude'?await aiAskClaude(prompt,prep):await aiAskGemini(prompt,prep);
    aiUI.proposal=aiMakeProposal(aiParse(raw),target);
  }catch(e){aiUI.err=aiFriendly(e)}
  finally{aiUI.busy=false;render()}
}
async function aiTest(){
  aiUI.err='';aiUI.note='Checking the key…';render();
  try{
    let r;try{r=await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1',{headers:{'x-goog-api-key':ai.key}})}catch(e){throw codeErr('network')}
    if(!r.ok) throw await aiHttpErr(r);
    aiUI.note='The key works.';
  }catch(e){aiUI.note='';aiUI.err=aiFriendly(e)}
  render();
}
function aiApply(){
  const P=aiUI.proposal;if(!P) return;
  const before=JSON.stringify(S.subjects);let nt=0,nq=0;
  P.subjects.forEach(e=>{
    const st=e.topics.filter(t=>t.on).map(t=>t.t),sq=e.qs.filter(t=>t.on).map(t=>Object.assign({id:uid()},t.q));
    if(!st.length&&!sq.length) return;
    let s=e.sid?S.subjects.find(x=>x.id===e.sid):null;
    if(!s&&!e.sid){s={id:uid(),name:(e.name||'').trim()||'Imported subject',kind:e.kind==='lab'?'lab':'theory',rating:'okay',weight:2,pastPapers:false,examDate:'',topics:[],questions:[]};S.subjects.push(s)}
    if(!s) return;
    if(st.length){s.topics=s.topics.map(x=>x.trim()).filter(Boolean).concat(st);nt+=st.length}
    if(sq.length){s.questions=(s.questions||[]).concat(sq);nq+=sq.length;if(aiUI.mode==='papers') s.pastPapers=true}
  });
  if(!nt&&!nq){S.subjects=JSON.parse(before);toast('Nothing is ticked');return}
  aiUI.undo=before;S.sample=false;aiUI.proposal=null;aiUI.files=[];touch();render();
  toast('Added '+[nt?nt+' topic'+(nt===1?'':'s'):'',nq?nq+' question'+(nq===1?'':'s'):''].filter(Boolean).join(' and '));
}
function aiCount(){const P=aiUI.proposal;return P?P.subjects.reduce((a,e)=>a+e.topics.filter(t=>t.on).length+e.qs.filter(t=>t.on).length,0):0}
const extType=f=>{if(f.type) return f.type;const m=(f.name||'').toLowerCase().match(/\.(jpe?g|png|webp|heic|heif|pdf)$/);return m?({jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',heic:'image/heic',heif:'image/heif',pdf:'application/pdf'})[m[1]]:''};
function aiAdd(list,fromPaste){
  const ok=[],skipped=[];
  Array.prototype.forEach.call(list,f=>{
    const t=extType(f),pdf=t==='application/pdf',img=/^image\//.test(t),nm=f.name||'pasted image';
    if(!f.type&&t){try{f=new File([f],nm,{type:t})}catch(e){}}
    if((ai.provider==='claude'&&!img)||(!pdf&&!img)) skipped.push(nm);
    else ok.push(f);
  });
  aiUI.files=aiUI.files.concat(ok).slice(0,10);
  aiUI.err=skipped.length?'Skipped: '+skipped.join(', ')+'. '+(ai.provider==='claude'?'Claude preview reads photos only.':'Use photos or PDFs only.'):'';
  aiUI.proposal=null;render();
}
function aiFiles(el){aiAdd(el.files);try{el.value=''}catch(e){}}
document.addEventListener('paste',e=>{
  if(!ai.enabled||S.sample||aiUI.asking||!document.getElementById('ai-files')) return;
  const items=[].filter.call((e.clipboardData&&e.clipboardData.files)||[],f=>/^image\//.test(f.type));
  if(items.length){e.preventDefault();aiAdd(items,true)}
});
function aiFilesOld(el){
  const ok=[],skipped=[];
  Array.prototype.forEach.call(el.files,f=>{
    const pdf=f.type==='application/pdf',img=/^image\//.test(f.type);
    if((ai.provider==='claude'&&!img)||(!pdf&&!img)) skipped.push(f.name);
    else ok.push(f);
  });
  aiUI.files=aiUI.files.concat(ok).slice(0,10);aiUI.err=skipped.length?'Skipped: '+skipped.join(', ')+'. '+(ai.provider==='claude'?'Claude preview reads photos only.':'Use photos or PDFs only.'):'';
  aiUI.proposal=null;render();
}
function aiChange(el){
  const k=el.dataset.chg;
  if(k==='aifiles') aiFiles(el);
  else if(k==='aimode'){aiUI.mode=el.value;aiUI.proposal=null;aiUI.err='';render()}
  else if(k==='aitarget') aiUI.target=el.value;
  else if(k==='aimodel'){ai.model=el.value.trim()||AI_MODEL;aiSave()}
  else if(k==='aitopic'){const e=aiUI.proposal&&aiUI.proposal.subjects[+el.dataset.i],t=e&&(el.dataset.k==='q'?e.qs:e.topics)[+el.dataset.j];if(t){t.on=el.checked;const b=document.getElementById('ai-addbtn');if(b){const n=aiCount();b.textContent='Add '+n+' selected item'+(n===1?'':'s');b.disabled=n===0}}}
  else if(k==='ainame'){const e=aiUI.proposal&&aiUI.proposal.subjects[+el.dataset.i];if(e) e.name=el.value}
}
function aiAct(a,b){
  const focusKey=()=>setTimeout(()=>{const el=document.getElementById('ai-key');if(el) el.focus()},30);
  if(a==='ai-enable'||a==='ai-change'){aiUI.asking=true;aiUI.err='';render();focusKey()}
  else if(a==='ai-cancel'){aiUI.asking=false;aiUI.err='';render()}
  else if(a==='ai-claude'){ai.enabled=true;ai.provider='claude';aiUI.asking=false;aiSave();render()}
  else if(a==='ai-savekey'){
    const v=(document.getElementById('ai-key').value||'').trim();
    if(v.length<20||/\s/.test(v)){aiUI.err='That does not look like a full API key. Copy it again from Google AI Studio.';render();focusKey();return}
    ai.key=v;ai.provider='gemini';ai.enabled=true;ai.model=ai.model||AI_MODEL;aiUI.asking=false;aiUI.err='';aiUI.note='';aiSave();render();toast('AI import is on');
  }
  else if(a==='ai-off'){
    if(!aiUI.confirmOff){aiUI.confirmOff=true;render();setTimeout(()=>{if(aiUI.confirmOff){aiUI.confirmOff=false;render()}},4000);return}
    aiUI.confirmOff=false;ai.enabled=false;ai.key='';ai.provider='gemini';aiSave();aiUI.files=[];aiUI.proposal=null;aiUI.err='';aiUI.note='';render();toast('AI import is off and the key is removed');
  }
  else if(a==='ai-test') aiTest();
  else if(a==='ai-rm'){aiUI.files.splice(+b.dataset.i,1);render()}
  else if(a==='ai-run') aiRun();
  else if(a==='ai-apply') aiApply();
  else if(a==='ai-discard'){aiUI.proposal=null;render()}
  else if(a==='ai-undo'){if(aiUI.undo){S.subjects=JSON.parse(aiUI.undo);aiUI.undo=null;touch();render();toast('Import undone')}}
  else if(a==='ai-jump'){
    const jump=()=>{
      const el=document.getElementById('ai-panel');
      if(el){
        el.scrollIntoView({behavior:'smooth'});
        el.classList.remove('ai-highlight');
        void el.offsetWidth;
        el.classList.add('ai-highlight');
      }
    };
    if(location.hash!=='#setup'){
      location.hash='setup';
      setTimeout(jump,60);
    }else{
      jump();
    }
  }
}
$app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target&&e.target.id==='ai-key'){e.preventDefault();aiAct('ai-savekey')}});

function aiPanel(){
  const gem=ai.provider==='gemini';
  let h='<div class="panel" id="ai-panel"><h3>Import syllabus with AI</h3>';
  if(aiUI.asking){
    h+='<p class="muted" style="margin:8px 0 12px;max-width:62ch">Paste a Gemini API key. Get a free one from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio</a>.</p>'+
      '<label class="f">Gemini API key<input class="in" id="ai-key" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Paste your key here"></label>'+
      '<p class="small muted" style="margin:8px 0 12px;max-width:62ch">The key is stored only in this browser and is sent only to Google. Photos and PDFs you import are also sent to Google, and on free plans Google may use them to improve its products. Do not import anything private.</p>'+
      (aiUI.err?'<div class="notice bad" style="margin-bottom:12px" role="alert">'+esc(aiUI.err)+'</div>':'')+
      '<div class="row"><button class="btn pri" data-act="ai-savekey">Save key</button><button class="btn" data-act="ai-cancel">Cancel</button></div></div>';
    return h;
  }
  if(!ai.enabled){
    return h+'<p class="muted" style="margin:8px 0 12px;max-width:62ch">Photograph your notes, a syllabus or a past paper, or pick a PDF. The AI finds the topics and any questions in them, with a difficulty and a time estimate for each question. You review them before anything in your plan changes, and the planner then fills practice sessions with those questions.</p>'+
      '<div class="row"><button class="btn pri" data-act="ai-enable">Enable AI import</button><button class="btn ghost" data-act="ai-claude">Try with Claude, no key</button></div></div>';
  }
  h+='<div class="row" style="margin:10px 0"><span class="chip">'+(gem?'Gemini · key ••••'+esc(ai.key.slice(-4)):'Claude preview · photos only')+'</span><div class="grow"></div>'+
    (gem?'<button class="btn sm" data-act="ai-test">Test key</button><button class="btn sm" data-act="ai-change">Change key</button>':'<button class="btn sm" data-act="ai-enable">Use my Gemini key</button>')+
    '<button class="btn sm ghost" data-act="ai-off">'+(aiUI.confirmOff?'Tap again to turn off':'Turn off')+'</button></div>';
  if(gem) h+='<details class="g" style="margin-bottom:12px"><summary>Advanced</summary><div class="bd"><label class="f">Model name<input class="in" id="ai-model" data-chg="aimodel" value="'+esc(ai.model)+'"></label><p class="small" style="margin-top:6px">If Google retires this model, enter the name of a current Gemini Flash model here.</p></div></details>';
  if(aiUI.note) h+='<div class="notice info" style="margin-bottom:12px" role="status">'+esc(aiUI.note)+'</div>';
  if(S.sample){
    h+='<div class="notice info"><div class="grow">You are on the example plan. Start with your own subjects first so imported topics go into your own plan.</div><button class="btn pri" data-act="startblank">Start with my subjects</button></div></div>';
    return h;
  }
  h+='<label class="f" style="margin-bottom:12px">What kind of files?<select class="in" data-chg="aimode"><option value="notes"'+(aiUI.mode==='notes'?' selected':'')+'>Notes, syllabus or textbook pages (finds topics and any questions)</option><option value="papers"'+(aiUI.mode==='papers'?' selected':'')+'>Past papers (adds questions with time)</option></select></label>';
  h+='<div class="f"><span>Photos or PDFs</span><div class="row"><label class="btn pri" for="ai-files" tabindex="0" role="button">Choose files</label><label class="btn" for="ai-cam" tabindex="0" role="button">Take photo</label><span class="small muted">You can also paste a screenshot.</span></div>'+
    '<input class="vh" type="file" id="ai-files" data-chg="aifiles" multiple accept="'+(gem?'image/*,application/pdf,.pdf,.heic,.heif':'image/*')+'">'+
    '<input class="vh" type="file" id="ai-cam" data-chg="aifiles" accept="image/*" capture="environment"></div>';
  if(aiUI.files.length) h+='<ul class="files">'+aiUI.files.map((f,i)=>'<li><span>'+esc(f.name)+' <span class="muted small">('+Math.max(1,Math.round(f.size/1024))+' KB)</span></span><button class="btn sm ghost" data-act="ai-rm" data-i="'+i+'" aria-label="Remove '+esc(f.name)+'">Remove</button></li>').join('')+'</ul>';
  h+='<label class="f" style="margin-top:12px">These files are for<select class="in" data-chg="aitarget"><option value="auto"'+(aiUI.target==='auto'?' selected':'')+'>Detect the subjects automatically</option>'+S.subjects.filter(s=>s.name.trim()).map(s=>'<option value="'+s.id+'"'+(aiUI.target===s.id?' selected':'')+'>'+esc(s.name)+'</option>').join('')+'</select></label>';
  h+='<div class="row" style="margin-top:12px"><button class="btn pri" data-act="ai-run"'+(aiUI.busy||!aiUI.files.length?' disabled':'')+'>'+(aiUI.busy?'Reading…':'Read files')+'</button>'+
    (aiUI.undo?'<button class="btn" data-act="ai-undo">Undo last import</button>':'')+
    (aiUI.busy?'<span class="small muted" role="status">This can take up to a minute.</span>':'')+'</div>';
  if(aiUI.err) h+='<div class="notice bad" style="margin-top:12px" role="alert">'+esc(aiUI.err)+'</div>';
  const P=aiUI.proposal;
  if(P){
    if(!P.subjects.length) h+='<div class="notice" style="margin-top:12px">The AI did not find any '+(aiUI.mode==='papers'?'questions':'topics or questions')+' in these files. Try a clearer photo or crop closer to the text.</div>';
    else{
      const n=aiCount(),li=(t,i,j,k)=>'<li><label'+(t.dup?' class="dup"':'')+'><input type="checkbox" data-chg="aitopic" data-k="'+k+'" data-i="'+i+'" data-j="'+j+'"'+(t.on?' checked':'')+'><span>'+esc(t.t)+(t.q?' <span class="chip '+(t.q.qtype==='numerical'?'q-num':'q-desc')+'">'+(t.q.qtype==='numerical'?'Numerical':'Descriptive')+'</span> <span class="chip">'+['','Easy','Medium','Hard'][t.q.diff]+' · ~'+t.q.min+'m'+(t.q.marks?' · '+t.q.marks+' marks':'')+'</span>':'')+(t.dup?' <span class="chip">Already listed</span>':'')+'</span></label></li>';
      h+='<h3 style="margin:18px 0 6px">Review what it found</h3>'+(P.subjects.some(e=>e.qs.length)?'<p class="small muted" style="margin:0 0 10px">Difficulty and time are the AI\'s estimate. Your plan uses them to size practice sessions, so treat them as a starting point.</p>':'')+'<div class="stack">'+P.subjects.map((e,i)=>
        '<div class="ai-sub"><div class="row" style="flex-wrap:nowrap">'+(e.sid?'<strong style="flex:1;min-width:0;overflow-wrap:anywhere">'+esc(e.name)+'</strong>':'<input class="in" data-chg="ainame" data-i="'+i+'" value="'+esc(e.name)+'" aria-label="New subject name" style="flex:1">')+'<span class="chip">'+(e.sid?'Existing subject':'New subject')+'</span></div>'+
        (e.topics.length?'<div class="small muted" style="margin-top:10px;font-weight:700">Topics ('+e.topics.length+')</div><ul class="ai-topics">'+e.topics.map((t,j)=>li(t,i,j,'t')).join('')+'</ul>':'')+
        (e.qs.length?'<div class="small muted" style="margin-top:10px;font-weight:700">Questions ('+e.qs.length+')</div><ul class="ai-topics">'+e.qs.map((t,j)=>li(t,i,j,'q')).join('')+'</ul>':'')+'</div>').join('')+
        '<div class="row"><button class="btn pri" id="ai-addbtn" data-act="ai-apply"'+(n?'':' disabled')+'>Add '+n+' selected item'+(n===1?'':'s')+'</button><button class="btn" data-act="ai-discard">Discard</button></div></div>';
    }
  }
  return h+'</div>';
}
