import * as THREE from "three";
import {CombatGame} from "./game";
import {CharacterFrame021,CFStyle} from "./characterFrame021";

type AnyGame=CombatGame&Record<string,any>;
const P:any=CombatGame.prototype as any;

const oldValeLight=P.valeLight,oldValeHeavy=P.valeHeavy,oldValeFracture=P.valeFracture;
const oldKnoxLight=P.knoxLight,oldKnoxHeavy=P.knoxHeavy,oldKnoxSignature=P.knoxSignature;
const oldMorrowLight=P.morrowLight,oldMorrowHeavy=P.morrowHeavy,oldMorrowCommand=P.morrowCommand;
const oldDefense=P.useDefense;

P.loadRivenProductionModel=function(this:AnyGame){queueMicrotask(()=>loadRoster(this))};

async function install(g:AnyGame,i:number,url:string,style:CFStyle,height=1.85){
 const p=g.players[i];if(!p)return false;
 try{
  p.characterFrame?.root?.removeFromParent?.();
  const cf=new CharacterFrame021(url,style,height);await cf.load();cf.root.rotation.y=Math.PI;p.mesh.add(cf.root);p.characterFrame=cf;p.placeholder.visible=false;p.rigLabel=cf.rigLabel;
  if(style==="versatile")cf.setWeaponFrame(p.weapons[p.weaponIndex]);return true;
 }catch(e){console.error(`${p.name} production model failed`,e);p.placeholder.visible=true;return false}
}
async function loadRoster(g:AnyGame){
 g.onProductionAsset?.("ALPHA // LOADING 4 PRODUCTION MODELS");
 const specs:[[number,string,CFStyle,number],[number,string,CFStyle,number],[number,string,CFStyle,number],[number,string,CFStyle,number]]=[
  [0,"/assets/riven-rigged.glb","versatile",1.85],[1,"/assets/vale.glb","precision",1.85],[2,"/assets/knox.glb","force",1.9],[3,"/assets/morrow.glb","command",1.85]
 ];
 const r=await Promise.all(specs.map(s=>install(g,...s)));const rigs=g.players.map((p:any)=>`${p.name.toUpperCase()}:${p.rigLabel||"FALLBACK"}`).join(" · ");g.onProductionAsset?.(`ALPHA // ${r.filter(Boolean).length}/4 RIGS ONLINE · ${rigs}`)
}

P.valeLight=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("light",.24);return oldValeLight.call(this,p,i)};
P.valeHeavy=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("heavy",.46);return oldValeHeavy.call(this,p,i)};
P.valeFracture=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("switch",.38);return oldValeFracture.call(this,p,i)};
P.knoxLight=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("light",.27);return oldKnoxLight.call(this,p,i)};
P.knoxHeavy=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("heavy",.52);return oldKnoxHeavy.call(this,p,i)};
P.knoxSignature=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("switch",.48);return oldKnoxSignature.call(this,p,i)};
P.morrowLight=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("light",.30);return oldMorrowLight.call(this,p,i)};
P.morrowHeavy=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("heavy",.50);return oldMorrowHeavy.call(this,p,i)};
P.morrowCommand=function(this:AnyGame,p:any,i:number){p.characterFrame?.trigger("switch",.48);return oldMorrowCommand.call(this,p,i)};
P.useDefense=function(this:AnyGame,p:any,i:number){if(i>0)p.characterFrame?.trigger("parry",.34);return oldDefense.call(this,p,i)};

P.start=function(this:AnyGame){
 this.running=true;this.last=performance.now();if(this.missionStage===0)this.startMission();
 this.cameraInitialized=false;this.cameraFocus=new THREE.Vector3();
 const tick=(now:number)=>{
  if(!this.running)return;requestAnimationFrame(tick);const dt=Math.min(.033,(now-this.last)/1000);this.last=now;this.elapsed+=dt;
  this.decayStyle(dt);this.players.forEach((p:any,i:number)=>this.updatePlayer(p,i,dt));
  this.enemies.forEach((e:any)=>this.updateEnemy(e,dt));this.projectiles.forEach((p:any)=>this.updateProjectile(p,dt));
  this.enemies=this.enemies.filter((e:any)=>!e.dead);this.projectiles=this.projectiles.filter((p:any)=>!p.dead);this.progression();

  const alive=this.players.filter((p:any)=>p.active&&!p.downed),camPlayers=alive.length?alive:this.players.filter((p:any)=>p.active);
  const center=new THREE.Vector3();camPlayers.forEach((p:any)=>center.add(p.mesh.position));center.multiplyScalar(1/Math.max(1,camPlayers.length));
  // Soft tether preserves action-game readability instead of zooming indefinitely.
  camPlayers.forEach((p:any)=>{const d=p.mesh.position.distanceTo(center);if(d>10.5){const pull=center.clone().sub(p.mesh.position);pull.y=0;if(pull.lengthSq())p.vel.add(pull.normalize().multiplyScalar((d-10.5)*dt*5.5))}});
  const focus=center.clone(),p1=this.players[0];if(p1?.active&&!p1.downed)focus.lerp(p1.mesh.position,.12);if(this.boss&&!this.boss.dead&&this.boss.mesh.position.distanceTo(center)<13)focus.lerp(this.boss.mesh.position,.18);
  const ds=camPlayers.map((p:any)=>p.mesh.position.distanceTo(center)).sort((a:number,b:number)=>a-b),useful=ds.length>=4?ds[ds.length-2]:(ds.length?ds[ds.length-1]:0),spread=THREE.MathUtils.clamp(useful,2.5,8.5),ratio=(spread-2.5)/6;
  const desired=focus.clone().add(new THREE.Vector3(0,THREE.MathUtils.lerp(7.2,10.3,ratio),THREE.MathUtils.lerp(8,11.8,ratio))),pe=1-Math.pow(.018,dt),le=1-Math.pow(.006,dt);
  if(!this.cameraInitialized){this.camera.position.copy(desired);this.cameraFocus.copy(focus);this.cameraInitialized=true}this.camera.position.lerp(desired,pe);this.cameraFocus.lerp(focus,le);this.camera.lookAt(this.cameraFocus);this.renderer.render(this.scene,this.camera)
 };requestAnimationFrame(tick)
};

const observer=new MutationObserver(()=>{document.querySelectorAll(".corner").forEach(e=>{if(e.textContent?.includes("BUILD 0.20"))e.textContent="BUILD 0.21 // ALPHA ASSEMBLED"})});
observer.observe(document.documentElement,{subtree:true,childList:true});
