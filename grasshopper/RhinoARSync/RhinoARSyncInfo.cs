using System;
using System.Drawing;
using Grasshopper.Kernel;

namespace RhinoARSync
{
    public class RhinoARSyncInfo : GH_AssemblyInfo
    {
        public override string Name => "RhinoARSync";
        public override string Description => "Stream Rhino/Grasshopper geometry to AR devices in real-time via WebSocket";
        public override Guid Id => new Guid("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
        public override string AuthorName => "McMuff86";
        public override string AuthorContact => "https://github.com/McMuff86/RhinoARViewer";
        public override string Version => "1.0.0";
        public override Bitmap Icon => null; // TODO: Add icon
    }
}
