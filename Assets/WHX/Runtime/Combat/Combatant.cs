using System;
using UnityEngine;

namespace WHX.Combat
{
    public sealed class Combatant : MonoBehaviour
    {
        [SerializeField, Min(1f)] private float maximumHealth = 100f;

        private Health health;

        public float CurrentHealth => health?.Current ?? maximumHealth;
        public float MaximumHealth => maximumHealth;
        public bool IsDefeated => health?.IsDepleted ?? false;

        public event Action<Combatant, float> Damaged;
        public event Action<Combatant> Defeated;

        private void Awake()
        {
            health = new Health(maximumHealth);
        }

        public float ReceiveDamage(float amount)
        {
            float applied = health.ApplyDamage(amount);
            if (applied <= 0f)
            {
                return 0f;
            }

            Damaged?.Invoke(this, applied);
            if (health.IsDepleted)
            {
                Defeated?.Invoke(this);
            }

            return applied;
        }
    }
}

