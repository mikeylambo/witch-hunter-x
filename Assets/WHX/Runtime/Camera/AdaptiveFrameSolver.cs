using System;
using System.Collections.Generic;
using UnityEngine;

namespace WHX.CameraSystem
{
    public readonly struct AdaptiveFrame
    {
        public AdaptiveFrame(Vector3 focus, float distance)
        {
            Focus = focus;
            Distance = distance;
        }

        public Vector3 Focus { get; }
        public float Distance { get; }
    }

    public static class AdaptiveFrameSolver
    {
        public static AdaptiveFrame Solve(
            IReadOnlyList<Vector3> positions,
            float verticalFieldOfView,
            float padding,
            float minimumDistance,
            float maximumDistance)
        {
            if (positions == null || positions.Count == 0)
            {
                return new AdaptiveFrame(Vector3.zero, minimumDistance);
            }

            Vector3 focus = Vector3.zero;
            for (int i = 0; i < positions.Count; i++)
            {
                focus += positions[i];
            }

            focus /= positions.Count;
            float radius = 0f;
            for (int i = 0; i < positions.Count; i++)
            {
                Vector3 offset = positions[i] - focus;
                offset.y = 0f;
                radius = Mathf.Max(radius, offset.magnitude);
            }

            float halfFovRadians = Mathf.Clamp(verticalFieldOfView, 1f, 179f) * 0.5f * Mathf.Deg2Rad;
            float fittedDistance = (radius + Math.Max(0f, padding)) / Mathf.Tan(halfFovRadians);
            return new AdaptiveFrame(focus, Mathf.Clamp(fittedDistance, minimumDistance, maximumDistance));
        }
    }
}

