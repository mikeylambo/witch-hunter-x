using NUnit.Framework;
using UnityEngine;
using WHX.CameraSystem;
using WHX.Player;

namespace WHX.Tests
{
    public sealed class AdaptiveFrameSolverTests
    {
        [Test]
        public void Solve_CentersOnAllPlayersAndExpandsForSeparation()
        {
            var closePlayers = new[] { new Vector3(-1f, 0f, 0f), new Vector3(1f, 0f, 0f) };
            var farPlayers = new[] { new Vector3(-8f, 0f, 0f), new Vector3(8f, 0f, 0f) };

            AdaptiveFrame closeFrame = AdaptiveFrameSolver.Solve(closePlayers, 45f, 2f, 5f, 30f);
            AdaptiveFrame farFrame = AdaptiveFrameSolver.Solve(farPlayers, 45f, 2f, 5f, 30f);

            Assert.That(closeFrame.Focus, Is.EqualTo(Vector3.zero));
            Assert.That(farFrame.Focus, Is.EqualTo(Vector3.zero));
            Assert.That(farFrame.Distance, Is.GreaterThan(closeFrame.Distance));
        }

        [Test]
        public void CalculatePlanarDirection_UsesCameraYaw()
        {
            var camera = new GameObject("Camera").transform;
            camera.rotation = Quaternion.Euler(0f, 90f, 0f);

            Vector3 direction = CharacterMotor.CalculatePlanarDirection(Vector2.up, camera);

            Assert.That(direction.x, Is.EqualTo(1f).Within(0.001f));
            Assert.That(direction.z, Is.EqualTo(0f).Within(0.001f));
            Object.DestroyImmediate(camera.gameObject);
        }
    }
}
