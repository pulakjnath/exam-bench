const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();const p=await b.newPage({viewport:{width:1100,height:900}});
 const errs=[];p.on('pageerror',e=>errs.push('PAGEERR '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/ERR_TUNNEL/.test(m.text()))errs.push(m.text())});
 await p.goto('file://'+process.cwd()+'/test.html');
 // tick first two rows on today
 const boxes=p.locator('[data-chg="tick"]');console.log('rows',await boxes.count());
 await boxes.nth(0).check();await boxes.nth(1).check();
 console.log('ticked',await p.locator('[data-chg="tick"]:checked').count());
 // how
 await p.locator('[data-act="how"]').first().click();console.log('how open',await p.locator('.how').count());
 // replan (today==start so nothing missed) -> use setup button
 await p.evaluate(()=>{location.hash='setup'});await p.waitForTimeout(100);
 await p.click('[data-act="replan"]');await p.waitForTimeout(100);
 // start with my subjects
 await p.evaluate(()=>{location.hash='today'});await p.waitForTimeout(100);
 await p.click('[data-act="startblank"]');await p.waitForTimeout(150);
 console.log('route',await p.evaluate(()=>location.hash));
 await p.click('[data-act="addsub"]');
 await p.fill('[data-f="name"]','Control Systems');
 await p.fill('[data-f="topics"]','Block diagrams\nRouth criterion\nRoot locus\nBode plots');
 await p.click('[data-act="rate"][data-v="weak"]');
 await p.evaluate(()=>{location.hash='today'});await p.waitForTimeout(150);
 console.log('today rows after custom',await p.locator('.tl li').count(), (await p.locator('.tl .ttl').first().innerText()));
 console.log('cover titles',await p.locator('.tl li .ttl').allInnerTexts());
 // add a task
 await p.evaluate(()=>{location.hash='tasks'});await p.waitForTimeout(100);
 await p.click('[data-act="addtask"]');await p.fill('#tk-title','Control record');await p.selectOption('#tk-type','lab');await p.fill('#tk-items','4');await p.fill('#tk-per','30');
 await p.click('[data-act="savetask"]');await p.waitForTimeout(100);
 console.log('tasks',await p.locator('.panel strong').allInnerTexts());
 // simulate being 3 days into plan: change startDate to 3 days ago
 await p.evaluate(()=>{location.hash='setup'});await p.waitForTimeout(100);
 const d=new Date();d.setDate(d.getDate()-3);const iso=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
 await p.fill('[data-f="startDate"]',iso);await p.locator('[data-f="startDate"]').dispatchEvent('change');
 await p.evaluate(()=>{location.hash='today'});await p.waitForTimeout(150);
 console.log('banner replan',await p.locator('[data-act="replan"]').count());
 await p.click('[data-act="replan"]');await p.waitForTimeout(150);
 console.log('after replan start',await p.evaluate(()=>S.settings.startDate),'covered',JSON.stringify(await p.evaluate(()=>S.coveredBase)));
 console.log(errs.join('\n')||'no errors');
 await b.close();
})();
