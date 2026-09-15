using System.Collections;
using NUnit.Framework;
using Unity.Cinemachine;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.SceneManagement;
using UnityEngine.TestTools;
using WHX.CameraSystem;
using WHX.Player;

namespace WHX.Tests.PlayMode
{
    public sealed class CombatSandboxSceneTests
    {
        [UnityTest]
        public IEnumerator Scene_HasPlayableLocalMultiplayerComposition()
        {
            yield return SceneManager.LoadSceneAsync("CombatSandbox", LoadSceneMode.Single);

            PlayerInputManager inputManager = Object.FindAnyObjectByType<PlayerInputManager>();
            LocalPlayerRoster roster = Object.FindAnyObjectByType<LocalPlayerRoster>();
            SharedAdaptiveCamera adaptiveCamera = Object.FindAnyObjectByType<SharedAdaptiveCamera>();
            CinemachineBrain brain = Object.FindAnyObjectByType<CinemachineBrain>();

            Assert.That(inputManager, Is.Not.Null);
            Assert.That(inputManager.playerPrefab, Is.Not.Null);
            Assert.That(inputManager.maxPlayerCount, Is.EqualTo(4));
            Assert.That(inputManager.joinBehavior, Is.EqualTo(PlayerJoinBehavior.JoinPlayersWhenButtonIsPressed));
            Assert.That(roster, Is.Not.Null);
            Assert.That(roster.MaximumPlayers, Is.EqualTo(4));
            Assert.That(adaptiveCamera, Is.Not.Null);
            Assert.That(adaptiveCamera.Roster, Is.SameAs(roster));
            Assert.That(brain, Is.Not.Null);
        }

        [UnityTest]
        public IEnumerator Roster_AssignsJoinedPlayersToDistinctSpawnPoints()
        {
            var rosterObject = new GameObject("Roster");
            LocalPlayerRoster roster = rosterObject.AddComponent<LocalPlayerRoster>();
            var spawnA = new GameObject("SpawnA").transform;
            var spawnB = new GameObject("SpawnB").transform;
            spawnA.position = new Vector3(-2f, 0f, 0f);
            spawnB.position = new Vector3(2f, 0f, 0f);
            roster.Configure(new[] { spawnA, spawnB }, null);

            var playerA = new GameObject("PlayerA");
            var playerB = new GameObject("PlayerB");
            PlayerInput inputA = playerA.AddComponent<PlayerInput>();
            PlayerInput inputB = playerB.AddComponent<PlayerInput>();

            roster.OnPlayerJoined(inputA);
            roster.OnPlayerJoined(inputB);
            for (int frame = 0; frame < 5; frame++) yield return null;

            Assert.That(playerA.transform.position, Is.EqualTo(spawnA.position));
            Assert.That(playerB.transform.position, Is.EqualTo(spawnB.position));
            Assert.That(roster.Players.Count, Is.EqualTo(2));

            Object.Destroy(rosterObject);
            Object.Destroy(spawnA.gameObject);
            Object.Destroy(spawnB.gameObject);
            Object.Destroy(playerA);
            Object.Destroy(playerB);
        }

        [UnityTest]
        public IEnumerator Sandbox_FourJoinedPlayersSelectDistinctProductionCharacters()
        {
            yield return SceneManager.LoadSceneAsync("CombatSandbox", LoadSceneMode.Single);
            PlayerInputManager manager = Object.FindAnyObjectByType<PlayerInputManager>();
            LocalPlayerRoster roster = Object.FindAnyObjectByType<LocalPlayerRoster>();
            Assert.That(manager.playerPrefab.GetComponent<PlayerCharacterSelector>(), Is.Not.Null);

            PlayerInput[] players = new PlayerInput[4];
            for (int index = 0; index < players.Length; index++)
            {
                GameObject instance = Object.Instantiate(manager.playerPrefab);
                players[index] = instance.GetComponent<PlayerInput>();
                roster.OnPlayerJoined(players[index]);
                instance.GetComponent<PlayerCharacterSelector>().SelectForPlayerIndex(index);
            }
            for (int frame = 0; frame < 5; frame++) yield return null;

            for (int index = 0; index < players.Length; index++)
            {
                GameObject player = players[index].gameObject;
                Assert.That(player.GetComponent<PlayerCharacterIdentity>().Character, Is.EqualTo((PlayerCharacter)index));
                Assert.That(player.GetComponent<PlayerCharacterSelector>().ActivePresentation, Is.Not.Null);
                Assert.That(player.GetComponent<CharacterMotor>(), Is.Not.Null);
                Assert.That(player.transform.position.y, Is.EqualTo(0f).Within(0.1f));
                Assert.That(player.GetComponent<PlayerCombatAnchors>().CameraTarget, Is.Not.Null);
            }
            Assert.That(roster.Players.Count, Is.EqualTo(4));
            foreach (PlayerInput player in players) Object.Destroy(player.gameObject);
        }
    }
}
