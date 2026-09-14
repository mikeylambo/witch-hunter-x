using System;
using NUnit.Framework;
using WHX.Combat.Handoffs;

namespace WHX.Tests
{
    public sealed class HandoffEventTests
    {
        [Test]
        public void Constructor_RejectsSelfHandoff()
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => new HandoffEvent(1, 1, 3d));
        }

        [Test]
        public void Channel_RaisesHandoffToSubscribers()
        {
            var channel = new HandoffChannel();
            HandoffEvent received = default;
            channel.Raised += value => received = value;

            channel.Raise(new HandoffEvent(0, 2, 5d));

            Assert.That(received.SourcePlayerIndex, Is.EqualTo(0));
            Assert.That(received.ReceivingPlayerIndex, Is.EqualTo(2));
        }
    }
}
