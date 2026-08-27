# Witch Hunter // X — Build 0.20: First Real Hunter

## Production milestone
Riven's actual optimized, Mixamo-rigged GLB is now loaded directly into the four-player combat branch.

## Character Frame 0.2 integration
- GLTFLoader production asset loading.
- Automatic Mixamo semantic bone mapping.
- Runtime auto-scale to ~1.85 game units and floor grounding.
- Right/left hand, back, head FX, chest FX and foot sockets.
- Procedural fallback animation layer driven from the real skeleton:
  - idle breathing
  - locomotion limb swing
  - light
  - heavy
  - Arsenal switch
  - parry
  - evade
  - hit reaction
  - down/revive
  - install stance
- Existing Mixamo animation clip is preserved for future authored-clip replacement.
- Primitive Riven remains an automatic fallback if asset load fails.

## Arsenal proof
The right-hand socket now hosts a temporary runtime weapon proxy that changes shape when Riven cycles:
- Blade
- Breaker
- Gunform
- Twin Arms

These are not final assets. Their purpose is to prove the weapon-socket/Arsenal Core contract before making production weapons.

## What this build should answer
- Is a real humanoid readable at the established four-player shared-camera distance?
- Is Riven scaled correctly against the arena and primitive companions?
- Did the Mixamo skeleton survive browser GLB playback cleanly?
- Do hand/socket attachments follow the rig?
- Does the 50k-ish game mesh perform acceptably in the existing combat simulation?
- Can Character Frame drive gameplay states without changing WHX combat code?

## Next production inputs
Authored animation clips and real Arsenal weapon meshes now have a stable target contract.
