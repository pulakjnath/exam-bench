const {chromium}=require('playwright');
(async()=>{
const br=await chromium.launch();const pg=await br.newPage({viewport:{width:390,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('console',m=>{if(m.type()==='error'&&!/ERR_|Failed to load/.test(m.text()))errs.push(m.text())});
await pg.route('https://generativelanguage.googleapis.com/**',r=>{
 const u=r.request().url();
 if(u.includes('generateContent')){const b=JSON.parse(r.request().postData());
  if(!b.contents[0].parts.length>1) return r.fulfill({status:500,body:'{}'});
  r.fulfill({status:200,contentType:'application/json',body:JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({subjects:[{name:'Signals and Systems',kind:'theory',topics:['Fourier series','Laplace transform','1. Z-transform','Fourier Series']}]},)}]}}]})})}
 else r.fulfill({status:200,contentType:'application/json',body:'{"models":[]}'})});
await pg.goto('file://'+process.cwd()+'/test.html');
await pg.evaluate(()=>{location.hash='setup'});await pg.waitForTimeout(300);
await pg.click('[data-act=startblank]');await pg.waitForTimeout(200);
await pg.click('[data-act=addsub]');
await pg.fill('[data-f=name]','Signals & Systems');
await pg.click('[data-act=ai-enable]');
await pg.click('[data-act=ai-savekey]');console.log('short key err:',await pg.locator('#ai-panel .notice').innerText());
await pg.fill('#ai-key','AIzaFAKEKEYFAKEKEYFAKEKEY1234');await pg.press('#ai-key','Enter');
console.log('chip:',await pg.locator('#ai-panel .chip').first().innerText());
await pg.click('[data-act=ai-test]');await pg.waitForTimeout(200);console.log('note:',await pg.locator('#ai-panel .notice').innerText());
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==','base64');
await pg.setInputFiles('#ai-files',[{name:'syl.png',mimeType:'image/png',buffer:png}]);
await pg.click('[data-act=ai-run]');await pg.waitForSelector('.ai-sub',{timeout:8000});
console.log('proposal:',(await pg.locator('.ai-sub').innerText()).replace(/\n/g,' | '));
await pg.screenshot({path:'ai1.png',fullPage:true});
await pg.click('#ai-addbtn');await pg.waitForTimeout(200);
console.log('topics now:',await pg.locator('[data-f=topics]').first().inputValue());
await pg.click('[data-act=ai-undo]');await pg.waitForTimeout(200);
console.log('after undo:',JSON.stringify(await pg.locator('[data-f=topics]').first().inputValue()));
console.log('overflow:',await pg.evaluate(()=>document.documentElement.scrollWidth>innerWidth));
console.log('errors:',errs);await br.close()})();
