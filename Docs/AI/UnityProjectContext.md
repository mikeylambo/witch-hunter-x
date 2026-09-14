# Witch Hunter X Unity Project Context

Last analyzed: 2026-09-14 (initial workspace; no commit yet)

## Project summary

Witch Hunter X is a 3D character-action/co-op ARPG for 1–4 local players. Four distinct protagonists share one combat arena, and cooperative Handoffs are the defining combat/scoring mechanic. Foundation v0.1 prioritizes a truthful combat sandbox over menus, progression, final animation, or spectacle.

## Confirmed environment

- Project root: `/Users/mikeparker/Game Dev/02-Active Production/Witch-Hunter-X-Unity`
- Unity: 6000.5.3f1, created from `com.unity.template.urp-blank`
- Render pipeline: Universal Render Pipeline
- Input: Unity Input System; both keyboard/mouse and gamepad bindings are present
- Initial platforms: desktop-first; Android and Web editor modules are also installed
- Version control: local Git on `main`, with Git LFS rules for large art/audio assets

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

`Assets/WHX/Scenes/CombatSandbox.unity` is the intended development startup scene. It hosts the local-player join/spawn composition root, a shared camera, spawn points, and primitive arena geometry until production assets arrive.

## Testing and validation

EditMode tests cover deterministic health and Handoff rules. Unity Editor compilation, Console inspection, and EditMode tests are required after runtime changes. PlayMode validation is required for local-player joining, movement, and shared-camera framing.

## Unity tooling

Unity CLI 1.0.0-beta.9 is installed. No project-side Unity MCP bridge is currently confirmed. Repository and headless Editor workflows are available; live scene inspection requires an opened Editor plus one approved MCP/Pipeline provider.

## Constraints and unknowns

- Four character GLBs are not present in this workspace yet.
- Final character motor physics, lock-on behavior, combat timing, and adaptive camera rules remain milestone work.
- Online networking and monetization are out of scope for Foundation v0.1.
- Do not migrate the web prototype line-for-line or merge its repository into this one.

## Source files inspected

- `Packages/manifest.json`
- `Packages/packages-lock.json`
- `ProjectSettings/ProjectSettings.asset`
- `Assets/InputSystem_Actions.inputactions`
- ChatGPT project task `Plan Unity Project`

