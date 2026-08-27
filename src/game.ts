
import * as THREE from "three";
import {CharacterFrameRuntime} from "./characterFrame";

export type HunterKind="Versatile"|"Precision"|"Force"|"Command";
export type PositionalState="ground"|"launch"|"carry"|"suspend"|"spike"|"wallsplat";
export type OverlayState="cut"|"tether"|"break";
export type MissionStats={
  time:number;kills:number;handOffs:number;maxChain:number;damage:number;bossTime:number;
  parries:number;reflects:number;cuts:number;seizes:number;guards:number;
  downs:number;revives:number;installs:number;consumables:number
};
export type MissionId="false_saint"|"hex_district"|"black_procession"|"mirror_hunt";
export type Difficulty="Initiate"|"Hunter"|"Alpha";
export type BuildConfig={
  sharedPassive?:"relay_capacitor"|"break_amp"|"recovery_mesh";
  hunterMods?:Record<string,string>;
  techniques?:Record<string,string[]>;
  mission?:MissionId;
  difficulty?:Difficulty;
};

const STATE_PRIORITY:Record<PositionalState,number>={
  ground:0,launch:1,spike:2,wallsplat:2,carry:3,suspend:4
};

type WitchType="hex"|"coven"|"ritual"|"siren"|"succubus"|"magical";

type Enemy={
  mesh:THREE.Object3D;type:WitchType;vel:THREE.Vector3;hp:number;maxHp:number;stun:number;dead:boolean;
  state:PositionalState;stateTime:number;lastOwner:number;lastHitClock:number;chain:number;
  elite:boolean;boss?:boolean;name?:string;overlays:Set<OverlayState>;cuts:number;
  controlHistory:Map<PositionalState,{count:number,last:number}>;airHits:number;breakMeter:number;
  shootCd:number;specialCd:number;ritual:number;buffed:boolean;phase:number
};

type Projectile={mesh:THREE.Mesh;vel:THREE.Vector3;owner:"enemy"|"player";dead:boolean;source?:Enemy};
const pX=(p:any,n:number)=>p.x=Math.min(100,(p.x||0)+n);

export class CombatGame{
  scene=new THREE.Scene();renderer:THREE.WebGLRenderer;camera:THREE.PerspectiveCamera;host:HTMLElement;
  players:any[]=[];enemies:Enemy[]=[];projectiles:Projectile[]=[];boss:Enemy|null=null;
  running=false;last=performance.now();elapsed=0;missionStage=0;stageTimer=0;pauseHeld=false;bossStarted=0;
  missionId:MissionId="false_saint";objectiveHp=100;objectiveMax=100;objectiveMesh:THREE.Mesh|null=null;missionWave=0;
  styleScore=0;styleTimer=0;styleStates=new Set<string>();
  colors=[0xff5555,0x66aaff,0xffcc44,0xbb66ff];

  onPause?:()=>void;
  onObjective?:(s:string,hot?:boolean)=>void;
  onBoss?:(hp:number,max:number,name:string,broken:boolean)=>void;
  onMissionComplete?:(s:MissionStats)=>void;
  onHunterStatus?:(index:number,label:string)=>void;
  onHunterVitals?:(index:number,hp:number,maxHp:number,x:number,downed:boolean,active:boolean,consumables:number)=>void;
  onToast?:(text:string)=>void;
  onMissionFailed?:()=>void;
  onMissionProgress?:(label:string,value:number,max:number)=>void;
  onTeamStyle?:(rank:string,score:number)=>void;
  onProductionAsset?:(text:string)=>void;

  stats:MissionStats={
    time:0,kills:0,handOffs:0,maxChain:0,damage:0,bossTime:0,
    parries:0,reflects:0,cuts:0,seizes:0,guards:0,downs:0,revives:0,installs:0,consumables:0
  };

  constructor(host:HTMLElement,public build:BuildConfig={}){
    this.host=host;this.missionId=build.mission||"false_saint";this.scene.background=new THREE.Color(0x08080d);this.scene.fog=new THREE.Fog(0x08080d,22,60);
    this.renderer=new THREE.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));host.appendChild(this.renderer.domElement);
    this.camera=new THREE.PerspectiveCamera(50,1,.1,100);
    this.scene.add(new THREE.HemisphereLight(0xffffff,0x222244,2.2));
    const dl=new THREE.DirectionalLight(0xffffff,3);dl.position.set(4,10,3);this.scene.add(dl);
    const floor=new THREE.Mesh(new THREE.CylinderGeometry(18,18,.6,64),new THREE.MeshStandardMaterial({color:0x181824,roughness:.72,metalness:.15}));floor.position.y=-.3;this.scene.add(floor);
    const grid=new THREE.GridHelper(34,34,0x666688,0x29293a);grid.position.y=.01;this.scene.add(grid);
    addEventListener("resize",()=>this.resize());this.resize();this.seedPlayers();
  }

  resize(){
    const r=this.host.getBoundingClientRect();this.camera.aspect=r.width/r.height;
    this.camera.updateProjectionMatrix();this.renderer.setSize(r.width,r.height)
  }

  seedPlayers(){
    const kinds:HunterKind[]=["Versatile","Precision","Force","Command"];
    const names=["Riven","Vale","Knox","Morrow"];
    for(let i=0;i<4;i++){
      const g=new THREE.Group();
      const placeholder=new THREE.Group();
      const body=new THREE.Mesh(new THREE.CapsuleGeometry(.38,.8,5,10),new THREE.MeshStandardMaterial({color:this.colors[i],emissive:this.colors[i],emissiveIntensity:.18}));
      body.position.y=.8;placeholder.add(body);
      const sig=new THREE.Mesh(new THREE.TorusGeometry(.5,.04,6,18),new THREE.MeshBasicMaterial({color:this.colors[i]}));
      sig.rotation.x=Math.PI/2;sig.position.y=.12;placeholder.add(sig);
      g.add(placeholder);
      g.position.set(i%2?2:-2,0,i<2?-2:2);this.scene.add(g);

      const p:any={
        mesh:g,placeholder,characterFrame:null,vel:new THREE.Vector3(),facing:new THREE.Vector3(0,0,1),cd:0,dodge:0,
        kind:kinds[i],name:names[i],defenseCd:0,defenseWindow:0,defending:false,
        weaponIndex:0,weapons:["BLADE","BREAKER","GUNFORM","TWIN ARMS"],
        guardCut:null,seizeCharges:2,seizeRecharge:0,drones:[],commandCd:0,
        hp:100,maxHp:100,downed:false,reviveProgress:0,invuln:0,x:0,install:0,consumables:2,active:i===0
      };
      this.players.push(p);
      if(i===3)this.spawnMorrowDrones(p);
    }
    this.loadRivenProductionModel();
  }

  async loadRivenProductionModel(){
    const p=this.players[0];if(!p)return;
    this.onProductionAsset?.("RIVEN // LOADING PRODUCTION MODEL");
    try{
      const cf=new CharacterFrameRuntime("/assets/riven-rigged.glb");
      await cf.load();
      cf.root.rotation.y=Math.PI;
      p.mesh.add(cf.root);
      p.characterFrame=cf;
      p.placeholder.visible=false;
      cf.setWeaponFrame(p.weapons[p.weaponIndex]);
      this.onProductionAsset?.("RIVEN // RIG ONLINE · MIXAMO 52-BONE MAP");
    }catch(err){
      console.error("Riven production model failed; retaining primitive fallback.",err);
      this.onProductionAsset?.("RIVEN // ASSET LOAD FAILED · PRIMITIVE FALLBACK");
      p.placeholder.visible=true;
    }
  }

  spawnMorrowDrones(p:any){
    const offsets=[[-1.2,.8,0],[1.2,.8,0],[0,1.2,-1.2]];
    offsets.forEach((o,j)=>{
      const m=new THREE.Mesh(new THREE.OctahedronGeometry(.22),new THREE.MeshStandardMaterial({color:this.colors[3],emissive:this.colors[3],emissiveIntensity:.6}));
      m.position.set(...o as [number,number,number]);this.scene.add(m);p.drones.push({mesh:m,slot:j,cooldown:0});
    });
  }

  spawnEnemy(x:number,z:number,type:WitchType="hex",elite=false):Enemy{
    const palette:Record<WitchType,number>={hex:0xdad6ff,coven:0x9d71ff,ritual:0xffbe55,siren:0x63e7ff,succubus:0xff335f,magical:0xff6fbd};
    const geom=type==="ritual"?new THREE.OctahedronGeometry(elite?.72:.5,0):type==="siren"?new THREE.TetrahedronGeometry(elite?.75:.5,0):new THREE.IcosahedronGeometry(elite?.68:.42,1);
    const mesh=new THREE.Mesh(geom,new THREE.MeshStandardMaterial({color:palette[type],emissive:palette[type],emissiveIntensity:elite?.4:.12}));
    mesh.position.set(x,.55,z);this.scene.add(mesh);
    const hp=elite?34:type==="ritual"?16:type==="coven"?13:10;
    const e:Enemy={
      mesh,type,vel:new THREE.Vector3(),hp,maxHp:hp,stun:0,dead:false,state:"ground",stateTime:0,
      lastOwner:-1,lastHitClock:0,chain:0,elite,overlays:new Set(),cuts:0,controlHistory:new Map(),
      airHits:0,breakMeter:0,shootCd:.8+Math.random()*1.5,specialCd:2+Math.random()*2,ritual:0,buffed:false,phase:1
    };
    this.enemies.push(e);return e;
  }

  wave(count=12,elite=true){
    const roster:WitchType[]=["hex","hex","coven","hex","ritual","hex","siren"];
    for(let i=0;i<count;i++){
      const a=Math.random()*Math.PI*2,r=7+Math.random()*8;
      this.spawnEnemy(Math.cos(a)*r,Math.sin(a)*r,roster[i%roster.length],elite&&i===0);
    }
  }

  spawnBoss(){
    const isMatriarch=this.missionId==="hex_district";
    const isProcession=this.missionId==="black_procession";
    const isMirror=this.missionId==="mirror_hunt";
    const mesh=new THREE.Group();
    const bossColor=isMatriarch?0x9d71ff:isProcession?0x63e7ff:isMirror?0xff335f:0xff6fbd;
    const core=new THREE.Mesh(new THREE.OctahedronGeometry(1.25,1),new THREE.MeshStandardMaterial({color:0xf8f2ff,emissive:bossColor,emissiveIntensity:.62}));
    core.position.y=1.55;mesh.add(core);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(1.55,.08,8,40),new THREE.MeshBasicMaterial({color:bossColor}));
    halo.rotation.x=Math.PI/2;halo.position.y=1.65;mesh.add(halo);
    mesh.position.set(0,0,-10);this.scene.add(mesh);
    const hp=isMatriarch?240:isProcession?230:isMirror?275:260;
    const name=isMatriarch?"COVEN MATRIARCH // EIDRA":isProcession?"SIREN PRIME // HALCYON":isMirror?"SUCCUBUS WITCH // VESPER":"FALSE SAINT // MARROW";
    const e:Enemy={
      mesh,type:isMatriarch?"coven":isProcession?"siren":isMirror?"succubus":"magical",vel:new THREE.Vector3(),hp,maxHp:hp,stun:0,dead:false,state:"ground",stateTime:0,
      lastOwner:-1,lastHitClock:0,elite:true,boss:true,name,overlays:new Set(),cuts:0,chain:0,controlHistory:new Map(),
      airHits:0,breakMeter:0,shootCd:.45,specialCd:1.4,ritual:0,buffed:false,phase:1
    };
    this.boss=e;this.enemies.push(e);this.bossStarted=this.elapsed;this.onBoss?.(e.hp,e.maxHp,e.name!,false);
  }

  spawnObjective(){
    if(this.objectiveMesh)return;
    const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.8),new THREE.MeshStandardMaterial({color:0xffffff,emissive:0x69dfff,emissiveIntensity:.5}));
    m.position.set(0,.9,8);this.scene.add(m);this.objectiveMesh=m;this.objectiveHp=this.objectiveMax=100;
    this.onMissionProgress?.("PROCESSION CORE",this.objectiveHp,this.objectiveMax);
  }

  startMission(){
    this.missionStage=1;
    if(this.missionId==="false_saint"){
      this.onObjective?.("PURGE THE MANIFESTATIONS");this.wave(12,true);
    }else if(this.missionId==="hex_district"){
      this.onObjective?.("SUPPRESS THREE RITUAL SURGES",true);this.missionWave=1;this.wave(9,true);
    }else if(this.missionId==="black_procession"){
      this.onObjective?.("DEFEND THE PROCESSION CORE",true);this.spawnObjective();this.missionWave=1;this.wave(10,true);
    }else{
      this.onObjective?.("IDENTIFY THE TRUE WITCH",true);this.missionWave=1;this.wave(8,true);
    }
  }
  start(){this.running=true;this.last=performance.now();if(this.missionStage===0)this.startMission();requestAnimationFrame(this.loop)}
  stop(){this.running=false}

  input(i:number){
    let x=0,z=0,a=false,h=false,s=false,e=false,def=false,install=false,use=false,revive=false,pause=false;
    if(i===0){
      x=(keys.has("KeyD")?1:0)-(keys.has("KeyA")?1:0);z=(keys.has("KeyS")?1:0)-(keys.has("KeyW")?1:0);
      a=keys.has("KeyJ");h=keys.has("KeyK");s=keys.has("KeyL");e=keys.has("Space");def=keys.has("KeyQ");install=keys.has("KeyR");use=keys.has("KeyF");revive=keys.has("KeyE");pause=keys.has("Escape");
    }else{
      const g=navigator.getGamepads()[i-1];
      if(g){x=g.axes[0]||0;z=g.axes[1]||0;a=g.buttons[0]?.pressed;h=g.buttons[2]?.pressed;s=g.buttons[3]?.pressed;e=g.buttons[1]?.pressed;def=g.buttons[4]?.pressed;install=g.buttons[7]?.pressed;use=g.buttons[12]?.pressed;revive=g.buttons[5]?.pressed;pause=g.buttons[9]?.pressed}
    }
    return{x,z,a,h,s,e,def,install,use,revive,pause};
  }

  aiInput(p:any,i:number){
    const q={x:0,z:0,a:false,h:false,s:false,e:false,def:false,install:false,use:false,revive:false,pause:false};
    if(p.downed)return q;
    const downed=this.players.find(o=>o!==p&&o.active&&o.downed);
    if(downed){
      const d=downed.mesh.position.clone().sub(p.mesh.position);d.y=0;
      if(d.length()>1.7){d.normalize();q.x=d.x;q.z=d.z}else q.revive=true;
      return q;
    }
    if(p.hp<35&&p.consumables>0&&Math.random()<.01)q.use=true;
    if(p.x>=100&&Math.random()<.02)q.install=true;
    const e=this.nearestEnemy(p.mesh.position,18);
    if(!e)return q;
    const d=e.mesh.position.clone().sub(p.mesh.position);d.y=0;const dist=d.length();
    if(dist>1.7){d.normalize();q.x=d.x;q.z=d.z}
    if(dist<2.2&&Math.random()<.10)q.def=true;
    if(p.cd<=0){
      const r=Math.random();
      if(dist<2.0)q.a=r<.52;
      if(dist<3.7&&!q.a)q.h=r<.82;
      if(!q.a&&!q.h)q.s=true;
    }
    return q;
  }

  addStyle(amount:number,tag:string){
    this.styleScore=Math.min(999,this.styleScore+amount);this.styleTimer=5;this.styleStates.add(tag);
    const bonus=Math.min(20,this.styleStates.size*2);const total=this.styleScore+bonus;
    const rank=total>=300?"X":total>=220?"S":total>=150?"A":total>=95?"B":total>=45?"C":"D";
    this.onTeamStyle?.(rank,total);
  }
  decayStyle(dt:number){
    this.styleTimer-=dt;if(this.styleTimer<=0){this.styleScore=Math.max(0,this.styleScore-dt*10);if(this.styleScore<10)this.styleStates.clear();const s=this.styleScore;const r=s>=300?"X":s>=220?"S":s>=150?"A":s>=95?"B":s>=45?"C":"D";this.onTeamStyle?.(r,s)}
  }
  difficultyDamage(){
    return this.build.difficulty==="Alpha"?1.25:this.build.difficulty==="Initiate"?.78:1;
  }
  difficultySpeed(){
    return this.build.difficulty==="Alpha"?1.18:this.build.difficulty==="Initiate"?.88:1;
  }
  hasTechnique(p:any,id:string){return (this.build.techniques?.[p.name]||[]).includes(id)}
  damageScale(e:Enemy){
    return Math.max(.28,1-(e.airHits*.085));
  }

  controlDuration(e:Enemy,state:PositionalState,base:number){
    const now=performance.now()/1000;const h=e.controlHistory.get(state);
    let count=0;if(h&&now-h.last<5)count=h.count;
    count++;e.controlHistory.set(state,{count,last:now});
    return base*Math.max(.25,1-(count-1)*.22);
  }

  canApplyState(e:Enemy,state:PositionalState){
    if(!e.boss)return true;
    if(e.overlays.has("break"))return true;
    return state==="ground"||state==="carry"&&false;
  }

  setState(e:Enemy,state:PositionalState,baseDuration=.55){
    if(!this.canApplyState(e,state))return;
    if(STATE_PRIORITY[state] < STATE_PRIORITY[e.state] && e.stateTime>0)return;
    const duration=this.controlDuration(e,state,baseDuration)*(e.elite && !e.boss ? .65 : 1);
    e.state=state;e.stateTime=duration;
  }

  addOverlay(e:Enemy,overlay:OverlayState){
    e.overlays.add(overlay);
    if(overlay==="cut"){e.cuts++;this.stats.cuts++}
    if(overlay==="break"){e.breakMeter=0;setTimeout(()=>{if(!e.dead)e.overlays.delete("break")},2800)}
  }

  registerHit(e:Enemy,i:number,state:PositionalState){
    const now=performance.now();
    const handoff=e.lastOwner!==-1 && e.lastOwner!==i && e.state!=="ground" && now-e.lastHitClock<1400;
    if(handoff){this.stats.handOffs++;e.chain++;pX(this.players[i],this.build.sharedPassive==="relay_capacitor"?24:18);this.addStyle(18,"handoff")}else if(e.lastOwner===i&&e.state!=="ground")e.chain++;else e.chain=1;
    if(state!=="ground")this.addStyle(4,state);
    e.lastOwner=i;e.lastHitClock=now;this.stats.maxChain=Math.max(this.stats.maxChain,e.chain);
  }

  hitEnemy(e:Enemy,p:any,i:number,dmg:number,state:PositionalState,lift=0,force=1,overlay?:OverlayState){
    if(e.dead)return;
    this.registerHit(e,i,state);
    const installMult=p.install>0?1.25:1;const scaled=dmg*this.damageScale(e)*installMult;e.hp-=scaled;this.stats.damage+=Math.round(scaled*10)/10;pX(p,.7);
    if(e.state!=="ground"||state!=="ground")e.airHits++; else e.airHits=0;
    if(overlay)this.addOverlay(e,overlay);
    e.breakMeter+=dmg*(state==="spike"||state==="wallsplat"?1.5:1)*(this.build.sharedPassive==="break_amp"?1.25:1);
    if(e.breakMeter>=(e.boss?42:e.elite?18:12)&&!e.overlays.has("break")){this.addOverlay(e,"break");this.onToast?.("BREAK // DEFENSE RULE REMOVED")}
    this.setState(e,state);
    e.stun=.22;

    if(state==="launch"){e.vel.y+=Math.max(4,lift);e.vel.addScaledVector(p.facing,2)}
    if(state==="carry"){e.vel.addScaledVector(p.facing,8*force);e.vel.y+=1.2}
    if(state==="suspend"){e.vel.multiplyScalar(.1);e.vel.y=Math.max(e.vel.y,.8)}
    if(state==="spike"){e.vel.y=-11;e.vel.addScaledVector(p.facing,3)}
    if(state==="wallsplat"){e.vel.addScaledVector(p.facing,11*force)}

    if(e.hp<=0){
      e.dead=true;this.scene.remove(e.mesh);this.stats.kills++;
      if(e===this.boss){this.stats.bossTime=this.elapsed-this.bossStarted;setTimeout(()=>this.finishMission(),300)}
    }
  }

  targetsInArc(p:any,r:number){
    const c=p.mesh.position.clone().addScaledVector(p.facing,.85);
    return this.enemies.filter(e=>!e.dead&&e.mesh.position.distanceTo(c)<r);
  }

  attack(p:any,i:number,r:number,dmg:number,state:PositionalState,lift=0,force=1,overlay?:OverlayState){
    const c=p.mesh.position.clone().addScaledVector(p.facing,.9);
    for(const e of this.targetsInArc(p,r))this.hitEnemy(e,p,i,dmg,state,lift,force,overlay);
    this.flash(c,this.colors[i],r,state,overlay);
  }

  animateHunter(p:any,pose:any,duration=.28){
    p.characterFrame?.trigger(pose,duration);
  }

  rivenLight(p:any,i:number){this.animateHunter(p,"light",.22);this.attack(p,i,1.6,2.2,"ground");p.cd=.16}
  rivenHeavy(p:any,i:number){
    this.animateHunter(p,"heavy",.42);const w=p.weapons[p.weaponIndex];
    if(w==="BLADE")this.attack(p,i,2,4.5,"launch",5);
    if(w==="BREAKER")this.attack(p,i,2.2,6,"wallsplat",0,1.5);
    if(w==="GUNFORM")this.attack(p,i,5.5,3.2,"carry",0,1.2);
    if(w==="TWIN ARMS")this.attack(p,i,2,3.2,"carry",1,1.5);
    p.cd=.48;
  }
  rivenSwitch(p:any,i:number){
    this.animateHunter(p,"switch",.30);if(p.install>0)p.cd=0;
    const quick=this.hasTechnique(p,"quick_relay");
    const overclock=this.build.hunterMods?.Riven==="overclock_feed";
    p.weaponIndex=(p.weaponIndex+1)%p.weapons.length;const w=p.weapons[p.weaponIndex];p.characterFrame?.setWeaponFrame(w);
    this.onHunterStatus?.(i,`ARSENAL // ${w}`);this.onToast?.(`RIVEN SWITCH // ${w}`);
    // Entry effect, one per frame: no pairwise Relay matrix.
    if(w==="BLADE")this.attack(p,i,1.8,2.5,"launch",4);
    if(w==="BREAKER")this.attack(p,i,2.1,3.5,"wallsplat",0,1.3);
    if(w==="GUNFORM")this.attack(p,i,5,2.1,"carry");
    if(w==="TWIN ARMS"){p.vel.addScaledVector(p.facing,5);this.attack(p,i,1.7,2.4,"carry")}
    if(overclock)pX(p,4);p.cd=p.install>0?.10:quick?.22:.35;
  }

  valeLight(p:any,i:number){
    this.attack(p,i,1.9,2.6,"ground",0,1,"cut");
    if(p.install>0||this.build.hunterMods?.Vale==="deep_fracture")this.attack(p,i,2.2,p.install>0?1.2:.5,"ground",0,1,"cut");
    if(this.hasTechnique(p,"crosscut")&&Math.random()<.35)this.attack(p,i,2.4,.8,"ground",0,1,"cut");
    p.cd=p.install>0?.18:.28
  }
  valeHeavy(p:any,i:number){
    const ts=this.targetsInArc(p,3.2).filter((e:Enemy)=>e.cuts>0);
    if(ts.length){
      for(const e of ts){const burst=5+e.cuts*2.2;e.cuts=0;e.overlays.delete("cut");this.hitEnemy(e,p,i,burst,"suspend",0,1);e.breakMeter+=burst*.8}
      this.flash(p.mesh.position.clone().addScaledVector(p.facing,1),this.colors[i],3.3,"suspend");
      this.onToast?.("VALE // JUDGMENT");
    }else this.attack(p,i,2.6,4.2,"ground",0,1,"cut");
    p.cd=.62;
  }
  valeFracture(p:any,i:number){
    for(const e of this.enemies)if(!e.dead&&e.mesh.position.distanceTo(p.mesh.position)<6&&e.cuts>0){
      e.cuts++;this.addOverlay(e,"cut");e.breakMeter+=8;
    }
    this.onHunterStatus?.(i,"FRACTURE FIELD");this.onToast?.("VALE // FRACTURE FIELD");p.cd=.8;
  }

  knoxLight(p:any,i:number){this.attack(p,i,1.7,2.8,"carry",0,1.15);p.cd=.24}
  knoxHeavy(p:any,i:number){
    const t=this.targetsInArc(p,p.install>0||this.build.hunterMods?.Knox==="atlas_grip"?5:3).sort((a,b)=>a.mesh.position.distanceTo(p.mesh.position)-b.mesh.position.distanceTo(p.mesh.position))[0];
    if(t){this.stats.seizes++;this.hitEnemy(t,p,i,5.2,"carry",4,this.hasTechnique(p,"counterweight")?2.6:2);this.onToast?.("KNOX // SEIZE");}
    p.cd=.58;
  }
  knoxSignature(p:any,i:number){this.attack(p,i,3.5,5.8,"spike",0,1.7);p.cd=.75}

  morrowLight(p:any,i:number){
    this.attack(p,i,1.4,1.1,"ground");
    const d=p.drones[0];const target=this.nearestEnemy(d.mesh.position,7);
    if(target){this.hitEnemy(target,p,i,2.1,"carry",0,1.15);this.beam(d.mesh.position,target.mesh.position,this.colors[i])}
    p.cd=.25;
  }
  morrowHeavy(p:any,i:number){
    const target=this.nearestEnemy(p.mesh.position,8);
    if(target){
      const extra=this.build.hunterMods?.Morrow==="swarm_logic"||this.hasTechnique(p,"dual_order");const drones=p.install>0?p.drones.concat(p.drones):extra?p.drones.concat(p.drones.slice(0,1)):p.drones;
      drones.forEach((d:any,j:number)=>{setTimeout(()=>{if(!target.dead){this.hitEnemy(target,p,i,1.6,j===2?"suspend":"carry",j===2?2:0,1);this.beam(d.mesh.position,target.mesh.position,this.colors[i])}},j*70)});
    }
    p.cd=.6;
  }
  morrowCommand(p:any,i:number){
    const target=this.nearestEnemy(p.mesh.position,10);
    if(target){this.addOverlay(target,"tether");this.hitEnemy(target,p,i,3.5,"suspend",2);this.onToast?.("MORROW // NETWORK HOLD")}
    p.cd=.78;
  }

  useDefense(p:any,i:number){
    if(p.defenseCd>0)return;
    if(p.kind==="Versatile"){
      p.defenseWindow=.22;p.defenseCd=.6;this.animateHunter(p,"parry",.24);this.onHunterStatus?.(i,"PARRY-SWITCH READY");
    }else if(p.kind==="Precision"){
      p.defenseWindow=.8;p.defenseCd=1;this.stats.guards++;this.onHunterStatus?.(i,"GUARD CUT");
      const pos=p.mesh.position.clone().addScaledVector(p.facing,.8);
      this.flash(pos,this.colors[i],1.1,"ground","cut");
      p.guardCut={pos,life:.8};
    }else if(p.kind==="Force"){
      if(p.seizeCharges>0){p.seizeCharges--;p.defenseWindow=.42;p.defenseCd=.28;this.onHunterStatus?.(i,`SEIZE-CATCH // ${p.seizeCharges}`)}
    }else{
      p.defenseWindow=.5;p.defenseCd=.55;this.stats.guards++;this.onHunterStatus?.(i,"NETWORK GUARD");
    }
  }

  resolveIncomingDefense(p:any,i:number,proj:Projectile){
    if(p.defenseWindow<=0)return false;
    if(p.kind==="Versatile"){
      this.stats.parries++;proj.dead=true;this.scene.remove(proj.mesh);
      this.onToast?.("RIVEN // PARRY-SWITCH");this.rivenSwitch(p,i);return true;
    }
    if(p.kind==="Precision"){
      proj.dead=true;this.scene.remove(proj.mesh);
      if(proj.source&&!proj.source.dead){this.addOverlay(proj.source,"cut");proj.source.breakMeter+=6}
      this.addStyle(10,"guardcut");this.onToast?.("VALE // GUARD CUT");return true;
    }
    if(p.kind==="Force"){
      this.stats.reflects++;proj.owner="player";proj.vel.multiplyScalar(-1.65);proj.mesh.material=(proj.mesh.material as THREE.MeshBasicMaterial).clone();(proj.mesh.material as THREE.MeshBasicMaterial).color.setHex(this.colors[i]);
      this.onToast?.("KNOX // REFLECT");return true;
    }
    if(p.kind==="Command"){
      const drone=p.drones.sort((a:any,b:any)=>a.mesh.position.distanceTo(p.mesh.position)-b.mesh.position.distanceTo(p.mesh.position))[0];
      if(drone){proj.dead=true;this.scene.remove(proj.mesh);this.beam(drone.mesh.position,proj.mesh.position,this.colors[i]);this.addStyle(10,"intercept");this.onToast?.("MORROW // INTERCEPT");return true}
    }
    return false;
  }

  nearestEnemy(pos:THREE.Vector3,r:number){
    return this.enemies.filter(e=>!e.dead&&e.mesh.position.distanceTo(pos)<r).sort((a,b)=>a.mesh.position.distanceToSquared(pos)-b.mesh.position.distanceToSquared(pos))[0];
  }

  shootAtPlayer(e:Enemy,p:any){
    const m=new THREE.Mesh(new THREE.SphereGeometry(.14,8,8),new THREE.MeshBasicMaterial({color:e.boss?0xff4ea3:0xbca8ff}));
    m.position.copy(e.mesh.position);m.position.y+=e.boss?1.5:.45;this.scene.add(m);
    const v=p.mesh.position.clone().add(new THREE.Vector3(0,.7,0)).sub(m.position).normalize().multiplyScalar(e.boss?8.5:6.5);
    this.projectiles.push({mesh:m,vel:v,owner:"enemy",dead:false,source:e});
  }

  damagePlayer(p:any,i:number,amount:number,source?:Enemy){
    if(!p.active||p.downed||p.invuln>0)return;
    amount*=this.difficultyDamage();if(this.build.sharedPassive==="recovery_mesh")amount*=.88;
    p.hp=Math.max(0,p.hp-amount);p.invuln=.35;this.onHunterVitals?.(i,p.hp,p.maxHp,p.x,p.downed,p.active,p.consumables);
    if(p.hp<=0){p.downed=true;p.vel.set(0,0,0);this.stats.downs++;this.onToast?.(`${p.name.toUpperCase()} // DOWN`);this.checkWipe()}
  }

  checkWipe(){
    const active=this.players.filter(p=>p.active);
    if(active.length&&active.every(p=>p.downed)){this.running=false;this.onMissionFailed?.()}
  }

  tryRevive(p:any,i:number,dt:number,holding:boolean){
    if(!holding||p.downed)return;
    const target=this.players.find((q:any)=>q.active&&q.downed&&q.mesh.position.distanceTo(p.mesh.position)<2.2);
    if(!target)return;
    target.reviveProgress+=dt;this.onHunterStatus?.(i,`REVIVING ${target.name.toUpperCase()} // ${Math.min(100,Math.floor(target.reviveProgress/1.6*100))}%`);
    if(target.reviveProgress>=1.6){target.downed=false;target.reviveProgress=0;target.hp=45;target.invuln=1.2;this.stats.revives++;this.onToast?.(`${target.name.toUpperCase()} // REVIVED`)}
  }

  useConsumable(p:any,i:number){
    if(p.consumables<=0||p.downed)return;p.consumables--;this.stats.consumables++;
    for(let j=0;j<this.players.length;j++){const q=this.players[j];if(q.active&&!q.downed&&q.mesh.position.distanceTo(p.mesh.position)<5){q.hp=Math.min(q.maxHp,q.hp+28);q.invuln=Math.max(q.invuln,.25)}}
    this.onToast?.(`${p.name.toUpperCase()} // RECOVERY PULSE`);this.onHunterStatus?.(i,`PULSE // ${p.consumables}`);
  }

  activateInstall(p:any,i:number){
    if(p.x<100||p.install>0||p.downed)return;p.x=0;p.install=this.hasTechnique(p,"extended_install")?11:8;this.stats.installs++;
    if(i===0)this.animateHunter(p,"install",.65);const names=["ARSENAL OVERFLOW","FRACTURE STATE","HEAVY MANIFEST","FULL NETWORK"];
    this.onToast?.(`${p.name.toUpperCase()} // ${names[i]}`);this.onHunterStatus?.(i,names[i]);
  }

  updateProjectile(pr:Projectile,dt:number){
    if(pr.dead)return;pr.mesh.position.addScaledVector(pr.vel,dt);
    if(pr.owner==="enemy"){
      const morrow=this.players[3];
      if(morrow?.defenseWindow>0){
        const drone=morrow.drones.find((d:any)=>d.mesh.position.distanceTo(pr.mesh.position)<2.8);
        if(drone){pr.dead=true;this.scene.remove(pr.mesh);this.beam(drone.mesh.position,pr.mesh.position,this.colors[3]);this.addStyle(10,"intercept");this.onToast?.("MORROW // NETWORK INTERCEPT");return}
      }
      for(let i=0;i<this.players.length;i++){
        const p=this.players[i];
        if(pr.mesh.position.distanceTo(p.mesh.position.clone().add(new THREE.Vector3(0,.7,0)))<.7){
          if(this.resolveIncomingDefense(p,i,pr))return;
          if(p.dodge<=0){p.vel.add(pr.vel.clone().normalize().multiplyScalar(4));this.damagePlayer(p,i,pr.source?.boss?18:12,pr.source)}
          pr.dead=true;this.scene.remove(pr.mesh);return;
        }
      }
    }else{
      for(const e of this.enemies)if(!e.dead&&pr.mesh.position.distanceTo(e.mesh.position)<.8){
        this.hitEnemy(e,this.players[2],2,5,"carry",0,1.5);pr.dead=true;this.scene.remove(pr.mesh);return;
      }
    }
    if(pr.mesh.position.length()>30){pr.dead=true;this.scene.remove(pr.mesh)}
  }

  updateMorrowDrones(p:any,dt:number){
    p.drones.forEach((d:any,j:number)=>{
      const a=this.elapsed*1.4+j*Math.PI*2/3;
      const target=p.mesh.position.clone().add(new THREE.Vector3(Math.cos(a)*1.5,1.1+Math.sin(a*.7)*.25,Math.sin(a)*1.5));
      d.mesh.position.lerp(target,1-Math.pow(.005,dt));
    });
  }

  updatePlayer(p:any,i:number,dt:number){
    const gp=i===0?null:navigator.getGamepads()[i-1];p.active=true;p.cpu=i>0&&!gp;
    p.cd-=dt;p.dodge-=dt;p.defenseCd-=dt;p.defenseWindow-=dt;p.invuln-=dt;if(p.install>0)p.install-=dt;
    this.onHunterVitals?.(i,p.hp,p.maxHp,p.x,p.downed,p.active,p.consumables);
    p.mesh.visible=true;
    if(p.kind==="Force"&&p.seizeCharges<2){p.seizeRecharge-=dt;if(p.seizeRecharge<=0){p.seizeCharges++;p.seizeRecharge=2.5}}
    if(p.kind==="Command")this.updateMorrowDrones(p,dt);

    const q=(i===0||gp)?this.input(i):this.aiInput(p,i);
    if(q.pause&&!this.pauseHeld){this.pauseHeld=true;this.onPause?.()} if(!q.pause)this.pauseHeld=false;

    if(p.downed){this.tryRevive(p,i,dt,false);return}
    if(q.install)this.activateInstall(p,i);if(q.use&&p.cd<=0){this.useConsumable(p,i);p.cd=.35}this.tryRevive(p,i,dt,q.revive);

    let d=new THREE.Vector3(q.x,0,q.z);
    if(d.length()>.15){d.normalize();p.facing.lerp(d,.28).normalize();p.vel.lerp(d.multiplyScalar(p.dodge>0?12:5.5),.16)}
    else p.vel.multiplyScalar(Math.pow(.002,dt));
    if(q.e&&p.dodge<=0){p.dodge=.24;p.vel.copy(p.facing).multiplyScalar(12);this.animateHunter(p,"dodge",.24)}
    if(q.def&&p.defenseCd<=0)this.useDefense(p,i);

    p.mesh.position.addScaledVector(p.vel,dt);
    if(p.mesh.position.length()>16)p.mesh.position.setLength(16);
    p.mesh.rotation.y=Math.atan2(p.facing.x,p.facing.z);

    if(p.cd<=0&&(q.a||q.h||q.s)){
      if(p.kind==="Versatile"){if(q.a)this.rivenLight(p,i);else if(q.h)this.rivenHeavy(p,i);else this.rivenSwitch(p,i)}
      if(p.kind==="Precision"){if(q.a)this.valeLight(p,i);else if(q.h)this.valeHeavy(p,i);else this.valeFracture(p,i)}
      if(p.kind==="Force"){if(q.a)this.knoxLight(p,i);else if(q.h)this.knoxHeavy(p,i);else this.knoxSignature(p,i)}
      if(p.kind==="Command"){if(q.a)this.morrowLight(p,i);else if(q.h)this.morrowHeavy(p,i);else this.morrowCommand(p,i)}
    }

    p.characterFrame?.update(dt,{
      moving:d.length()>.15,
      moveSpeed:Math.min(1,p.vel.length()/5.5),
      downed:p.downed,
      install:p.install>0
    });
    if(p.guardCut){p.guardCut.life-=dt;if(p.guardCut.life<=0)p.guardCut=null}
  }

  updateEnemy(e:Enemy,dt:number){
    if(e.dead)return;e.stun-=dt;e.stateTime-=dt;e.shootCd-=dt;
    if(e.stateTime<=0&&e.state!=="ground"){e.state="ground";e.airHits=0}

    const activePlayers=this.players.filter(p=>p.active&&!p.downed);
    if(!activePlayers.length)return;
    const target=activePlayers[Math.floor(Math.random()*activePlayers.length)];

    if(this.missionId==="black_procession"&&this.objectiveMesh&&!e.boss){
      const od=e.mesh.position.distanceTo(this.objectiveMesh.position);
      if(od<2.2&&e.specialCd<=0){
        this.objectiveHp=Math.max(0,this.objectiveHp-(e.type==="ritual"?12:7));
        e.specialCd=1.2;this.onMissionProgress?.("PROCESSION CORE",this.objectiveHp,this.objectiveMax);
        if(this.objectiveHp<=0){this.running=false;this.onMissionFailed?.();return}
      }
    }

    // Witch-role behavior: identical silhouettes are gone; each type now pressures a different co-op skill.
    if(e.type==="hex"&&e.shootCd<=0&&e.state==="ground"){this.shootAtPlayer(e,target);e.shootCd=(1.5+Math.random()*1.4)/this.difficultySpeed()}
    if(e.type==="coven"){
      const allies=this.enemies.filter(o=>!o.dead&&o!==e&&o.mesh.position.distanceTo(e.mesh.position)<4);
      e.buffed=allies.length>=2;if(e.buffed)allies.forEach(o=>o.breakMeter=Math.max(0,o.breakMeter-dt*1.4));
      if(e.shootCd<=0){this.shootAtPlayer(e,target);e.shootCd=2.3/this.difficultySpeed()}
    }
    if(e.type==="ritual"){
      if(e.state!=="ground"||e.stun>0)e.ritual=Math.max(0,e.ritual-dt*2);else e.ritual+=dt;
      if(e.ritual>=4){e.ritual=0;this.onToast?.("RITUAL PULSE // INTERRUPT CASTERS");for(let i=0;i<this.players.length;i++){const p=this.players[i];if(p.active&&!p.downed)this.damagePlayer(p,i,14,e)}}
    }
    if(e.type==="siren"&&e.specialCd<=0){
      const d=e.mesh.position.clone().sub(target.mesh.position);d.y=0;if(d.length()>1)target.vel.add(d.normalize().multiplyScalar(7));e.specialCd=3.6;this.onToast?.("SIREN PULL // FORMATION DISRUPTED");
    }
    e.specialCd-=dt;

    if(e.boss)this.updateBoss(e,dt);
    else if(e.stun<=0&&e.state!=="suspend"){
      const candidates=this.players.filter(p=>p.active&&!p.downed);if(!candidates.length)return;
    const t=candidates.reduce((a,b)=>a.mesh.position.distanceToSquared(e.mesh.position)<b.mesh.position.distanceToSquared(e.mesh.position)?a:b);
      const d=t.mesh.position.clone().sub(e.mesh.position);d.y=0;if(d.length()>1.1)e.vel.add(d.normalize().multiplyScalar(dt*(e.elite?3:2.2)*this.difficultySpeed()));
    }

    if(e.state!=="suspend"){e.vel.multiplyScalar(Math.pow(.04,dt));e.vel.y-=9*dt}
    else e.vel.multiplyScalar(.86);

    e.mesh.position.addScaledVector(e.vel,dt);

    // Vale Guard Cut is spatial and can punish a witch walking/projectiling into it.
    const vale=this.players[1];
    if(vale?.guardCut&&e.mesh.position.distanceTo(vale.guardCut.pos)<1.15){
      this.addOverlay(e,"cut");e.breakMeter+=5;vale.guardCut=null;this.onToast?.("GUARD CUT // FRACTURE PLANTED");
    }

    if(e.mesh.position.y<.5){
      if(e.state==="spike"){e.overlays.add("break");e.breakMeter=0;e.stun=.5}
      e.mesh.position.y=.5;e.vel.y=Math.max(0,e.vel.y);
      if(e.state!=="wallsplat")e.state="ground";
    }
    if(Math.abs(e.mesh.position.x)>16||Math.abs(e.mesh.position.z)>16){
      e.mesh.position.x=Math.max(-16,Math.min(16,e.mesh.position.x));e.mesh.position.z=Math.max(-16,Math.min(16,e.mesh.position.z));
      this.setState(e,"wallsplat",.45);e.stun=.4;
    }
  }

  updateBoss(e:Enemy,dt:number){
    const ratio=e.hp/e.maxHp;
    const wanted=ratio>.66?1:ratio>.33?2:3;
    if(wanted!==e.phase){
      e.phase=wanted;e.overlays.delete("break");e.breakMeter=0;e.stun=0;
      this.onToast?.(`${e.name} // PHASE ${e.phase}`);
      if(e.phase===2)this.wave(4,false);
      if(e.phase===3){this.wave(5,false);e.ritual=0}
    }
    if(e.stun>0||e.state==="suspend")return;
    const candidates=this.players.filter(p=>p.active&&!p.downed);if(!candidates.length)return;
    const t=candidates.reduce((a,b)=>a.mesh.position.distanceToSquared(e.mesh.position)<b.mesh.position.distanceToSquared(e.mesh.position)?a:b);
    const d=t.mesh.position.clone().sub(e.mesh.position);d.y=0;
    const speed=(e.phase===1?3.2:e.phase===2?4.0:4.7)*this.difficultySpeed();
    if(d.length()>3.2)e.vel.add(d.normalize().multiplyScalar(dt*speed));

    e.specialCd-=dt;
    if(e.type==="succubus"&&e.specialCd<=0){
      // Fixation: Vesper mirrors a hunter's position, then emits a pull/burst that punishes stacking.
      const victim=candidates[Math.floor(Math.random()*candidates.length)];
      const mirrorPos=victim.mesh.position.clone().multiplyScalar(-1);mirrorPos.y=0;e.mesh.position.lerp(mirrorPos,.35);
      for(let i=0;i<candidates.length;i++){const p=candidates[i];const pull=e.mesh.position.clone().sub(p.mesh.position);pull.y=0;if(pull.length()<8){p.vel.add(pull.normalize().multiplyScalar(7));if(p.mesh.position.distanceTo(e.mesh.position)<3)this.damagePlayer(p,this.players.indexOf(p),10,e)}}
      this.onToast?.("VESPER // FIXATION MIRROR");e.breakMeter+=10;e.specialCd=(e.phase===3?1.2:1.8)/this.difficultySpeed();
    }
    if(e.type!=="succubus"&&e.specialCd<=0){
      if(e.phase===1){
        for(let n=0;n<3;n++)setTimeout(()=>{if(!e.dead)this.shootAtPlayer(e,candidates[n%candidates.length])},n*100);
        e.specialCd=2.0/this.difficultySpeed();
      }else if(e.phase===2){
        for(let i=0;i<candidates.length;i++){const p=candidates[i];if(p.mesh.position.distanceTo(e.mesh.position)<6){p.vel.add(p.mesh.position.clone().sub(e.mesh.position).normalize().multiplyScalar(10));this.damagePlayer(p,i,12,e)}}
        e.specialCd=1.7/this.difficultySpeed();
      }else{
        e.ritual+=1;
        for(let n=0;n<6;n++){const ang=n*Math.PI/3;const fake={mesh:{position:e.mesh.position.clone()},boss:true} as any;const m=new THREE.Mesh(new THREE.SphereGeometry(.16,8,8),new THREE.MeshBasicMaterial({color:0xff4ea3}));m.position.copy(e.mesh.position).add(new THREE.Vector3(0,1.3,0));this.scene.add(m);this.projectiles.push({mesh:m,vel:new THREE.Vector3(Math.cos(ang)*7,0,Math.sin(ang)*7),owner:"enemy",dead:false,source:e})}
        if(e.ritual>=3){e.ritual=0;this.onToast?.("ULTIMATE RITUAL // BREAK NOW");e.breakMeter+=20}
        e.specialCd=1.25/this.difficultySpeed();
      }
    }
    this.onBoss?.(e.hp,e.maxHp,e.name||"BOSS",e.overlays.has("break"));
  }
  flash(pos:THREE.Vector3,color:number,r:number,state:string,overlay?:string){
    const geom=state==="spike"?new THREE.CircleGeometry(r,24):new THREE.RingGeometry(r*.65,r,32);
    const mat=new THREE.MeshBasicMaterial({color,transparent:true,opacity:overlay==="cut"?.8:.58,side:THREE.DoubleSide});
    const m=new THREE.Mesh(geom,mat);m.rotation.x=-Math.PI/2;m.position.copy(pos);m.position.y=.08;this.scene.add(m);
    let life=.35;const tick=()=>{life-=.05;m.scale.multiplyScalar(1.07);mat.opacity-=.09;if(life>0)requestAnimationFrame(tick);else this.scene.remove(m)};tick()
  }

  beam(a:THREE.Vector3,b:THREE.Vector3,color:number){
    const g=new THREE.BufferGeometry().setFromPoints([a.clone(),b.clone()]);
    const l=new THREE.Line(g,new THREE.LineBasicMaterial({color,transparent:true,opacity:.8}));this.scene.add(l);setTimeout(()=>this.scene.remove(l),90)
  }

  finishMission(){this.stats.time=this.elapsed;this.running=false;this.onMissionComplete?.(this.stats)}

  progression(){
    const alive=this.enemies.filter(e=>!e.dead);
    if(this.missionId==="false_saint"){
      if(this.missionStage===1&&alive.length===0){this.missionStage=2;this.stageTimer=2.0;this.onObjective?.("RITUAL SIGNATURE DETECTED",true)}
      if(this.missionStage===2){this.stageTimer-=1/60;if(this.stageTimer<=0){this.missionStage=3;this.spawnBoss();this.onObjective?.("BREAK THE FALSE SAINT // ELIMINATE",true)}}
      return;
    }

    if(this.missionId==="hex_district"){
      if(this.missionStage===1&&alive.length===0){
        this.missionWave++;
        if(this.missionWave<=3){this.onToast?.(`RITUAL SURGE ${this.missionWave}/3`);this.wave(7+this.missionWave*2,this.missionWave===3)}
        else{this.missionStage=2;this.stageTimer=1.6;this.onObjective?.("MATRIARCH SIGNATURE LOCATED",true)}
      }
      if(this.missionStage===2){this.stageTimer-=1/60;if(this.stageTimer<=0){this.missionStage=3;this.spawnBoss();this.onObjective?.("ELIMINATE COVEN MATRIARCH",true)}}
      return;
    }

    if(this.missionId==="black_procession"){
      if(this.missionStage===1&&alive.length===0){
        this.missionWave++;
        if(this.missionWave<=3){
          if(this.objectiveMesh)this.objectiveMesh.position.z-=5;
          this.onMissionProgress?.("PROCESSION CORE",this.objectiveHp,this.objectiveMax);
          this.onToast?.(`PROCESSION ADVANCE // LEG ${this.missionWave}`);
          this.wave(8+this.missionWave*2,this.missionWave===3);
        }else{this.missionStage=2;this.stageTimer=1.6;this.onObjective?.("SIREN PRIME INTERCEPT",true)}
      }
      if(this.missionStage===2){this.stageTimer-=1/60;if(this.stageTimer<=0){this.missionStage=3;this.spawnBoss();this.onObjective?.("PROTECT CORE // ELIMINATE HALCYON",true)}}
    }
    if(this.missionId==="mirror_hunt"){
      if(this.missionStage===1&&alive.length===0){
        this.missionWave++;
        if(this.missionWave<=2){this.onToast?.("FALSE BODY PURGED // SIGNATURE MOVED");this.wave(10,false)}
        else{this.missionStage=2;this.stageTimer=1.4;this.onObjective?.("TRUE SIGNATURE EXPOSED",true)}
      }
      if(this.missionStage===2){this.stageTimer-=1/60;if(this.stageTimer<=0){this.missionStage=3;this.spawnBoss();this.onObjective?.("RESIST FIXATION // BREAK VESPER",true)}}
    }
  }
  loop=(now:number)=>{
    if(!this.running)return;requestAnimationFrame(this.loop);
    const dt=Math.min(.033,(now-this.last)/1000);this.last=now;this.elapsed+=dt;
    this.decayStyle(dt);this.players.forEach((p,i)=>this.updatePlayer(p,i,dt));
    this.enemies.forEach(e=>this.updateEnemy(e,dt));
    this.projectiles.forEach(p=>this.updateProjectile(p,dt));
    this.enemies=this.enemies.filter(e=>!e.dead);this.projectiles=this.projectiles.filter(p=>!p.dead);
    this.progression();

    const camPlayers=this.players.filter(p=>p.active);const c=new THREE.Vector3();camPlayers.forEach(p=>c.add(p.mesh.position));c.multiplyScalar(1/Math.max(1,camPlayers.length));
    const spread=Math.max(0,...camPlayers.map(p=>p.mesh.position.distanceTo(c)));
    const target=c.clone().add(new THREE.Vector3(0,12+spread*.55,12+spread*.55));
    this.camera.position.lerp(target,1-Math.pow(.01,dt));this.camera.lookAt(c);this.renderer.render(this.scene,this.camera)
  }
}
const keys=new Set<string>();
addEventListener("keydown",e=>keys.add(e.code));addEventListener("keyup",e=>keys.delete(e.code));
