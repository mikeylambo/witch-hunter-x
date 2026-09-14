using System;

namespace WHX.Combat.Handoffs
{
    public readonly struct HandoffEvent
    {
        public HandoffEvent(int sourcePlayerIndex, int receivingPlayerIndex, double occurredAt)
        {
            if (sourcePlayerIndex < 0)
            {
                throw new ArgumentOutOfRangeException(nameof(sourcePlayerIndex));
            }

            if (receivingPlayerIndex < 0 || receivingPlayerIndex == sourcePlayerIndex)
            {
                throw new ArgumentOutOfRangeException(nameof(receivingPlayerIndex));
            }

            SourcePlayerIndex = sourcePlayerIndex;
            ReceivingPlayerIndex = receivingPlayerIndex;
            OccurredAt = occurredAt;
        }

        public int SourcePlayerIndex { get; }
        public int ReceivingPlayerIndex { get; }
        public double OccurredAt { get; }
    }
}

