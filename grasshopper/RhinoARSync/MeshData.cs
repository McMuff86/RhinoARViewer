using Newtonsoft.Json;

namespace RhinoARSync
{
    /// <summary>
    /// Data model for mesh serialization (Protocol v1)
    /// </summary>
    public class MeshData
    {
        [JsonProperty("vertices")]
        public double[] Vertices { get; set; } = Array.Empty<double>();

        [JsonProperty("triangles")]
        public int[] Triangles { get; set; } = Array.Empty<int>();

        [JsonProperty("normals")]
        public double[]? Normals { get; set; }

        [JsonProperty("colors")]
        public double[]? Colors { get; set; }
    }

    /// <summary>
    /// Mesh update message (Protocol v1)
    /// </summary>
    public class MeshUpdateMessage
    {
        [JsonProperty("version")]
        public int Version { get; set; } = 1;

        [JsonProperty("type")]
        public string Type { get; set; } = "mesh-update";

        [JsonProperty("timestamp")]
        public long Timestamp { get; set; }

        [JsonProperty("meshId")]
        public string MeshId { get; set; } = string.Empty;

        [JsonProperty("action")]
        public string Action { get; set; } = "update";

        [JsonProperty("data")]
        public MeshData? Data { get; set; }
    }

    /// <summary>
    /// Room info response
    /// </summary>
    public class RoomInfo
    {
        [JsonProperty("roomCode")]
        public string RoomCode { get; set; } = string.Empty;

        [JsonProperty("clientCount")]
        public int ClientCount { get; set; }
    }

    /// <summary>
    /// Create room response
    /// </summary>
    public class CreateRoomResponse
    {
        [JsonProperty("success")]
        public bool Success { get; set; }

        [JsonProperty("roomCode")]
        public string? RoomCode { get; set; }
    }
}
