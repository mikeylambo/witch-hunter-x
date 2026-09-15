using UnityEngine;

namespace WHX.Player
{
    public sealed class PlayerCharacterIdentity : MonoBehaviour
    {
        [SerializeField] private PlayerCharacter character;

        public PlayerCharacter Character => character;

        public void Configure(PlayerCharacter value)
        {
            character = value;
        }
    }
}
