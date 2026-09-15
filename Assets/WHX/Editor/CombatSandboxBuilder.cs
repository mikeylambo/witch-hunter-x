using System;
using System.Linq;
using Unity.Cinemachine;
using UnityEditor;
using UnityEditor.SceneManagement;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using WHX.CameraSystem;
using WHX.Combat;
using WHX.Input;
using WHX.Player;
using WHX.UI;
using Object = UnityEngine.Object;

namespace WHX.Editor
{
    public static class CombatSandboxBuilder
    {
        private const string RootFolder = "Assets/WHX";
        private const string PlayerPrefabPath = RootFolder + "/Prefabs/Player/PlayerBase.prefab";
        private const string ScenePath = RootFolder + "/Scenes/CombatSandbox.unity";
        private const string MaterialPath = RootFolder + "/Art/Materials/TemporaryPlayer.mat";

        [MenuItem("WHX/Build Combat Sandbox v0.25")]
        public static void Build()
        {
            EnsureFolders();
            ConfigureModelImporters();
            GameObject[] presentations = Enum.GetValues(typeof(PlayerCharacter)).Cast<PlayerCharacter>().Select(BuildPresentation).ToArray();
            GameObject playerPrefab = BuildPlayerPrefab(presentations);
            BuildVariants(playerPrefab, presentations);
            BuildScene(playerPrefab);
            AssetDatabase.DeleteAsset(RootFolder + "/Prefabs/Player/TemporaryPlayer.prefab");
            AssetDatabase.DeleteAsset(MaterialPath);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[WHX] CombatSandbox v0.25 scene and four character variants built successfully.");

            if (Application.isBatchMode)
            {
                EditorApplication.Exit(0);
            }
        }

        private static GameObject BuildPlayerPrefab(GameObject[] presentations)
        {
            GameObject root = new GameObject("PlayerBase");

            CharacterController controller = root.AddComponent<CharacterController>();
            controller.height = 1.8f;
            controller.radius = 0.83f;
            controller.center = new Vector3(0f, 0.9f, 0f);
            controller.skinWidth = 0.04f;

            PlayerInput playerInput = root.AddComponent<PlayerInput>();
            playerInput.actions = AssetDatabase.LoadAssetAtPath<InputActionAsset>("Assets/InputSystem_Actions.inputactions");
            playerInput.defaultActionMap = "Player";
            playerInput.notificationBehavior = PlayerNotifications.InvokeCSharpEvents;

            root.AddComponent<PlayerInputReader>();
            root.AddComponent<CharacterMotor>();
            root.AddComponent<Combatant>();
            root.AddComponent<PlayerCharacterIdentity>();
            Transform visualRoot = CreateAnchor(root.transform, "PresentationRoot", Vector3.zero);
            root.AddComponent<PlayerCharacterSelector>().Configure(visualRoot, presentations);
            Transform anchors = CreateAnchor(root.transform, "Anchors", Vector3.zero);
            root.AddComponent<PlayerCombatAnchors>().Configure(
                CreateAnchor(anchors, "CameraTarget", new Vector3(0f, 1.35f, 0f)),
                CreateAnchor(anchors, "Weapon_R", new Vector3(0.42f, 1.05f, 0.12f)),
                CreateAnchor(anchors, "Weapon_L", new Vector3(-0.42f, 1.05f, 0.12f)),
                CreateAnchor(anchors, "ProjectileOrigin", new Vector3(0f, 1.25f, 0.45f)),
                CreateAnchor(anchors, "GroundProbe", new Vector3(0f, 0.05f, 0f)));

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, PlayerPrefabPath);
            Object.DestroyImmediate(root);
            return prefab;
        }

        private static string ModelPath(PlayerCharacter character) => $"{RootFolder}/Art/Characters/{character}/Model/{character}.fbx";

        private static void ConfigureModelImporters()
        {
            foreach (PlayerCharacter character in Enum.GetValues(typeof(PlayerCharacter)))
            {
                string path = ModelPath(character);
                if (AssetImporter.GetAtPath(path) is not ModelImporter importer)
                {
                    throw new InvalidOperationException($"Missing FBX ModelImporter: {path}");
                }

                importer.globalScale = 1f;
                importer.useFileScale = true;
                importer.animationType = ModelImporterAnimationType.Human;
                importer.avatarSetup = ModelImporterAvatarSetup.CreateFromThisModel;
                importer.SaveAndReimport();
                Avatar avatar = AssetDatabase.LoadAllAssetsAtPath(path).OfType<Avatar>().FirstOrDefault();
                bool humanoidValid = avatar != null && avatar.isValid && avatar.isHuman;
                Debug.Log($"[WHX] {character} Humanoid avatar valid: {humanoidValid}");
                if (!humanoidValid)
                {
                    importer.animationType = ModelImporterAnimationType.Generic;
                    importer.SaveAndReimport();
                }
            }
        }

        private static GameObject BuildPresentation(PlayerCharacter character)
        {
            GameObject modelAsset = AssetDatabase.LoadAssetAtPath<GameObject>(ModelPath(character));
            if (modelAsset == null)
            {
                throw new InvalidOperationException($"Missing normalized model: {character}");
            }

            GameObject root = new GameObject(character + "Presentation");
            GameObject model = (GameObject)PrefabUtility.InstantiatePrefab(modelAsset, root.transform);
            model.name = character + "Model";
            Renderer[] renderers = root.GetComponentsInChildren<Renderer>();
            if (renderers.Length == 0)
            {
                throw new InvalidOperationException($"No renderers on {character} model");
            }

            Bounds bounds = renderers[0].bounds;
            foreach (Renderer renderer in renderers.Skip(1))
            {
                bounds.Encapsulate(renderer.bounds);
            }
            float fitScale = 1.8f / bounds.size.y;
            model.transform.localScale *= fitScale;
            renderers = root.GetComponentsInChildren<Renderer>();
            bounds = renderers[0].bounds;
            foreach (Renderer renderer in renderers.Skip(1))
            {
                bounds.Encapsulate(renderer.bounds);
            }
            model.transform.position += Vector3.down * bounds.min.y;
            if (bounds.size.y < 1.75f || bounds.size.y > 1.85f)
            {
                throw new InvalidOperationException($"{character} height outside controller fit: {bounds.size.y:F3} m");
            }

            Animator animator = model.GetComponentInChildren<Animator>();
            if (animator != null)
            {
                animator.applyRootMotion = false;
            }

            string path = $"{RootFolder}/Prefabs/Player/Presentations/{character}Presentation.prefab";
            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, path);
            Object.DestroyImmediate(root);
            return prefab;
        }

        private static void BuildVariants(GameObject playerBase, GameObject[] presentations)
        {
            for (int i = 0; i < presentations.Length; i++)
            {
                PlayerCharacter character = (PlayerCharacter)i;
                GameObject instance = (GameObject)PrefabUtility.InstantiatePrefab(playerBase);
                instance.name = character + "Player";
                instance.GetComponent<PlayerCharacterIdentity>().Configure(character);
                instance.GetComponent<PlayerCharacterSelector>().enabled = false;
                PrefabUtility.InstantiatePrefab(presentations[i], instance.transform.Find("PresentationRoot"));
                PrefabUtility.SaveAsPrefabAsset(instance, $"{RootFolder}/Prefabs/Player/{character}Player.prefab");
                Object.DestroyImmediate(instance);
            }
        }

        private static Transform CreateAnchor(Transform parent, string name, Vector3 localPosition)
        {
            Transform anchor = new GameObject(name).transform;
            anchor.SetParent(parent, false);
            anchor.localPosition = localPosition;
            return anchor;
        }

        private static void BuildScene(GameObject playerPrefab)
        {
            Scene scene = EditorSceneManager.NewScene(NewSceneSetup.EmptyScene, NewSceneMode.Single);

            CreateLighting();
            CreateArena();

            GameObject gameplay = new GameObject("Gameplay");
            PlayerInputManager inputManager = gameplay.AddComponent<PlayerInputManager>();
            inputManager.playerPrefab = playerPrefab;
            inputManager.joinBehavior = PlayerJoinBehavior.JoinPlayersWhenButtonIsPressed;
            inputManager.notificationBehavior = PlayerNotifications.InvokeCSharpEvents;
            var inputManagerObject = new SerializedObject(inputManager);
            inputManagerObject.FindProperty("m_MaxPlayerCount").intValue = 4;
            inputManagerObject.ApplyModifiedPropertiesWithoutUndo();

            LocalPlayerRoster roster = gameplay.AddComponent<LocalPlayerRoster>();
            gameplay.AddComponent<LocalPlayerSession>();

            Transform spawnsRoot = new GameObject("PlayerSpawns").transform;
            Transform[] spawnPoints =
            {
                CreateSpawn(spawnsRoot, "P1", new Vector3(-2f, 0f, -2f)),
                CreateSpawn(spawnsRoot, "P2", new Vector3(2f, 0f, -2f)),
                CreateSpawn(spawnsRoot, "P3", new Vector3(-2f, 0f, 2f)),
                CreateSpawn(spawnsRoot, "P4", new Vector3(2f, 0f, 2f))
            };

            Camera mainCamera = CreateCamera(roster);
            roster.Configure(spawnPoints, mainCamera.transform, 4);

            CombatSandboxHud hud = new GameObject("CombatSandboxHud").AddComponent<CombatSandboxHud>();
            hud.Configure(roster);

            EditorSceneManager.SaveScene(scene, ScenePath);
            EditorBuildSettings.scenes = new[] { new EditorBuildSettingsScene(ScenePath, true) };
        }

        private static Camera CreateCamera(LocalPlayerRoster roster)
        {
            GameObject cameraObject = new GameObject("Main Camera");
            cameraObject.tag = "MainCamera";
            Camera camera = cameraObject.AddComponent<Camera>();
            cameraObject.AddComponent<AudioListener>();
            cameraObject.AddComponent<CinemachineBrain>();

            GameObject vcamObject = new GameObject("Shared Adaptive Camera");
            CinemachineCamera vcam = vcamObject.AddComponent<CinemachineCamera>();
            vcam.Lens.FieldOfView = 45f;
            SharedAdaptiveCamera adaptiveCamera = vcamObject.AddComponent<SharedAdaptiveCamera>();
            adaptiveCamera.Configure(roster);
            return camera;
        }

        private static void CreateArena()
        {
            Transform root = new GameObject("TemporaryArena").transform;
            CreateBlock(root, "Floor", new Vector3(0f, -0.5f, 0f), new Vector3(24f, 1f, 18f), new Color(0.12f, 0.13f, 0.16f));
            CreateBlock(root, "NorthWall", new Vector3(0f, 1f, 9f), new Vector3(24f, 2f, 0.5f), new Color(0.22f, 0.08f, 0.08f));
            CreateBlock(root, "SouthWall", new Vector3(0f, 1f, -9f), new Vector3(24f, 2f, 0.5f), new Color(0.22f, 0.08f, 0.08f));
            CreateBlock(root, "EastWall", new Vector3(12f, 1f, 0f), new Vector3(0.5f, 2f, 18f), new Color(0.22f, 0.08f, 0.08f));
            CreateBlock(root, "WestWall", new Vector3(-12f, 1f, 0f), new Vector3(0.5f, 2f, 18f), new Color(0.22f, 0.08f, 0.08f));
        }

        private static void CreateBlock(Transform parent, string name, Vector3 position, Vector3 scale, Color color)
        {
            GameObject block = GameObject.CreatePrimitive(PrimitiveType.Cube);
            block.name = name;
            block.transform.SetParent(parent);
            block.transform.position = position;
            block.transform.localScale = scale;
            Material material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = color;
            block.GetComponent<Renderer>().sharedMaterial = material;
        }

        private static void CreateLighting()
        {
            GameObject lightObject = new GameObject("Directional Light");
            Light light = lightObject.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.4f;
            lightObject.transform.rotation = Quaternion.Euler(50f, -35f, 0f);
        }

        private static Transform CreateSpawn(Transform parent, string name, Vector3 position)
        {
            Transform spawn = new GameObject(name).transform;
            spawn.SetParent(parent);
            spawn.position = position;
            return spawn;
        }

        private static void EnsureFolders()
        {
            EnsureFolder(RootFolder, "Art");
            EnsureFolder(RootFolder + "/Art", "Materials");
            EnsureFolder(RootFolder, "Prefabs");
            EnsureFolder(RootFolder + "/Prefabs", "Player");
            EnsureFolder(RootFolder + "/Prefabs/Player", "Presentations");
            EnsureFolder(RootFolder, "Scenes");
        }

        private static void EnsureFolder(string parent, string child)
        {
            string path = parent + "/" + child;
            if (!AssetDatabase.IsValidFolder(path))
            {
                AssetDatabase.CreateFolder(parent, child);
            }
        }
    }
}
