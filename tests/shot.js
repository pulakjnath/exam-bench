const {chromium}=require('playwright');
(async()=>{
 const b=await chromium.launch();
 const errs=[];
 for(const [name,vp,scheme] of [['d',{width:1200,height:900},'light'],['m',{width:400,height:860},'dark']]){
  const p=await b.newPage({viewport:vp,colorScheme:scheme});
  p.on('console',m=>{if(m.type()==='error')errs.push(name+': '+m.text())});
  p.on('pageerror',e=>errs.push(name+' PAGEERR: '+e.message));
  await p.goto('file://'+process.cwd()+'/test.html');
  for(const r of ['today','plan','tasks','setup','guide']){
    await p.evaluate(r=>{location.hash=r},r);
    await p.waitForTimeout(250);
    const ov=await p.evaluate(()=>document.documentElement.scrollWidth>document.documentElement.clientWidth+1);
    if(ov) errs.push(name+' '+r+' horizontal overflow');
    await p.screenshot({path:`s_${name}_${r}.png`,fullPage:false});
  }
  await p.close();
 }
 console.log(errs.join('\n')||'no errors');
 await b.close();
})();
