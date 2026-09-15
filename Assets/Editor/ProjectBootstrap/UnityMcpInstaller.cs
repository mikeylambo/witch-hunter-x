using System.Linq;
using UnityEditor;
using UnityEditor.PackageManager;
using UnityEditor.PackageManager.Requests;
using UnityEngine;

namespace WHX.Editor.ProjectBootstrap
{
    public static class UnityMcpInstaller
    {
        private const string PackageUrl = "https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#v10.0.0";
        private const double TimeoutSeconds = 600d;

        private static AddRequest request;
        private static double deadline;

        public static void EnableHttpAutoStart()
        {
            EditorPrefs.SetBool("MCPForUnity.UseHttpTransport", true);
            EditorPrefs.SetBool("MCPForUnity.AutoStartOnLoad", true);
            Debug.Log("[WHX] CoplayDev HTTP bridge auto-start enabled for this Editor.");
            EditorApplication.Exit(0);
        }

        public static void Install()
        {
            Debug.Log($"[WHX] Installing the sole Unity MCP provider: {PackageUrl}");
            request = Client.Add(PackageUrl);
            deadline = EditorApplication.timeSinceStartup + TimeoutSeconds;
            EditorApplication.update += Poll;
        }

        private static void Poll()
        {
            if (request == null)
            {
                return;
            }

            if (!request.IsCompleted)
            {
                if (EditorApplication.timeSinceStartup > deadline)
                {
                    EditorApplication.update -= Poll;
                    Debug.LogError("[WHX] Timed out while installing CoplayDev/unity-mcp.");
                    EditorApplication.Exit(2);
                }

                return;
            }

            EditorApplication.update -= Poll;
            if (request.Status == StatusCode.Success)
            {
                Debug.Log($"[WHX] Unity MCP installed: {request.Result.name}@{request.Result.version}");
                EditorApplication.Exit(0);
                return;
            }

            Debug.LogError($"[WHX] Unity MCP install failed: {request.Error?.message}");
            EditorApplication.Exit(1);
        }
    }
}
