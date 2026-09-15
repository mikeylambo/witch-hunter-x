# Witch Hunter X Unity Project Context

Last analyzed: 2026-09-15 (`unity` branch, Character Integration v0.25)

## Project summary

Witch Hunter X is a 3D character-action/co-op ARPG for 1–4 local players. Four distinct protagonists share one combat arena, and cooperative Handoffs are the defining combat/scoring mechanic. Foundation v0.1 prioritizes a truthful combat sandbox over menus, progression, final animation, or spectacle.

## Confirmed environment

- Project root: `/Users/mikeparker/Game Dev/02-Active Production/Witch-Hunter-X-Unity`
- Unity: 6000.5.3f1, created from `com.unity.template.urp-blank`
- Render pipeline: Universal Render Pipeline
- Input: Unity Input System; both keyboard/mouse and gamepad bindings are present
- Initial platforms: desktop-first; Android and Web editor modules are also installed
- Version control: GitHub `unity` branch, with Git LFS rules for large art/audio assets

## Important packages

- URP
- Input System
- Unity Test Framework
- AI Navigation
- Cinemachine (Foundation dependency)
- Animation Rigging (Foundation dependency)

## Architecture

Feature-oriented first-party code lives under `Assets/WHX`. Runtime assemblies must not depend on editor or test assemblies. Raw device input stays in the Input layer; Gameplay consumes per-player intent. Combat domain rules remain plain C# where practical. Scene wiring and presentation remain MonoBehaviours.

## Startup and scenes

`Assets/WHX/Scenes/CombatSandbox.unity` is the enabled development startup scene. It hosts the `PlayerInputManager` / `LocalPlayerRoster` composition root, four spawn points, temporary arena geometry, a HUD, and a Cinemachine shared adaptive camera. New keyboard/gamepad devices join on button press, up to four players. The manager spawns `PlayerBase`; `PlayerCharacterSelector` assigns Riven, Morrow, Vale, Knox presentations by player index. Full player prefab variants exist for character-specific authoring while gameplay components stay on the shared base.

## Character Integration v0.25

The unmodified source GLBs were copied from `origin/main:public/assets/` into `Assets/WHX/Art/Characters/{Character}/Source/`. Blender-derived FBXs are stored separately under each `Model/` folder; no source GLB or web-branch file was changed. Models use a common Unity-facing root, forward axis, floor grounding, and 1.8 m visible height. `PlayerBase` has a 1.8 m tall, 0.83 m radius CharacterController sized against all four imported render bounds, a presentation root, camera target, ground probe, right/left weapon sockets, and projectile origin. The v0.25 presentation has no production moveset or root-motion locomotion.

Riven, Vale, and Knox import with valid Humanoid avatars. Morrow's Unreal-style source skeleton fails Unity's Humanoid avatar validation and is imported as Generic pending rig repair; no invalid Humanoid avatar is assigned. Editor asset tests verify all four variants' visual ground placement and controller height/radius fit. PlayMode tests verify all four can be spawned in distinct sandbox slots with their correct presentation and existing movement component.

## Testing and validation

EditMode tests cover deterministic health, Handoff rules, camera-relative movement, adaptive framing math, character prefab composition, and visible ground/controller-height fit. PlayMode tests validate scene composition, roster spawn placement, and four-character presentation selection. Unity Editor compilation, Console inspection, and both suites are required after runtime changes.

## Unity tooling

Unity CLI 1.0.0-beta.9 is installed. The sole Unity MCP bridge is CoplayDev/unity-mcp v10.0.0, pinned as `com.coplaydev.unity-mcp` in the package manifest. Its Codex HTTP client entry points to `http://127.0.0.1:8080/mcp`, and CoplayDev HTTP auto-start is enabled for this Editor. A live headless Editor session reported `Server ready` and `Session connected`; an MCP `initialize` handshake returned protocol `2025-03-26` and server `mcp-for-unity-server` v3.4.7. The validation session was stopped afterward. No second Unity MCP bridge was added.

## Constraints and unknowns

- Morrow's Humanoid avatar needs a rig-specific repair before animation retargeting.
- Production movesets, lock-on behavior, combat timing, camera obstacle handling, and arena boundary polish remain milestone work.
- Online networking and monetization are out of scope for Foundation v0.1.
- Do not migrate the web prototype line-for-line or merge its repository into this one.

## Source files inspected

- `Packages/manifest.json`
- `Packages/packages-lock.json`
- `ProjectSettings/ProjectSettings.asset`
- `Assets/InputSystem_Actions.inputactions`
- ChatGPT project task `Plan Unity Project`
