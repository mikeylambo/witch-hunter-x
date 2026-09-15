using NUnit.Framework;
using UnityEditor;
using UnityEngine;
using UnityEngine.InputSystem;
using WHX.Combat;
using WHX.Input;
using WHX.Player;

namespace WHX.Tests
{
    public sealed class CharacterIntegrationAssetTests
    {
        [Test]
        public void PlayerBase_PreservesGameplayAndProvidesSharedAnchors()
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>("Assets/WHX/Prefabs/Player/PlayerBase.prefab");
            Assert.That(prefab, Is.Not.Null);
            Assert.That(prefab.GetComponent<PlayerInput>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<PlayerInputReader>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<CharacterMotor>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<Combatant>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<PlayerCharacterSelector>(), Is.Not.Null);
            PlayerCombatAnchors anchors = prefab.GetComponent<PlayerCombatAnchors>();
            Assert.That(anchors.CameraTarget, Is.Not.Null);
            Assert.That(anchors.WeaponRight, Is.Not.Null);
            Assert.That(anchors.WeaponLeft, Is.Not.Null);
            Assert.That(anchors.ProjectileOrigin, Is.Not.Null);
            Assert.That(anchors.GroundProbe, Is.Not.Null);
            CharacterController controller = prefab.GetComponent<CharacterController>();
            Assert.That(controller.height, Is.EqualTo(1.8f).Within(0.01f));
            Assert.That(controller.center.y, Is.EqualTo(0.9f).Within(0.01f));
            Assert.That(controller.radius, Is.EqualTo(0.83f).Within(0.01f));
        }

        [TestCase(PlayerCharacter.Riven)]
        [TestCase(PlayerCharacter.Morrow)]
        [TestCase(PlayerCharacter.Vale)]
        [TestCase(PlayerCharacter.Knox)]
        public void CharacterVariant_HasGroundedPresentationAndControllerFit(PlayerCharacter character)
        {
            GameObject prefab = AssetDatabase.LoadAssetAtPath<GameObject>($"Assets/WHX/Prefabs/Player/{character}Player.prefab");
            Assert.That(prefab, Is.Not.Null);
            Assert.That(prefab.GetComponent<PlayerCharacterIdentity>().Character, Is.EqualTo(character));
            Assert.That(prefab.GetComponent<PlayerInput>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<CharacterMotor>(), Is.Not.Null);
            Assert.That(prefab.GetComponent<Combatant>(), Is.Not.Null);
            Assert.That(prefab.transform.Find("PresentationRoot").childCount, Is.EqualTo(1));

            GameObject instance = Object.Instantiate(prefab);
            try
            {
                Renderer[] renderers = instance.GetComponentsInChildren<Renderer>();
                Assert.That(renderers.Length, Is.GreaterThan(0));
                Bounds bounds = renderers[0].bounds;
                for (int i = 1; i < renderers.Length; i++) bounds.Encapsulate(renderers[i].bounds);
                Assert.That(bounds.min.y, Is.EqualTo(0f).Within(0.05f));
                Assert.That(bounds.size.y, Is.InRange(1.75f, 1.85f));
                CharacterController controller = instance.GetComponent<CharacterController>();
                Assert.That(controller.height, Is.GreaterThanOrEqualTo(bounds.size.y - 0.05f));
                Assert.That(controller.radius, Is.GreaterThanOrEqualTo(Mathf.Max(bounds.extents.x, bounds.extents.z) - 0.05f));
            }
            finally
            {
                Object.DestroyImmediate(instance);
            }
        }
    }
}
