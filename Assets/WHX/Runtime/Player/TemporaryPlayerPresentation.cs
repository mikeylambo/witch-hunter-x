using UnityEngine;
using UnityEngine.InputSystem;

namespace WHX.Player
{
    [RequireComponent(typeof(PlayerInput))]
    public sealed class TemporaryPlayerPresentation : MonoBehaviour
    {
        [SerializeField] private Renderer targetRenderer;

        private static readonly Color[] PlayerColors =
        {
            new Color(1f, 0.28f, 0.04f),
            new Color(0.05f, 0.65f, 1f),
            new Color(0.7f, 0.2f, 1f),
            new Color(0.15f, 0.9f, 0.35f)
        };

        private void Start()
        {
            if (targetRenderer == null)
            {
                targetRenderer = GetComponentInChildren<Renderer>();
            }

            if (targetRenderer != null)
            {
                int playerIndex = GetComponent<PlayerInput>().playerIndex;
                targetRenderer.material.color = PlayerColors[playerIndex % PlayerColors.Length];
            }
        }
    }
}

