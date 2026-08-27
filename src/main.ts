import "./style.css";
import {CombatGame,MissionStats,BuildConfig} from "./game";

const app=document.querySelector("#app") as HTMLElement;
let game:CombatGame|null=null,paused=false;

const defaultSave={
  rank:1,xp:0,completed:0,currency:0,
  unlocks:["Riven Core","Vale Core","Knox Core","Morrow Core"],
  sharedPassive:"relay_capacitor",difficulty:"Hunter",selectedMission:"false_saint",
  hunterMods:{Riven:"entry_edge",Vale:"deep_fracture",Knox:"rebound_drive",Morrow:"guardian_protocol"},
  techniques:{Riven:[],Vale:[],Knox:[],Morrow:[]},clearedMissions:[],campaignStep:0
};
const save={...defaultSave,...(JSON.parse(localStorage.getItem("whx-save")||"null")||{})};
const persist=()=>localStorage.setItem("whx-save",JSON.stringify(save));
const buildConfig=():BuildConfig=>({sharedPassive:save.sharedPassive as any,hunterMods:save.hunterMods,techniques:save.techniques,mission:save.selectedMission as any,difficulty:save.difficulty as any});

function shell(inner:string){app.innerHTML=`<div class="shell"><div class="noise"></div><div class="brand">NEXUS // HUNTER OPERATIONS<strong>WITCH HUNTER // X</strong></div>${inner}<div class="corner">BUILD 0.20 // FIRST REAL HUNTER</div></div>`}

function title(){shell(`<main class="content"><div class="kicker">HUNT // BREAK // ASCEND</div><h1>Witch<br>Hunter // X</h1><p>Four hunters. One battlefield. Character-action depth engineered for local co-op.</p><div class="menu">
<button data-go="hub">ENTER NEXUS<div class="sub">Campaign hub · 1–4 local players / CPU companions</div></button>
<button data-go="hunters">HUNTERS<div class="sub">Combat identities and progression</div></button>
<button data-go="loadouts">LOADOUTS<div class="sub">Equipment, passive and tactical setup</div></button>
<button data-go="settings">SETTINGS</button><button data-go="database">DATABASE</button></div></main>`);wire()}


function hub(){
 shell(`<main class="content" style="width:min(1060px,90vw)"><div class="kicker">NEXUS // HUNTER OPERATIONS</div><h1 style="font-size:52px">Operations<br>Floor</h1>
 <p>NEXUS manufactures anomaly-interfacing combat equipment and deploys Alpha against Witch incidents. The contract gets the crew through the door; the hunt is personal.</p>
 <div class="hubgrid">
  <div class="card" data-go="join"><div class="badge">ALPHA TEAM</div><h3>Assemble Hunters</h3><p>Four simultaneous hunters. Empty local seats are CPU-controlled until a gamepad takes over.</p></div>
  <div class="card" data-go="missions"><div class="badge">OPERATIONS</div><h3>Incident Board</h3><p>Campaign hunts, rival encounters and mission grades.</p></div>
  <div class="card" data-go="loadouts"><div class="badge">NEXUS ARMORY</div><h3>Loadouts</h3><p>Core mods, passives, techniques and tactical pulses.</p></div>
  <div class="card" data-go="database"><div class="badge">ARCHIVE</div><h3>Witch Database</h3><p>Threat taxonomy, rivals, combat-state doctrine and records.</p></div>
 </div><div class="menu"><button data-go="title">EXIT TO TITLE</button></div></main>`);wire()
}
function join(){shell(`<main class="content"><div class="kicker">LOCAL PARTY</div><h1>Assemble<br>Alpha</h1><p>All four hunters deploy together. P1 uses keyboard. P2–P4 default to CPU companions and are taken over automatically by connected gamepads.</p><div class="join-grid">${["RIVEN // VERSATILE","VALE // PRECISION","KNOX // FORCE","MORROW // COMMAND"].map((x,i)=>`<div class="join ready"><b>P${i+1} · ${x}</b><div class="sub">${i===0?"KEYBOARD // HUMAN":"CPU // GAMEPAD TAKEOVER READY"}</div></div>`).join("")}</div><div class="menu"><button data-go="missions">CONTINUE TO OPERATIONS</button><button data-go="hub">BACK TO NEXUS</button></div></main>`);wire()}

function hunters(){const data=[
["RIVEN","SWITCH","Arsenal Core: Blade, Breaker, Gunform and Twin Arms. Parry-Switch turns defense into an Entry attack."],
["VALE","CUT","Cuts stack as overlays. Fracture and Judgment turn precise setup into delayed spatial collapse."],
["KNOX","SEIZE","TK constructs own mass and momentum. Seize-Catch redirects incoming attacks."],
["MORROW","COMMAND","Three persistent machines extend attacks, suspend targets and intercept threats remotely."]
];shell(`<main class="content" style="width:min(980px,88vw)"><div class="kicker">ROSTER</div><h1 style="font-size:46px">Hunters</h1><div class="hunters">${data.map(d=>`<div class="hunter-card"><div class="badge">${d[1]}</div><h3>${d[0]}</h3><p>${d[2]}</p><div class="stat">MOD // ${(save.hunterMods[d[0]]||"CORE").replaceAll("_"," ").toUpperCase()}</div></div>`).join("")}</div><div class="menu"><button data-go="loadouts">LOADOUTS</button><button data-go="title">BACK</button></div></main>`);wire()}

const passiveInfo:any={
 relay_capacitor:["Relay Capacitor","Handoffs generate substantially more X Gauge."],
 break_amp:["Break Amplifier","State pressure builds enemy Break faster."],
 recovery_mesh:["Recovery Mesh","Reduces incoming damage for the active party."]
};
const modInfo:any={
 Riven:{entry_edge:["Entry Edge","Stronger Arsenal Entry attacks."],overclock_feed:["Overclock Feed","Switching generates X Gauge."]},
 Vale:{deep_fracture:["Deep Fracture","Light strings can plant additional Cuts."],clean_line:["Clean Line","Judgment favors lower-hit precision routing."]},
 Knox:{rebound_drive:["Rebound Drive","Seize-Catch reflect is the default counter build."],atlas_grip:["Atlas Grip","Greatly increases Seize acquisition range."]},
 Morrow:{guardian_protocol:["Guardian Protocol","Successful Network Guard generates X Gauge."],swarm_logic:["Swarm Logic","Coordinated attacks issue an extra drone order."]}
};
const techniqueInfo:any={
 Riven:[["quick_relay","Quick Relay","Reduces normal Arsenal switch recovery."]],
 Vale:[["crosscut","Crosscut","Precise Lights sometimes plant a second spatial Cut."]],
 Knox:[["counterweight","Counterweight","Seize throws gain additional momentum."]],
 Morrow:[["dual_order","Dual Order","Heavy commands dispatch an additional machine."]]
};
function loadouts(){
 shell(`<main class="content" style="width:min(1120px,92vw)"><div class="kicker">EQUIPMENT / PASSIVES / TECHNIQUES</div><h1 style="font-size:44px">Loadouts</h1>
 <p>Low slot-count buildcraft: one shared passive, one identity mod per hunter, permanent technique unlocks, and two mission-use Recovery Pulses.</p>
 <div class="loadouts">${Object.entries(passiveInfo).map(([id,v]:any)=>`<div class="loadout-card ${save.sharedPassive===id?"selected":""}" data-passive="${id}"><div class="badge">SHARED PASSIVE</div><h3>${v[0]}</h3><p>${v[1]}</p><div class="stat">${save.sharedPassive===id?"EQUIPPED":"SELECT"}</div></div>`).join("")}</div>
 <h2 style="margin-top:28px">Hunter Mods</h2><div class="loadouts">${Object.entries(modInfo).map(([hunter,mods]:any)=>Object.entries(mods).map(([id,v]:any)=>`<div class="loadout-card ${save.hunterMods[hunter]===id?"selected":""}" data-mod-hunter="${hunter}" data-mod="${id}"><div class="badge">${hunter.toUpperCase()}</div><h3>${v[0]}</h3><p>${v[1]}</p><div class="stat">${save.hunterMods[hunter]===id?"EQUIPPED":"SELECT"}</div></div>`).join("")).join("")}</div>
 <h2 style="margin-top:28px">Techniques</h2><div class="loadouts">${Object.entries(techniqueInfo).map(([hunter,arr]:any)=>arr.map((t:any)=>{const owned=(save.techniques[hunter]||[]).includes(t[0]);return `<div class="loadout-card ${owned?"selected":""}" data-tech-hunter="${hunter}" data-tech="${t[0]}"><div class="badge">${hunter.toUpperCase()} // PERMANENT</div><h3>${t[1]}</h3><p>${t[2]}</p><div class="stat">${owned?"UNLOCKED":"80 MARKS"}</div></div>`}).join("")).join("")}</div>
 <div class="menu"><button data-go="title">BACK</button></div></main>`);wire();
 document.querySelectorAll("[data-passive]").forEach(el=>el.addEventListener("click",()=>{save.sharedPassive=(el as HTMLElement).dataset.passive;persist();loadouts()}));
 document.querySelectorAll("[data-mod]").forEach(el=>el.addEventListener("click",()=>{const h=(el as HTMLElement).dataset.modHunter!,m=(el as HTMLElement).dataset.mod!;save.hunterMods[h]=m;persist();loadouts()}));
 document.querySelectorAll("[data-tech]").forEach(el=>el.addEventListener("click",()=>{const h=(el as HTMLElement).dataset.techHunter!,t=(el as HTMLElement).dataset.tech!;save.techniques[h]??=[];if(!(save.techniques[h]||[]).includes(t)&&save.currency>=80){save.currency-=80;save.techniques[h].push(t);persist();loadouts()}}));
}
const missionsData:any={
 false_saint:["INCIDENT 001","False Saint","Purge a mixed witch cell, then fight the Magical Girl-class False Saint through three boss phases."],
 hex_district:["INCIDENT 002","Hex District","Suppress escalating ritual surges, break coven formations, and eliminate the Matriarch."],
 black_procession:["INCIDENT 003","Black Procession","Defend a moving Procession Core against Siren disruption before Halcyon intercepts."],
 mirror_hunt:["INCIDENT 004","Mirror Hunt","Purge false bodies, identify a Succubus Witch's true signature, then resist Vesper's Fixation."]
}; 
const briefingData:any={
 false_saint:["STOLEN NEXUS HARDWARE","A Magical Girl-class Witch has fused stolen NEXUS components into her transformation system.","Recover the Core if possible. Marrow is not expected to cooperate."],
 hex_district:["COVEN LOCKDOWN","District infrastructure is being used as a distributed ritual array.","Break the formations. Kill the Matriarch. Do not let the city become the spell."],
 black_procession:["MOVING ASSET","A NEXUS Procession Core must cross a Siren-contaminated corridor.","Stay together. Sirens are strongest when Alpha stops acting like a team."],
 mirror_hunt:["FALSE BODIES","Vesper has seeded duplicate signatures through the sector.","Ignore appearance. Follow the anomaly signature. The real witch will eventually have to look back."]
};
function missionUnlocked(id:string){
 const order=["false_saint","hex_district","black_procession","mirror_hunt"];const idx=order.indexOf(id);
 return idx===0||(save.clearedMissions||[]).includes(order[idx-1])||save.completed>=idx;
}
function briefing(){
 const b=briefingData[save.selectedMission],m=missionsData[save.selectedMission];
 shell(`<main class="content" style="width:min(1040px,90vw)"><div class="kicker">${m[0]} // COMIC BRIEFING</div><h1 style="font-size:48px">${m[1]}</h1>
 <div class="comicgrid"><div class="comicpanel"><b>NEXUS OPS</b><p>${b[0]}</p></div><div class="comicpanel"><b>INTEL</b><p>${b[1]}</p></div><div class="comicpanel"><b>ALPHA</b><p>${b[2]}</p></div></div>
 <div class="menu"><button data-play>DEPLOY ALPHA</button><button data-go="missions">BACK TO BOARD</button></div></main>`);wire()
}
function missions(){
 shell(`<main class="content" style="width:min(1040px,90vw)"><div class="kicker">MISSION BOARD</div><h1 style="font-size:46px">Incidents</h1><div class="missions">
 ${Object.entries(missionsData).map(([id,m]:any)=>{const unlocked=missionUnlocked(id);return `<div class="card ${save.selectedMission===id?"selected":""} ${unlocked?"":"locked"}" ${unlocked?`data-mission="${id}"`:""}><div class="badge">${m[0]} // ${unlocked?"AVAILABLE":"LOCKED"}</div><h3>${m[1]}</h3><p>${m[2]}</p><div class="stat">${unlocked?(save.selectedMission===id?"SELECTED":"SELECT INCIDENT"):"CLEAR PRIOR INCIDENT"}</div></div>`}).join("")}
 </div><div class="menu"><button data-go="briefing">BRIEFING // ${missionsData[save.selectedMission][1].toUpperCase()}</button><button data-go="hub">BACK TO NEXUS</button></div></main>`);wire();
 document.querySelectorAll("[data-mission]").forEach(el=>el.addEventListener("click",()=>{save.selectedMission=(el as HTMLElement).dataset.mission;persist();missions()}));
}
function settings(){
 shell(`<div class="panel-wrap"><section class="panel"><div class="panel-head"><h2>Settings</h2><button class="close" data-go="title">CLOSE</button></div>
 ${row("Difficulty","Initiate reduces aggression/damage. Alpha accelerates enemy behavior and increases damage.",`<select id="difficulty"><option ${save.difficulty==="Initiate"?"selected":""}>Initiate</option><option ${save.difficulty==="Hunter"?"selected":""}>Hunter</option><option ${save.difficulty==="Alpha"?"selected":""}>Alpha</option></select>`)}
 ${row("Camera","Shared framing",`<select><option selected>Dynamic</option><option>Tight</option><option>Wide</option></select>`)}
 ${row("Screen Shake","Impact intensity",`<input type="range" min="0" max="100" value="70">`)}
 ${row("VFX Density","Future four-player readability control",`<input type="range" min="20" max="100" value="80">`)}
 ${row("Auto Lock Assist","Shared-screen targeting aid",`<input type="checkbox" checked>`)}
 </section></div>`);wire();document.querySelector("#difficulty")?.addEventListener("change",(e)=>{save.difficulty=(e.target as HTMLSelectElement).value;persist()})
}
function row(a:string,b:string,c:string){return `<div class="row"><div><label>${a}</label><small>${b}</small></div>${c}</div>`}

function database(){shell(`<div class="panel-wrap"><section class="panel"><div class="panel-head"><h2>Database // 0.20</h2><button class="close" data-go="title">CLOSE</button></div>
<p><b>NEXUS doctrine:</b> Witch phenomena distort physical rules; NEXUS equipment is engineered to interact with that distortion without making the hunters innate magic users.</p><p><b>Positional:</b> Ground / Launch / Carry / Suspend / Spike / Wallsplat. <b>Overlays:</b> Cut / Tether / Break. Repeating one control state decays; chaining different states remains rewarded.</p>
<div class="row"><div><label>Player 1</label><small>WASD · J Light · K Heavy · L Signature · Q Defense · Space Evade · R Install · F Recovery Pulse · E Revive · Esc Pause</small></div></div>
<div class="row"><div><label>Players 2–4</label><small>LS Move · A Light · X Heavy · Y Signature · LB Defense · B Evade · RT Install · D-pad Up Pulse · RB Revive · Start Pause</small></div></div>
<div class="row"><div><label>Witch Roles</label><small>Hex: projectile pressure · Coven: formation support · Ritual: interrupt checks · Siren: formation disruption · Succubus: fixation/mirroring · Magical Girl: rival-protagonist boss class</small></div></div><div class="row"><div><label>Named Threats</label><small>Marrow // False Saint · Eidra // Coven Matriarch · Halcyon // Siren Prime · Vesper // Succubus Witch</small></div></div>
<div class="row"><div><label>Production Asset</label><small>Riven: rigged GLB · Mixamo humanoid skin · Character Frame bone/socket mapping · procedural fallback animation layer</small></div></div><div class="row"><div><label>Profile</label><small>Hunter Rank ${save.rank} · ${save.xp} XP · ${save.currency} Marks · ${save.completed} clears</small></div></div></section></div>`);wire()}

function showToast(text:string){const host=document.querySelector("#toast") as HTMLElement;if(!host)return;host.innerHTML=`<div class="toast">${text}</div>`;setTimeout(()=>{if(host)host.innerHTML=""},720)}

function play(){app.innerHTML=`<div id="game"></div><div class="gamehud"><div class="topbar"><div><div class="missionname">${missionsData[save.selectedMission][0]} // ${missionsData[save.selectedMission][1].toUpperCase()}</div><div id="objective" class="objective">OBJECTIVE: --</div></div><div><div class="missionname">HUNTER RANK // ${save.rank}</div><div id="teamStyle" class="teamstyle">STYLE D // 0</div></div></div>
<div id="missionProgress" class="missionprogress hidden"><div id="missionProgressName" class="label"></div><div class="bar"><div id="missionProgressFill" class="fill"></div></div></div><div id="bossHud" class="bosshud hidden"><div id="bossName" class="label"></div><div class="bar"><div id="bossFill" class="fill"></div></div><div id="bossState" class="badge"></div></div><div id="toast"></div><div id="productionAsset" class="productionasset">RIVEN // PRODUCTION ASSET INITIALIZING</div>
<div class="players">${["RIVEN // VERSATILE","VALE // PRECISION","KNOX // FORCE","MORROW // COMMAND"].map((n,i)=>`<div class="pbox" id="pbox-${i}"><div class="name">P${i+1} // ${n}</div><div class="bar"><div class="fill" id="php-${i}" style="width:100%"></div></div><div class="xbar"><div class="xfill" id="px-${i}" style="width:0%"></div></div><div class="style" id="pstatus-${i}">STANDBY</div><div class="vital" id="pvital-${i}">HP 100 · X 0 · PULSE 2</div></div>`).join("")}</div></div><div id="pauseLayer"></div>`;
 game=new CombatGame(document.querySelector("#game") as HTMLElement,buildConfig());
 game.onPause=()=>togglePause();
 game.onObjective=(s,hot)=>{const e=document.querySelector("#objective") as HTMLElement;e.textContent="OBJECTIVE: "+s;e.classList.toggle("hot",!!hot)};
 game.onBoss=(hp,max,name,broken)=>{(document.querySelector("#bossHud") as HTMLElement).classList.remove("hidden");(document.querySelector("#bossName") as HTMLElement).textContent=name;(document.querySelector("#bossFill") as HTMLElement).style.width=`${Math.max(0,hp/max*100)}%`;(document.querySelector("#bossState") as HTMLElement).textContent=broken?"BREAK // POSITIONAL LOCKS OPEN":"WARD ACTIVE"};
 game.onProductionAsset=(text)=>{const e=document.querySelector("#productionAsset");if(e)e.textContent=text};
 game.onTeamStyle=(rank,score)=>{const e=document.querySelector("#teamStyle");if(e)e.textContent=`STYLE ${rank} // ${Math.floor(score)}`};
 game.onHunterStatus=(i,label)=>{const e=document.querySelector(`#pstatus-${i}`);if(e)e.textContent=label};
 game.onHunterVitals=(i,hp,maxHp,x,downed,active,consumables)=>{const b=document.querySelector(`#pbox-${i}`) as HTMLElement,h=document.querySelector(`#php-${i}`) as HTMLElement,g=document.querySelector(`#px-${i}`) as HTMLElement,v=document.querySelector(`#pvital-${i}`) as HTMLElement;if(!b)return;b.classList.toggle("inactive",!active);b.classList.toggle("downed",downed);h.style.width=`${hp/maxHp*100}%`;g.style.width=`${x}%`;v.textContent=downed?"DOWN // HOLD REVIVE NEARBY":`HP ${Math.ceil(hp)} · X ${Math.floor(x)} · PULSE ${consumables}`};
 game.onMissionProgress=(label,value,max)=>{const h=document.querySelector("#missionProgress") as HTMLElement;h.classList.remove("hidden");(document.querySelector("#missionProgressName") as HTMLElement).textContent=label;(document.querySelector("#missionProgressFill") as HTMLElement).style.width=`${Math.max(0,value/max*100)}%`};game.onToast=showToast;game.onMissionComplete=results;game.onMissionFailed=failed;game.start();
}

function togglePause(){if(!game)return;paused=!paused;if(paused)game.stop();else game.start();const p=document.querySelector("#pauseLayer") as HTMLElement;p.innerHTML=paused?`<div class="pause"><section class="panel" style="width:min(460px,90vw)"><h2>Paused</h2><div class="menu"><button id="resume">RESUME</button><button id="quit">RETURN TO MISSION BOARD</button></div></section></div>`:"";if(paused){document.querySelector("#resume")?.addEventListener("click",togglePause);document.querySelector("#quit")?.addEventListener("click",()=>{game?.stop();game=null;paused=false;missions()})}}

function gradeFor(s:MissionStats){let score=0;if(s.time<100)score+=2;else if(s.time<165)score+=1;if(s.handOffs>=8)score+=2;else if(s.handOffs>=3)score+=1;if(s.maxChain>=8)score+=2;else if(s.maxChain>=4)score+=1;if(s.downs===0)score++;return score>=6?"S":score>=5?"A":score>=3?"B":score>=2?"C":"D"}
function results(s:MissionStats){game?.stop();game=null;const grade=gradeFor(s),base=save.selectedMission==="false_saint"?0:25,reward=(grade==="S"?190:grade==="A"?150:110)+base;save.completed++;save.xp+=reward;save.currency+=Math.floor(reward/2);while(save.xp>=300){save.rank++;save.xp-=300}save.clearedMissions??=[];if(!save.clearedMissions.includes(save.selectedMission))save.clearedMissions.push(save.selectedMission);persist();shell(`<div class="panel-wrap"><section class="panel"><div class="panel-head"><h2>Mission Complete</h2></div><div class="results"><div><div class="grade">${grade}</div><div class="badge">HUNT GRADE</div></div><div class="metrics">${metric("CLEAR TIME",s.time.toFixed(1)+"s")}${metric("KILLS",s.kills)}${metric("HANDOFFS",s.handOffs)}${metric("MAX CHAIN",s.maxChain)}${metric("DOWNS",s.downs)}${metric("REVIVES",s.revives)}${metric("INSTALLS",s.installs)}${metric("PULSES",s.consumables)}${metric("PARRIES",s.parries)}${metric("REFLECTS",s.reflects)}</div></div><p class="unlock">+${reward} XP · +${Math.floor(reward/2)} Marks</p><div class="menu"><button data-go="missions">NEXT OPERATION</button><button data-go="loadouts">LOADOUTS</button><button data-go="title">TITLE</button></div></section></div>`);wire()}
function metric(k:string,v:any){return `<div class="metric">${k}<b>${v}</b></div>`}
function failed(){game?.stop();game=null;shell(`<div class="panel-wrap"><section class="panel"><div class="kicker">HUNT FAILED</div><h2>ALPHA DOWN</h2><p>The active party was incapacitated. No progression penalty in the current prototype.</p><div class="menu"><button data-play>RETRY INCIDENT</button><button data-go="missions">NEXT OPERATION</button></div></section></div>`);wire()}

function wire(){document.querySelectorAll("[data-go]").forEach(x=>x.addEventListener("click",()=>{const s=(x as HTMLElement).dataset.go;({title,hub,join,hunters,missions,briefing,loadouts,settings,database} as any)[s!]?.()}));document.querySelector("[data-play]")?.addEventListener("click",play)}
title();
