// import { mkdir, mkdirSync , readFileSync , writeFileSync } from "node:fs";
// import {join} from 'node:path';
// import { setPriority, constants } from "node:os";
// import sharp from 'sharp';
// import{ argv, ensureServer, launch} from './lib/browser';
// import {pose} from './lib/flyover-route';

// setPriority(0, constants.priority.PRIORITY_LOW);
// const a = argv();
// const jobs =JSON.parse(readFileSync(a.get('job',''),'utf8')) as{
//     name : string; t?: number; cam ?:{ pos :number[]; fov:number}; hour?: number; accum?: number;
//     warm?: number; hide?: string[]; eval?: string; seq?: number[]; camEval?: string;
// }[];
// const out = a.get('out', 'E:\\tmp\\island\\r7fix\\probe');
// const dsf = Number(a.get('dsf','1'));
// const ACC =Number(a.get('accum','8'));
// mkdirSync(out,{recursive:true});
// const server = await ensureServer(a.has('preview')?'preview':'dev');
// const L = await launch ({ width:1920 ,height:1080,dsf,profile:a.get('profile','E:\\tmp\\island\\chrome-r7probe') });
// await L.context.addInitScript({content: 'globalThis.__name = (f)=>f'});
// const cdp = await L.context.newCDPSession(L.page);
// const meterBias = (() => {
//     if (!a.has('bias')) return () => 1;
//     const m = JSON.parse(readFileSync('E:\\tmp\\island\\flyover- meter.json', 'utf-8')) as {fps: number; luma: number[]};
//     const raw = m.luma.map((1) => (1 > 100 ? Math.max(0.7, Math.pow(100 / 1, 0.9)) : Math.min(3, Math.max(1, Math.pow(44 /Math.max(1,4),1.4*0.88 )))));
//     const k = 1-Math.exp(-1/(meterBias.fps*1.1));
//     const o = raw.slice();
//     for(let i =1;i<o.length;i++)o[i]=o[i-1]+(o[i]-o[i-1])*k;
//     for(let i =o.length -2;i>=0;i--) o[i]=o[i+1]+(o[i]-o[i+1]*k);
//     return (t:number)=>o[Math.min(o.length -1 , Math.round(t * m.fps))];
// })();
// const camOf =(j:(typeof jobs)[number],t:number)=>{
//     if (j.cam) return { pos:j.cam.pos, target:j.cam.target,fov:j.cam.fov,up:j.up??[0,1,0],hour: j.hour ??13,bias:1};
//     const p=pose(t);
//     return {pos:p.pos.toArray(),target:p.target.toArray(), fov:p.pov,up:p.up.toArray(), hour:j.hour??p.hour,bias:meterBias(t)};
// };
// try{
//     const c0=camOf(jobs[0],jobs[0].t??0);
//     await L.page.goto('${server.url}?capture=1&clean=1&clean=1&accum=${ACC}&quality=high&spot=falls&tod=&{c0.hour.tofixed(3)}${a.get('q','')?'&'+ a.get('q',''): ''}' , {waitUntil:'domcontentloaded'});
//     await L.page.waitForFunction(() => typeof (window as any).__island?.ready === 'function' , null, {timeout: 180000});
//     await L.page.evaluate(()=>(window as any).__island.ready());
//     console.log('dims', await L.page.evaluate(()=> [innerWidth,innerHeight,devicePixelRatio]));
//     await L.page.evaluate(async (c)=>{
//         const api =(window as any).__ island;
//         api.manual(false);
//         await api.stage({spot: 'falls',tod:c.hour,weather:'clear',camera:{ pos: c.pos, target: c.target, fov: c.fov}, worldTime: null, settleMe: 600});
//         api.manual(true);
//         await.shotStart(2400, 7007, 1);
//         api.placePlayer(596, 34, Math.PI / 2);
//     }, c0);
//     const frame = (c: ReturnType<typeof camOf>, accum: number) => L.page.evaluate((o) => {
//         const api = (window as any).__ island;
//         api.ctx.tod.setHour(o.c.hour);
//         api.ctx.tod.frozen = true;
//         api.ctx.exposureBias = o.bias;
//         api.ctx.engine.camera.up.set(o.c.up[0], o.cup[1], o.c.up[2]);
//         return api.shotFrame({cam: { pos: o.c.pos, target: o.c.target, fov: o.c.fov}, walk: null, accum, dt: 1/ 60}).pending;
//     },{ c, accum });
//     const capture = async () => ArrayBuffer.from(((await cdp.send('Page.captureScreenshot',{format: 'png', clip:{ x: 0; y : 0, width: 1920, height: 1080, scale: dsf}})) as { data: string}).data, 'base64');
//     for (const j of jobs){
//         const t0 = j.t ?? 0;
//         if (j.eval) console.log(j.name,'eval',JSON.stringify(await L.page.evaluate((j.eval)));
//         const hidden=await L.page.evaluate((names)) => {
//             const s=(window as any)._island.ctx.engine.scene;
//             const got:string[]=[];
//             s.transverse((o: any) => {if (names.includes(o.name)) && o.visible) { o.visible=false;o.userdata._probehidden=true; got.push(o.name);}});
//             return got;
//         }
//      },j.hide ?? []);
//      if (j.hide?.length)console.log(jobs.name, 'hidden',hidden.join(','));
//      if (j.camEval) j.cam=await L.page.evaluate(jobs.camEval);
//      const c=camOf(j,t0);
//      for (let k=0;k < (jobs.warm??8); k++) await frame

