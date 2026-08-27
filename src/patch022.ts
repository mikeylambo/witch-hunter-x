import * as THREE from "three";
import "./patch021";
import {CombatGame} from "./game";
import {CharacterFrame021} from "./characterFrame021";

type AnyGame=CombatGame&Record<string,any>;

// --- Character Frame 0.22: keep animated feet above the gameplay plane. ---
const CF:any=CharacterFrame021.prototype as any;
const oldLoad=CF.load;
const oldUpdate=CF.update;
CF.load=async function(this:any){
  const result=await oldLoad.call(this);
  this._groundBaseY=this.visual.position.y;
  this.root.updateMatrixWorld(true);
  const rootPos=this.root.getWorldPosition(new THREE.Vector3());
  const feet=[this.socket("foot_l"),this.socket("foot_r")].filter(Boolean);
  if(feet.length){
    const minY=Math.min(...feet.map((f:any)=>f.getWorldPosition(new THREE.Vector3()).y));
    this._groundFootRef=minY-rootPos.y;
  }else this._groundFootRef=0;
  return result;
};
CF.update=function(this:any,dt:number,sig:any={}){
  if(this._groundBaseY!==undefined)this.visual.position.y=this._groundBaseY;
  oldUpdate.call(this,dt,sig);
  // Procedural locomotion is only a temporary fallback. Keep it restrained so
  // the Alpha-41 legs do not over-rotate before authored clips replace it.
  if(sig.moving&&this.pose==="idle"){
    const tl=this.bones.get("thigh_l"),tr=this.bones.get("thigh_r");
    // Counter a portion of the legacy procedural swing rather than stacking more motion.
    if(tl)tl.quaternion.slerp(this.baseQuat?.get?.(tl)||tl.quaternion,.28);
    if(tr)tr.quaternion.slerp(this.baseQuat?.get?.(tr)||tr.quaternion,.28);
  }
  this.root.updateMatrixWorld(true);
  const feet=[this.socket("foot_l"),this.socket("foot_r")].filter(Boolean);
  if(feet.length&&this._groundFootRef!==undefined){
    const rootY=this.root.getWorldPosition(new THREE.Vector3()).y;
    const currentMin=Math.min(...feet.map((f:any)=>f.getWorldPosition(new THREE.Vector3()).y));
    const targetMin=rootY+this._groundFootRef;
    const penetration=targetMin-currentMin;
    if(penetration>0.006)this.visual.position.y+=(penetration+0.006);
  }
};

// --- Shared Camera 2.1: fit every living hunter; zoom is derived from FOV. ---
const P:any=CombatGame.prototype as any;
P.start=function(this:AnyGame){
  this.running=true;this.last=performance.now();if(this.missionStage===0)this.startMission();
  this.cameraInitialized=false;this.cameraFocus=new THREE.Vector3();
  const tick=(now:number)=>{
    if(!this.running)return;requestAnimationFrame(tick);
    const dt=Math.min(.033,(now-this.last)/1000);this.last=now;this.elapsed+=dt;
    this.decayStyle(dt);this.players.forEach((p:any,i:number)=>this.updatePlayer(p,i,dt));
    this.enemies.forEach((e:any)=>this.updateEnemy(e,dt));this.projectiles.forEach((p:any)=>this.updateProjectile(p,dt));
    this.enemies=this.enemies.filter((e:any)=>!e.dead);this.projectiles=this.projectiles.filter((p:any)=>!p.dead);this.progression();

    const alive=this.players.filter((p:any)=>p.active&&!p.downed);
    const camPlayers=alive.length?alive:this.players.filter((p:any)=>p.active);
    const center=new THREE.Vector3();camPlayers.forEach((p:any)=>center.add(p.mesh.position));center.multiplyScalar(1/Math.max(1,camPlayers.length));

    // Cohesion is a last resort, not a replacement for zoom. Hunters can spread much farther now.
    camPlayers.forEach((p:any)=>{
      const d=p.mesh.position.distanceTo(center);
      if(d>14.5){const pull=center.clone().sub(p.mesh.position);pull.y=0;if(pull.lengthSq())p.vel.add(pull.normalize().multiplyScalar((d-14.5)*dt*2.2));}
    });

    // Mandatory targets: every living hunter. Include a nearby boss without sacrificing a hunter.
    const targets=camPlayers.map((p:any)=>p.mesh.position.clone().add(new THREE.Vector3(0,.9,0)));
    if(this.boss&&!this.boss.dead&&this.boss.mesh.position.distanceTo(center)<15)targets.push(this.boss.mesh.position.clone().add(new THREE.Vector3(0,1.1,0)));
    const focus=new THREE.Vector3();targets.forEach((v:THREE.Vector3)=>focus.add(v));focus.multiplyScalar(1/Math.max(1,targets.length));

    let radius=2.8;
    for(const v of targets)radius=Math.max(radius,v.distanceTo(focus));
    radius+=1.35; // character + HUD safety margin

    const vHalf=THREE.MathUtils.degToRad(this.camera.fov*.5);
    const hHalf=Math.atan(Math.tan(vHalf)*Math.max(.5,this.camera.aspect));
    const limitingHalf=Math.max(.22,Math.min(vHalf,hHalf));
    let distance=radius/Math.sin(limitingHalf);
    distance=THREE.MathUtils.clamp(distance,10.5,39);

    // Fixed cinematic pitch; distance alone performs the fit/zoom.
    const dir=new THREE.Vector3(0,.72,1).normalize();
    const desired=focus.clone().addScaledVector(dir,distance);
    const zoomEase=1-Math.pow(.025,dt),focusEase=1-Math.pow(.008,dt);
    if(!this.cameraInitialized){this.camera.position.copy(desired);this.cameraFocus.copy(focus);this.cameraInitialized=true;}
    this.camera.position.lerp(desired,zoomEase);this.cameraFocus.lerp(focus,focusEase);this.camera.lookAt(this.cameraFocus);
    this.renderer.render(this.scene,this.camera);
  };
  requestAnimationFrame(tick);
};

const observer=new MutationObserver(()=>document.querySelectorAll(".corner").forEach(e=>{if(e.textContent?.includes("BUILD 0.21")||e.textContent?.includes("BUILD 0.20"))e.textContent="BUILD 0.22 // CAMERA + GROUNDING"}));
observer.observe(document.documentElement,{subtree:true,childList:true});
