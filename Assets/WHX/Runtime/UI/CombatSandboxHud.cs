using UnityEngine;
using WHX.Player;

namespace WHX.UI
{
    public sealed class CombatSandboxHud : MonoBehaviour
    {
        [SerializeField] private LocalPlayerRoster roster;

        public void Configure(LocalPlayerRoster playerRoster)
        {
            roster = playerRoster;
        }

        private void OnGUI()
        {
            int count = roster != null ? roster.Players.Count : 0;
            GUI.Box(new Rect(20f, 20f, 390f, 82f), "WITCH HUNTER X — COMBAT SANDBOX v0.2");
            GUI.Label(new Rect(36f, 48f, 360f, 22f), $"Players: {count}/4 — press a button on a new device to join");
            GUI.Label(new Rect(36f, 72f, 360f, 22f), "Move: WASD / left stick");
        }
    }
}
