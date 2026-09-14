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
        [SerializeField] private Transform movementReference;

        private readonly List<PlayerInput> players = new List<PlayerInput>(4);

        public IReadOnlyList<PlayerInput> Players => players;
        public int MaximumPlayers => maximumPlayers;

        public event Action<PlayerInput> PlayerJoined;
        public event Action<PlayerInput> PlayerLeft;

        public void OnPlayerJoined(PlayerInput playerInput)
        {
            if (playerInput == null || players.Contains(playerInput))
            {
                return;
            }

            if (players.Count >= maximumPlayers)
            {
                Destroy(playerInput.gameObject);
                return;
            }

            players.Add(playerInput);
            int spawnIndex = Mathf.Min(players.Count - 1, spawnPoints.Length - 1);
            if (spawnIndex >= 0 && spawnPoints[spawnIndex] != null)
            {
                playerInput.transform.SetPositionAndRotation(spawnPoints[spawnIndex].position, spawnPoints[spawnIndex].rotation);
            }

            if (playerInput.TryGetComponent(out CharacterMotor motor))
            {
                motor.SetMovementReference(movementReference);
            }

            PlayerJoined?.Invoke(playerInput);
        }

        public void Configure(Transform[] points, Transform reference, int playerLimit = 4)
        {
            spawnPoints = points ?? Array.Empty<Transform>();
            movementReference = reference;
            maximumPlayers = Mathf.Clamp(playerLimit, 1, 4);
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
