using UnityEngine;
using UnityEngine.InputSystem;

namespace WHX.Player
{
    [RequireComponent(typeof(PlayerInput), typeof(PlayerCharacterIdentity))]
    public sealed class PlayerCharacterSelector : MonoBehaviour
    {
        [SerializeField] private Transform presentationRoot;
        [SerializeField] private GameObject[] characterPresentations = new GameObject[4];

        public GameObject ActivePresentation { get; private set; }

        private void Start()
        {
            SelectForPlayerIndex(GetComponent<PlayerInput>().playerIndex);
        }

        public void SelectForPlayerIndex(int playerIndex)
        {
            if (ActivePresentation != null)
            {
                Destroy(ActivePresentation);
            }

            if (characterPresentations == null || characterPresentations.Length == 0)
            {
                return;
            }

            int index = Mathf.Abs(playerIndex) % characterPresentations.Length;
            GameObject prefab = characterPresentations[index];
            if (prefab == null || presentationRoot == null)
            {
                return;
            }

            ActivePresentation = Instantiate(prefab, presentationRoot);
            ActivePresentation.name = prefab.name;
            GetComponent<PlayerCharacterIdentity>().Configure((PlayerCharacter)index);
        }

        public void Configure(Transform root, GameObject[] presentations)
        {
            presentationRoot = root;
            characterPresentations = presentations;
        }
    }
}
