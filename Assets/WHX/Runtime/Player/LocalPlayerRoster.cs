using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace WHX.Player
{
    public sealed class LocalPlayerRoster : MonoBehaviour
    {
        [SerializeField, Range(1, 4)] private int maximumPlayers = 4;
        [SerializeField] private Transform[] spawnPoints = Array.Empty<Transform>();

        private readonly List<PlayerInput> players = new List<PlayerInput>(4);

        public IReadOnlyList<PlayerInput> Players => players;

        public event Action<PlayerInput> PlayerJoined;
        public event Action<PlayerInput> PlayerLeft;

        public void OnPlayerJoined(PlayerInput playerInput)
        {
            if (players.Count >= maximumPlayers)
            {
                Destroy(playerInput.gameObject);
                return;
            }

            players.Add(playerInput);
            int spawnIndex = Mathf.Min(playerInput.playerIndex, spawnPoints.Length - 1);
            if (spawnIndex >= 0 && spawnPoints[spawnIndex] != null)
            {
                playerInput.transform.SetPositionAndRotation(spawnPoints[spawnIndex].position, spawnPoints[spawnIndex].rotation);
            }

            PlayerJoined?.Invoke(playerInput);
        }

        public void OnPlayerLeft(PlayerInput playerInput)
        {
            if (players.Remove(playerInput))
            {
                PlayerLeft?.Invoke(playerInput);
            }
        }
    }
}

