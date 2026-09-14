using UnityEngine;
using UnityEngine.InputSystem;

namespace WHX.Player
{
    [RequireComponent(typeof(PlayerInputManager), typeof(LocalPlayerRoster))]
    public sealed class LocalPlayerSession : MonoBehaviour
    {
        private PlayerInputManager inputManager;
        private LocalPlayerRoster roster;

        private void Awake()
        {
            inputManager = GetComponent<PlayerInputManager>();
            roster = GetComponent<LocalPlayerRoster>();
        }

        private void OnEnable()
        {
            inputManager.onPlayerJoined += roster.OnPlayerJoined;
            inputManager.onPlayerLeft += roster.OnPlayerLeft;
        }

        private void OnDisable()
        {
            inputManager.onPlayerJoined -= roster.OnPlayerJoined;
            inputManager.onPlayerLeft -= roster.OnPlayerLeft;
        }
    }
}

