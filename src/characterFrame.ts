
import * as THREE from "three";
import {GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";

export type SemanticBone =
  | "hips"|"spine"|"chest"|"neck"|"head"
  | "upperarm_l"|"lowerarm_l"|"hand_l"
  | "upperarm_r"|"lowerarm_r"|"hand_r"
  | "thigh_l"|"calf_l"|"foot_l"
  | "thigh_r"|"calf_r"|"foot_r";

export type CharacterFrameSignals={
  moving?:boolean;
  moveSpeed?:number;
  downed?:boolean;
  install?:boolean;
};

const aliases:Record<SemanticBone,string[]>={
  hips:["mixamorig:Hips"],
  spine:["mixamorig:Spine","mixamorig:Spine1"],
  chest:["mixamorig:Spine2"],
  neck:["mixamorig:Neck"],
  head:["mixamorig:Head"],
  upperarm_l:["mixamorig:LeftArm"],
  lowerarm_l:["mixamorig:LeftForeArm"],
  hand_l:["mixamorig:LeftHand"],
  upperarm_r:["mixamorig:RightArm"],
  lowerarm_r:["mixamorig:RightForeArm"],
  hand_r:["mixamorig:RightHand"],
  thigh_l:["mixamorig:LeftUpLeg"],
  calf_l:["mixamorig:LeftLeg"],
  foot_l:["mixamorig:LeftFoot"],
  thigh_r:["mixamorig:RightUpLeg"],
  calf_r:["mixamorig:RightLeg"],
  foot_r:["mixamorig:RightFoot"]
};

type PoseName="idle"|"light"|"heavy"|"switch"|"parry"|"dodge"|"hit"|"down"|"install";

export class CharacterFrameRuntime{
  root=new THREE.Group();
  visual=new THREE.Group();
  bones=new Map<SemanticBone,THREE.Object3D>();
  sockets=new Map<string,THREE.Object3D>();
  mixer?:THREE.AnimationMixer;
  sourceClips:THREE.AnimationClip[]=[];
  ready=false;
  pose:PoseName="idle";
  poseTime=0;
  poseDuration=0;
  private baseQuat=new Map<THREE.Object3D,THREE.Quaternion>();
  private weapon?:THREE.Object3D;
  private weaponFrame="BLADE";

  constructor(public assetUrl:string){
    this.root.name="CharacterFrameRoot";
    this.visual.name="CharacterVisual";
    this.root.add(this.visual);
  }

  async load(){
    const gltf=await new GLTFLoader().loadAsync(this.assetUrl);
    // Remove conversion-only camera/light nodes from the imported scene.
    gltf.scene.traverse(o=>{
      if((o as any).isCamera || (o as any).isLight)o.visible=false;
      if((o as any).isMesh){
        const m=o as THREE.Mesh;
        m.frustumCulled=false;
      }
    });

    this.visual.add(gltf.scene);
    this.normalizeModel(gltf.scene);
    this.mapBones(gltf.scene);
    this.createSockets();
    this.captureBasePose();

    this.sourceClips=gltf.animations||[];
    if(this.sourceClips.length){
      this.mixer=new THREE.AnimationMixer(gltf.scene);
      // The current Mixamo clip is effectively a T-pose/rig proof. Preserve it,
      // but do not let it override runtime procedural fallback poses.
    }

    this.createWeaponProxy("BLADE");
    this.ready=true;
    return this;
  }

  private normalizeModel(scene:THREE.Object3D){
    scene.updateMatrixWorld(true);
    const box=new THREE.Box3().setFromObject(scene);
    const size=new THREE.Vector3(); box.getSize(size);
    // Game world target: ~1.85 units tall.
    const scale=size.y>0?1.85/size.y:1;
    scene.scale.multiplyScalar(scale);
    scene.updateMatrixWorld(true);

    const box2=new THREE.Box3().setFromObject(scene);
    const center=new THREE.Vector3(); box2.getCenter(center);
    // Center X/Z and place feet at y=0.
    scene.position.x-=center.x;
    scene.position.z-=center.z;
    scene.position.y-=box2.min.y;
    scene.updateMatrixWorld(true);
  }

  private mapBones(scene:THREE.Object3D){
    const byName=new Map<string,THREE.Object3D>();
    scene.traverse(o=>byName.set(o.name,o));
    (Object.entries(aliases) as [SemanticBone,string[]][]).forEach(([semantic,names])=>{
      for(const n of names){
        const b=byName.get(n);
        if(b){this.bones.set(semantic,b);break}
      }
    });
  }

  private createSockets(){
    const attach=(name:string,boneName:SemanticBone,pos=new THREE.Vector3(),rot=new THREE.Euler())=>{
      const bone=this.bones.get(boneName); if(!bone)return;
      const s=new THREE.Object3D();s.name=`socket:${name}`;s.position.copy(pos);s.rotation.copy(rot);bone.add(s);this.sockets.set(name,s);
    };
    attach("weapon_r","hand_r",new THREE.Vector3(0,0.02,0),new THREE.Euler(0,0,Math.PI/2));
    attach("weapon_l","hand_l",new THREE.Vector3(0,0.02,0),new THREE.Euler(0,0,-Math.PI/2));
    attach("back","chest",new THREE.Vector3(0,-.04,-.12),new THREE.Euler(.15,0,0));
    attach("head_fx","head",new THREE.Vector3(0,.12,0));
    attach("chest_fx","chest",new THREE.Vector3(0,.08,.10));
    attach("foot_l","foot_l");
    attach("foot_r","foot_r");
  }

  private captureBasePose(){
    for(const b of this.bones.values())this.baseQuat.set(b,b.quaternion.clone());
  }

  socket(name:string){return this.sockets.get(name)}

  trigger(name:PoseName,duration=.28){
    if(name==="down"){this.pose="down";this.poseDuration=999;this.poseTime=0;return}
    this.pose=name;this.poseTime=0;this.poseDuration=duration;
  }

  recoverFromDown(){if(this.pose==="down"){this.pose="idle";this.poseTime=0;this.poseDuration=0}}

  setWeaponFrame(frame:string){
    this.weaponFrame=frame;
    this.createWeaponProxy(frame);
  }

  private createWeaponProxy(frame:string){
    if(this.weapon){this.weapon.removeFromParent();this.weapon=undefined}
    const socket=this.socket("weapon_r");if(!socket)return;

    let geom:THREE.BufferGeometry;
    if(frame==="BREAKER")geom=new THREE.BoxGeometry(.18,.18,1.15);
    else if(frame==="GUNFORM")geom=new THREE.BoxGeometry(.12,.22,.62);
    else if(frame==="TWIN ARMS")geom=new THREE.BoxGeometry(.07,.07,.72);
    else geom=new THREE.BoxGeometry(.08,.08,1.25);

    const mat=new THREE.MeshStandardMaterial({
      color:0x151922,metalness:.82,roughness:.28,
      emissive:0x27d7e8,emissiveIntensity:.65
    });
    const mesh=new THREE.Mesh(geom,mat);
    mesh.name=`ArsenalProxy:${frame}`;
    // Model hand bone axes came through FBX conversion; offset along local Z
    // keeps this visible even before the final authored weapon orientation pass.
    mesh.position.z=.48;
    socket.add(mesh);this.weapon=mesh;
  }

  update(dt:number,signals:CharacterFrameSignals={}){
    if(!this.ready)return;
    this.poseTime+=dt;
    if(this.pose!=="idle"&&this.pose!=="down"&&this.poseTime>=this.poseDuration){
      this.pose="idle";this.poseTime=0;this.poseDuration=0;
    }

    // Restore the imported bind/rest pose each frame before applying lightweight
    // procedural fallback motion. Real authored clips can replace these one-for-one.
    for(const [b,q] of this.baseQuat)b.quaternion.copy(q);

    const t=performance.now()/1000;
    const moving=!!signals.moving;
    const speed=Math.min(1,signals.moveSpeed||0);
    const armL=this.bones.get("upperarm_l"),armR=this.bones.get("upperarm_r");
    const legL=this.bones.get("thigh_l"),legR=this.bones.get("thigh_r");
    const chest=this.bones.get("chest");
    const hips=this.bones.get("hips");

    const addLocal=(o:THREE.Object3D|undefined,x=0,y=0,z=0)=>{
      if(!o)return;
      const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(x,y,z));
      o.quaternion.multiply(q);
    };

    if(this.pose==="down"||signals.downed){
      addLocal(hips,0,0,Math.PI/2);
      addLocal(chest,.15,0,0);
      return;
    }

    if(moving&&this.pose==="idle"){
      const s=Math.sin(t*9)*.55*speed;
      addLocal(armL,s,0,0);addLocal(armR,-s,0,0);
      addLocal(legL,-s*.75,0,0);addLocal(legR,s*.75,0,0);
      addLocal(chest,.035*Math.sin(t*9),0,0);
    }else if(this.pose==="idle"){
      addLocal(chest,.025*Math.sin(t*2.4),0,0);
    }

    const k=this.poseDuration>0?Math.min(1,this.poseTime/this.poseDuration):0;
    const swing=Math.sin(k*Math.PI);

    if(this.pose==="light"){
      addLocal(chest,0,-.28*swing,0);
      addLocal(armR,-.25,-.75*swing,-.8*swing);
      addLocal(armL,.1,.2*swing,.2*swing);
    }
    if(this.pose==="heavy"){
      addLocal(chest,-.15,-.45*swing,0);
      addLocal(armR,-.85,-.35,-1.1*swing);
      addLocal(armL,-.35,.15,.3);
    }
    if(this.pose==="switch"){
      addLocal(chest,0,.35*swing,0);
      addLocal(armR,-.4,.15,-.5*swing);
    }
    if(this.pose==="parry"){
      addLocal(armR,-.55,-.2,-.9);
      addLocal(chest,-.08,.2,0);
    }
    if(this.pose==="dodge"){
      addLocal(chest,.28,0,.15*Math.sin(k*Math.PI*2));
      addLocal(hips,.12,0,0);
    }
    if(this.pose==="hit"){
      addLocal(chest,.22,0,.22);
      addLocal(armL,.3,0,.25);addLocal(armR,.3,0,-.25);
    }
    if(this.pose==="install"||signals.install){
      addLocal(chest,-.08,0,0);
      addLocal(armL,-.35,0,.35);addLocal(armR,-.35,0,-.35);
      if(this.weapon && (this.weapon as THREE.Mesh).material){
        const m=(this.weapon as THREE.Mesh).material as THREE.MeshStandardMaterial;
        m.emissiveIntensity=1.4+.6*Math.sin(t*12);
      }
    }else if(this.weapon && (this.weapon as THREE.Mesh).material){
      ((this.weapon as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity=.65;
    }
  }
}
