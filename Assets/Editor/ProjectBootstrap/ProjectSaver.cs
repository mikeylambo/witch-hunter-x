using UnityEditor;
using UnityEngine;

namespace WHX.Editor.ProjectBootstrap
{
    public static class ProjectSaver
    {
        public static void SaveAll()
        {
            AssetDatabase.Refresh(ImportAssetOptions.ForceUpdate);
            AssetDatabase.SaveAssets();
            Debug.Log("[WHX Bootstrap] Assets imported and saved.");
            EditorApplication.Exit(0);
        }
    }
}
