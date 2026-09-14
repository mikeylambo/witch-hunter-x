using UnityEngine;
using WHX.Input;

namespace WHX.Player
{
    [RequireComponent(typeof(CharacterController), typeof(PlayerInputReader))]
    public sealed class CharacterMotor : MonoBehaviour
    {
        [SerializeField, Min(0f)] private float moveSpeed = 7f;
        [SerializeField, Min(0f)] private float turnSpeed = 900f;
        [SerializeField] private float gravity = -25f;
        [SerializeField] private Transform movementReference;

        private CharacterController characterController;
        private PlayerInputReader input;
        private float verticalVelocity;

        private void Awake()
        {
            characterController = GetComponent<CharacterController>();
            input = GetComponent<PlayerInputReader>();
        }

        private void Update()
        {
            Vector3 planar = CalculatePlanarDirection(input.Move, movementReference);
            if (planar.sqrMagnitude > 1f)
            {
                planar.Normalize();
            }

            if (planar.sqrMagnitude > 0.001f)
            {
                Quaternion desiredRotation = Quaternion.LookRotation(planar, Vector3.up);
                transform.rotation = Quaternion.RotateTowards(transform.rotation, desiredRotation, turnSpeed * Time.deltaTime);
            }

            verticalVelocity = characterController.isGrounded && verticalVelocity < 0f
                ? -2f
                : verticalVelocity + gravity * Time.deltaTime;

            Vector3 velocity = planar * moveSpeed + Vector3.up * verticalVelocity;
            characterController.Move(velocity * Time.deltaTime);
        }

        public void SetMovementReference(Transform reference)
        {
            movementReference = reference;
        }

        public static Vector3 CalculatePlanarDirection(Vector2 moveInput, Transform reference)
        {
            Vector3 forward = reference != null ? reference.forward : Vector3.forward;
            Vector3 right = reference != null ? reference.right : Vector3.right;
            forward.y = 0f;
            right.y = 0f;
            forward.Normalize();
            right.Normalize();

            Vector3 direction = right * moveInput.x + forward * moveInput.y;
            return direction.sqrMagnitude > 1f ? direction.normalized : direction;
        }
    }
}
