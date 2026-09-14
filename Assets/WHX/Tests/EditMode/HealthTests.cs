using NUnit.Framework;
using WHX.Combat;

namespace WHX.Tests
{
    public sealed class HealthTests
    {
        [Test]
        public void ApplyDamage_ClampsAtZero()
        {
            var health = new Health(100f);

            float applied = health.ApplyDamage(150f);

            Assert.That(applied, Is.EqualTo(100f));
            Assert.That(health.Current, Is.Zero);
            Assert.That(health.IsDepleted, Is.True);
        }

        [Test]
        public void Restore_DoesNotReviveDepletedHealth()
        {
            var health = new Health(10f);
            health.ApplyDamage(10f);

            Assert.That(health.Restore(5f), Is.Zero);
            Assert.That(health.IsDepleted, Is.True);
        }
    }
}

