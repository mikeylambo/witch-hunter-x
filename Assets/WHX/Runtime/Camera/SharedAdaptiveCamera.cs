using System.Collections.Generic;
using Unity.Cinemachine;
using UnityEngine;
using WHX.Player;

namespace WHX.CameraSystem
{
    [DisallowMultipleComponent]
    public sealed class SharedAdaptiveCamera : CinemachineExtension
    {
        [SerializeField] private LocalPlayerRoster roster;
        [SerializeField] private Vector3 viewingDirection = new Vector3(0f, 0.7f, -1f);
        [SerializeField, Min(0f)] private float targetHeight = 1.2f;
        [SerializeField, Min(0f)] private float framingPadding = 3f;
        [SerializeField, Min(0.1f)] private float minimumDistance = 10f;
        [SerializeField, Min(0.1f)] private float maximumDistance = 28f;
        [SerializeField, Min(0f)] private float positionDamping = 0.18f;

        private readonly List<Vector3> positions = new List<Vector3>(4);
        private Vector3 currentPosition;
        private Vector3 positionVelocity;
        private bool initialized;

        public LocalPlayerRoster Roster => roster;

        public void Configure(LocalPlayerRoster playerRoster)
        {
            roster = playerRoster;
        }

        protected override void PostPipelineStageCallback(
            CinemachineVirtualCameraBase vcam,
            CinemachineCore.Stage stage,
            ref CameraState state,
            float deltaTime)
        {
            if (stage != CinemachineCore.Stage.Finalize || roster == null)
            {
                return;
            }

            positions.Clear();
            for (int i = 0; i < roster.Players.Count; i++)
            {
                if (roster.Players[i] != null)
                {
                    PlayerCombatAnchors anchors = roster.Players[i].GetComponent<PlayerCombatAnchors>();
                    Transform target = anchors != null && anchors.CameraTarget != null
                        ? anchors.CameraTarget
                        : roster.Players[i].transform;
                    positions.Add(target.position);
                }
            }

            if (positions.Count == 0)
            {
                return;
            }

            AdaptiveFrame frame = AdaptiveFrameSolver.Solve(
                positions,
                state.Lens.FieldOfView,
                framingPadding,
                minimumDistance,
                maximumDistance);

            Vector3 focus = frame.Focus + Vector3.up * targetHeight;
            Vector3 direction = viewingDirection.sqrMagnitude > 0.001f
                ? viewingDirection.normalized
                : new Vector3(0f, 0.7f, -1f).normalized;
            Vector3 desiredPosition = focus + direction * frame.Distance;

            if (!initialized || deltaTime < 0f || positionDamping <= 0f)
            {
                currentPosition = desiredPosition;
                positionVelocity = Vector3.zero;
                initialized = true;
            }
            else
            {
                currentPosition = Vector3.SmoothDamp(
                    currentPosition,
                    desiredPosition,
                    ref positionVelocity,
                    positionDamping,
                    Mathf.Infinity,
                    deltaTime);
            }

            state.RawPosition = currentPosition;
            state.RawOrientation = Quaternion.LookRotation(focus - currentPosition, Vector3.up);
            state.ReferenceLookAt = focus;
        }
    }
}
