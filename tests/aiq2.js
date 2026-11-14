const {chromium}=require('playwright');
(async()=>{
const br=await chromium.launch();const pg=await br.newPage({viewport:{width:390,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
let lastPrompt='';
await pg.route('https://generativelanguage.googleapis.com/**',r=>{
 const b=JSON.parse(r.request().postData()||'{}');lastPrompt=b.contents[0].parts[0].text;
 const papers=/past papers, assignments/.test(lastPrompt);
 const qs=[];for(let i=1;i<=6;i++)qs.push({text:'Q'+i+' Fourier problem '+i,topic:'Fourier series',difficulty:1+i%3,minutes:[4,9,16][i%3],marks:[2,5,10][i%3]});
 const subj={name:'Signals & Systems',kind:'theory',topics:papers?[]:['Fourier series','Z-transform'],questions:qs};
 r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({subjects:[subj]})}]}}]})})});
await pg.goto('file://'+process.cwd()+'/test.html');
await pg.evaluate(()=>{location.hash='setup'});await pg.waitForTimeout(300);
await pg.click('[data-act=startblank]');await pg.click('[data-act=addsub]');
await pg.fill('[data-f=name]','Signals & Systems');
await pg.click('[data-act=ai-enable]');await pg.fill('#ai-key','AIzaFAKEKEYFAKEKEYFAKEKEY1234');await pg.press('#ai-key','Enter');
console.log('default mode:',await pg.locator('[data-chg=aimode]').inputValue());
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
await pg.setInputFiles('#ai-files',[{name:'notes.png',mimeType:'image/png',buffer:png}]);
await pg.click('[data-act=ai-run]');await pg.waitForSelector('.ai-sub');
console.log('notes:',(await pg.locator('.ai-sub').innerText()).split('\n').filter(x=>/Topics|Questions|Z-trans|Q1/.test(x)).join(' | '));
await pg.screenshot({path:'aiq2.png',fullPage:true});
await pg.click('#ai-addbtn');await pg.waitForTimeout(200);
console.log(await pg.locator('text=Question bank').first().innerText(),'| topics:',JSON.stringify(await pg.locator('[data-f=topics]').first().inputValue()),'| pastPapers:',await pg.locator('[data-f=pastPapers]').first().isChecked());
await pg.selectOption('[data-chg=aimode]','papers');
await pg.setInputFiles('#ai-files',[{name:'paper.png',mimeType:'image/png',buffer:png}]);
await pg.click('[data-act=ai-run]');await pg.waitForSelector('.ai-sub');
console.log('papers topics section:',await pg.locator('.ai-sub >> text=Topics (').count(),'dup chips:',await pg.locator('.ai-sub .chip:text("Already listed")').count());
console.log('overflow:',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth),'errors:',errs);await br.close()})();
