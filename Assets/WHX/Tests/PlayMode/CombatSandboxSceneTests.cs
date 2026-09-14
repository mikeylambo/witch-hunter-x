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
            yield return null;

            Assert.That(playerA.transform.position, Is.EqualTo(spawnA.position));
            Assert.That(playerB.transform.position, Is.EqualTo(spawnB.position));
            Assert.That(roster.Players.Count, Is.EqualTo(2));

            Object.Destroy(rosterObject);
            Object.Destroy(spawnA.gameObject);
            Object.Destroy(spawnB.gameObject);
            Object.Destroy(playerA);
            Object.Destroy(playerB);
        }
    }
}
