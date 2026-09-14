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
            Vector3 planar = new Vector3(input.Move.x, 0f, input.Move.y);
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
    }
}

