const {chromium}=require('playwright');
(async()=>{
const br=await chromium.launch();const pg=await br.newPage({viewport:{width:390,height:900}});
const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.cwd()+'/test.html');
await pg.evaluate(()=>{location.hash='setup'});await pg.waitForTimeout(300);
await pg.click('[data-act=startblank]');await pg.click('[data-act=addsub]');await pg.fill('[data-f=name]','S');
await pg.click('[data-act=ai-enable]');await pg.fill('#ai-key','AIzaFAKEKEYFAKEKEYFAKEKEY1234');await pg.press('#ai-key','Enter');
for(const sel of ['label[for=ai-files]','label[for=ai-cam]']){
 const [fc]=await Promise.all([pg.waitForEvent('filechooser',{timeout:3000}).catch(e=>null),pg.click(sel)]);
 console.log(sel,'chooser:',!!fc);
 if(fc){await fc.setFiles({name:'notes.heic',mimeType:'',buffer:Buffer.from('x')});await pg.waitForTimeout(300);console.log(' listed:',await pg.locator('.files li').count(),'err:',await pg.locator('#ai-panel .notice').allInnerTexts())}}
await pg.screenshot({path:'fc.png'});console.log('errors',errs);await br.close()})();
