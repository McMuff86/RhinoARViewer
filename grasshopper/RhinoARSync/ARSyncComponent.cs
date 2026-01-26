using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Grasshopper.Kernel;
using Rhino.Geometry;

namespace RhinoARSync
{
    /// <summary>
    /// Grasshopper component that streams mesh data to AR devices via WebSocket
    /// </summary>
    public class ARSyncComponent : GH_Component
    {
        private static ConnectionManager? _connectionManager;
        private static readonly object _lock = new();

        private string _lastStatus = "Not connected";
        private string _lastError = "";
        private bool _wasConnected = false;

        public ARSyncComponent()
            : base(
                "AR Sync",
                "ARSync",
                "Stream mesh geometry to AR devices in real-time",
                "Display",
                "Preview")
        {
        }

        public override Guid ComponentGuid => new Guid("b2c3d4e5-f6a7-8901-bcde-f23456789012");

        protected override void RegisterInputParams(GH_InputParamManager pManager)
        {
            pManager.AddMeshParameter("Mesh", "M", "Mesh to stream (or Brep will be converted)", GH_ParamAccess.item);
            pManager.AddTextParameter("Server", "S", "Server URL (default: http://localhost:3000)", GH_ParamAccess.item, "http://localhost:3000");
            pManager.AddTextParameter("Room", "R", "Room code (leave empty to create new room)", GH_ParamAccess.item, "");
            pManager.AddBooleanParameter("Connect", "C", "Connect to server", GH_ParamAccess.item, false);
            pManager.AddBooleanParameter("Send", "X", "Send mesh updates", GH_ParamAccess.item, false);

            pManager[0].Optional = true; // Mesh is optional when just connecting
            pManager[2].Optional = true; // Room code is optional
        }

        protected override void RegisterOutputParams(GH_OutputParamManager pManager)
        {
            pManager.AddTextParameter("Status", "St", "Connection status", GH_ParamAccess.item);
            pManager.AddTextParameter("Room Code", "RC", "Current room code", GH_ParamAccess.item);
            pManager.AddIntegerParameter("Clients", "Cl", "Number of connected clients", GH_ParamAccess.item);
            pManager.AddTextParameter("Mesh Info", "MI", "Mesh statistics", GH_ParamAccess.item);
        }

        protected override void SolveInstance(IGH_DataAccess DA)
        {
            // Get inputs
            Mesh? mesh = null;
            string serverUrl = "http://localhost:3000";
            string roomCode = "";
            bool connect = false;
            bool send = false;

            DA.GetData(0, ref mesh);
            DA.GetData(1, ref serverUrl);
            DA.GetData(2, ref roomCode);
            DA.GetData(3, ref connect);
            DA.GetData(4, ref send);

            // Initialize connection manager (singleton)
            lock (_lock)
            {
                if (_connectionManager == null)
                {
                    _connectionManager = new ConnectionManager();
                    _connectionManager.OnStatusChanged += (status) =>
                    {
                        _lastStatus = status;
                        ExpireSolution(true);
                    };
                    _connectionManager.OnError += (error) =>
                    {
                        _lastError = error;
                        AddRuntimeMessage(GH_RuntimeMessageLevel.Warning, error);
                        ExpireSolution(true);
                    };
                    _connectionManager.OnRoomJoined += (code, count) =>
                    {
                        ExpireSolution(true);
                    };
                }
            }

            // Update server URL
            _connectionManager.SetServerUrl(serverUrl);

            // Handle connection
            if (connect && !_connectionManager.IsConnected)
            {
                // Connect asynchronously
                Task.Run(async () =>
                {
                    var connected = await _connectionManager.ConnectAsync();
                    if (connected)
                    {
                        // Create or join room
                        if (string.IsNullOrWhiteSpace(roomCode))
                        {
                            await _connectionManager.CreateRoomAsync();
                        }
                        else
                        {
                            await _connectionManager.JoinRoomAsync(roomCode);
                        }
                    }
                    Rhino.RhinoApp.InvokeOnUiThread((Action)(() => ExpireSolution(true)));
                });
            }
            else if (!connect && _connectionManager.IsConnected)
            {
                // Disconnect
                Task.Run(async () =>
                {
                    await _connectionManager.DisconnectAsync();
                    Rhino.RhinoApp.InvokeOnUiThread((Action)(() => ExpireSolution(true)));
                });
            }

            // Send mesh if connected and enabled
            string meshInfo = "No mesh";
            if (send && _connectionManager.IsConnected && mesh != null)
            {
                try
                {
                    var meshData = MeshSerializer.SerializeMesh(mesh);

                    if (!MeshSerializer.ValidateMesh(meshData, out var error))
                    {
                        AddRuntimeMessage(GH_RuntimeMessageLevel.Error, error);
                    }
                    else
                    {
                        var (vertices, triangles, sizeKB) = MeshSerializer.GetMeshStats(meshData);
                        meshInfo = $"V: {vertices:N0} | T: {triangles:N0} | {sizeKB:F1} KB";

                        // Send asynchronously
                        string meshId = ComponentGuid.ToString();
                        Task.Run(async () =>
                        {
                            await _connectionManager.SendMeshUpdateAsync(meshId, meshData);
                        });
                    }
                }
                catch (Exception ex)
                {
                    AddRuntimeMessage(GH_RuntimeMessageLevel.Error, $"Mesh error: {ex.Message}");
                }
            }

            // Set outputs
            DA.SetData(0, _lastStatus);
            DA.SetData(1, _connectionManager.RoomCode ?? "");
            DA.SetData(2, _connectionManager.ClientCount);
            DA.SetData(3, meshInfo);

            // Clear error after displaying
            if (!string.IsNullOrEmpty(_lastError))
            {
                _lastError = "";
            }
        }

        protected override System.Drawing.Bitmap Icon => null; // TODO: Add icon

        public override void RemovedFromDocument(GH_Document document)
        {
            base.RemovedFromDocument(document);

            // Cleanup connection when component is removed
            lock (_lock)
            {
                if (_connectionManager != null)
                {
                    _connectionManager.Dispose();
                    _connectionManager = null;
                }
            }
        }
    }
}
