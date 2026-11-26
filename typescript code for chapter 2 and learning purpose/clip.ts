// import {mkdirSync,existsSync,rmSync}from 'node:fs';
// import {join,resolve}from 'node:path';
// import {spawnSync}from 'node:child_process';
// import {argv,ensureServer,launch}from './lib/browser';
// const a=argv();
// const round=a.get('round','dev');
// const fps=Number(a.get('fps','30'));
// const seconds=Number(a.get('seconds','4'));
// const outRoot=resolve(a.get('out'join('artifacts','clips',round)));
// mkdirSync(outRoot,{recursive:true});
// interface ClipDef
// {
//     name:string;spot:string;tod:string;weather:'clear'|'rain';action:string;camera:string;yaw?:number;seconds?:number;
//     fps?:number;timelapse?:{dayMinutes?:number;squall?:number};
// }
// const TIMELAPSES:ClipDef[]=[
//     {name:'timelapse_day',spot:'beach',tod:'4.5',weather:'clear',action:'idle',camera:'shot',seconds:24,fps:15,timelapse:{dayMinutes:0.4}},
//     {name:'timelapse_rain',spot:'beach',tod:'13',weather:'clear',action:'idle',camera:'shot',seconds:25,fps:15,timelapse:{squall:12}},
// ];
// const PRESETS:ClipDef[]=[
//     {name:'walk_beach',spot:'beach',tod:'morning',weather:'clear',action:'walk',camera:'follow',yaw:0.2},
//     {name:'sprint_beach',spot:'beach',tod:'noon',weather:'clear',action:'sprint',camera:'follow',yaw:3.2},
//     {name:'jump_beach',spot:'beach',tod:'noon',weather:'clear',action:'jump',camera:'follow',yaw:0.0,seconds:2.5},
//     {name:'swim_pool',spot:'waterfall',tod:'noon',weather:'clear',action:'swim',camera:'follow',yaw:-1.6},
//     {name:'waves_beach',spot:'beach',tod:'sunrise',weather:'clear',action:'idle',camera:'shot',seconds:8,fps:24},
//     {name:'foliage_jungle',spot:'jungle',tod:'noon',weather:'clear',action:'idle',camera:'shot'},
//     {name:'rain_village',spot:'village',tod:'14.5',weather:'rain',action:'walk',camera:'follow',yaw:3.0},
// ];
// const present=a.get('present','');
// const named=[...PerformanceObserverEntryList,...TIMELAPSES].filter((c)=>c.name===present);
// const list:ClipDef[]=preset==='all'?PRESETS:preset==='timelapse'?TIMELAPSES:named.length?named:[{
//     name:a.get('name','clip'),spot:a.get('spot','beach'),tod:a.get('tod','noon'),weather:a.get('weather','clear')as'clear'|'rain',
//     action:a.get('action','walk'),camera:a.get('camera','follow'),yaw:a.has('yaw')?Number(a.get('yaw','0')):undefined,
// }];