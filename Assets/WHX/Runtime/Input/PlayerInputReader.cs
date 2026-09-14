using UnityEngine;
using UnityEngine.InputSystem;

namespace WHX.Input
{
    [RequireComponent(typeof(PlayerInput))]
    public sealed class PlayerInputReader : MonoBehaviour
    {
        private InputAction moveAction;
        private InputAction attackAction;

        public Vector2 Move { get; private set; }
        public bool AttackPressedThisFrame { get; private set; }

        private void Awake()
        {
            PlayerInput playerInput = GetComponent<PlayerInput>();
            moveAction = playerInput.actions["Move"];
            attackAction = playerInput.actions["Attack"];
        }

        private void OnEnable()
        {
            if (attackAction != null)
            {
                attackAction.performed += OnAttack;
            }
        }

        private void OnDisable()
        {
            if (attackAction != null)
            {
                attackAction.performed -= OnAttack;
            }

            Move = Vector2.zero;
            AttackPressedThisFrame = false;
        }

        private void Update()
        {
            Move = moveAction?.ReadValue<Vector2>() ?? Vector2.zero;
        }

        private void LateUpdate()
        {
            AttackPressedThisFrame = false;
        }

        private void OnAttack(InputAction.CallbackContext context)
        {
            AttackPressedThisFrame = true;
        }
    }
}

