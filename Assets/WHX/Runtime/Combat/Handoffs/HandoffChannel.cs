using System;

namespace WHX.Combat.Handoffs
{
    public sealed class HandoffChannel
    {
        public event Action<HandoffEvent> Raised;

        public void Raise(HandoffEvent handoffEvent)
        {
            Raised?.Invoke(handoffEvent);
        }
    }
}

