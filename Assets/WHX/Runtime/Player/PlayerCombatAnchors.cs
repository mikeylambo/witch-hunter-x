using UnityEngine;

namespace WHX.Player
{
    public sealed class PlayerCombatAnchors : MonoBehaviour
    {
        [SerializeField] private Transform cameraTarget;
        [SerializeField] private Transform weaponRight;
        [SerializeField] private Transform weaponLeft;
        [SerializeField] private Transform projectileOrigin;
        [SerializeField] private Transform groundProbe;

        public Transform CameraTarget => cameraTarget;
        public Transform WeaponRight => weaponRight;
        public Transform WeaponLeft => weaponLeft;
        public Transform ProjectileOrigin => projectileOrigin;
        public Transform GroundProbe => groundProbe;

        public void Configure(Transform camera, Transform right, Transform left, Transform projectile, Transform ground)
        {
            cameraTarget = camera;
            weaponRight = right;
            weaponLeft = left;
            projectileOrigin = projectile;
            groundProbe = ground;
        }
    }
}
