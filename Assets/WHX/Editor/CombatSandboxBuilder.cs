using System.IO;
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

namespace WHX.Editor
{
    public static class CombatSandboxBuilder
    {
        private const string RootFolder = "Assets/WHX";
        private const string PlayerPrefabPath = RootFolder + "/Prefabs/Player/TemporaryPlayer.prefab";
        private const string ScenePath = RootFolder + "/Scenes/CombatSandbox.unity";
        private const string MaterialPath = RootFolder + "/Art/Materials/TemporaryPlayer.mat";

        [MenuItem("WHX/Build Combat Sandbox v0.2")]
        public static void Build()
        {
            EnsureFolders();
            Material playerMaterial = CreateOrLoadPlayerMaterial();
            GameObject playerPrefab = BuildPlayerPrefab(playerMaterial);
            BuildScene(playerPrefab);
            AssetDatabase.SaveAssets();
            AssetDatabase.Refresh();
            Debug.Log("[WHX] CombatSandbox v0.2 scene and temporary player prefab built successfully.");

            if (Application.isBatchMode)
            {
                EditorApplication.Exit(0);
            }
        }

        private static GameObject BuildPlayerPrefab(Material material)
        {
            GameObject root = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            root.name = "TemporaryPlayer";
            Object.DestroyImmediate(root.GetComponent<CapsuleCollider>());

            Renderer renderer = root.GetComponent<Renderer>();
            renderer.sharedMaterial = material;
            root.transform.localScale = new Vector3(0.85f, 1f, 0.85f);

            CharacterController controller = root.AddComponent<CharacterController>();
            controller.height = 2f;
            controller.radius = 0.5f;
            controller.center = Vector3.zero;

            PlayerInput playerInput = root.AddComponent<PlayerInput>();
            playerInput.actions = AssetDatabase.LoadAssetAtPath<InputActionAsset>("Assets/InputSystem_Actions.inputactions");
            playerInput.defaultActionMap = "Player";
            playerInput.notificationBehavior = PlayerNotifications.InvokeCSharpEvents;

            root.AddComponent<PlayerInputReader>();
            root.AddComponent<CharacterMotor>();
            root.AddComponent<Combatant>();
            TemporaryPlayerPresentation presentation = root.AddComponent<TemporaryPlayerPresentation>();
            var presentationObject = new SerializedObject(presentation);
            presentationObject.FindProperty("targetRenderer").objectReferenceValue = renderer;
            presentationObject.ApplyModifiedPropertiesWithoutUndo();

            GameObject prefab = PrefabUtility.SaveAsPrefabAsset(root, PlayerPrefabPath);
            Object.DestroyImmediate(root);
            return prefab;
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

        private static Material CreateOrLoadPlayerMaterial()
        {
            Material material = AssetDatabase.LoadAssetAtPath<Material>(MaterialPath);
            if (material != null)
            {
                return material;
            }

            material = new Material(Shader.Find("Universal Render Pipeline/Lit"));
            material.color = new Color(1f, 0.28f, 0.04f);
            AssetDatabase.CreateAsset(material, MaterialPath);
            return material;
        }

        private static void EnsureFolders()
        {
            EnsureFolder(RootFolder, "Art");
            EnsureFolder(RootFolder + "/Art", "Materials");
            EnsureFolder(RootFolder, "Prefabs");
            EnsureFolder(RootFolder + "/Prefabs", "Player");
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
