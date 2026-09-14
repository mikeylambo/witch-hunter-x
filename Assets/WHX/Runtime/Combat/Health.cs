using System;

namespace WHX.Combat
{
    public sealed class Health
    {
        public Health(float maximum)
        {
            if (maximum <= 0f)
            {
                throw new ArgumentOutOfRangeException(nameof(maximum), "Maximum health must be positive.");
            }

            Maximum = maximum;
            Current = maximum;
        }

        public float Current { get; private set; }
        public float Maximum { get; }
        public bool IsDepleted => Current <= 0f;

        public float ApplyDamage(float amount)
        {
            if (amount <= 0f || IsDepleted)
            {
                return 0f;
            }

            float applied = Math.Min(Current, amount);
            Current -= applied;
            return applied;
        }

        public float Restore(float amount)
        {
            if (amount <= 0f || IsDepleted)
            {
                return 0f;
            }

            float restored = Math.Min(Maximum - Current, amount);
            Current += restored;
            return restored;
        }
    }
}

