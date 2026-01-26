using System;
using System.Collections.Generic;
using System.Linq;
using Rhino.Geometry;

namespace RhinoARSync
{
    /// <summary>
    /// Converts Rhino Mesh to serializable MeshData
    /// Handles coordinate conversion from Rhino (Z-up) to Unity (Y-up)
    /// </summary>
    public static class MeshSerializer
    {
        /// <summary>
        /// Convert a Rhino Mesh to MeshData for transmission
        /// </summary>
        /// <param name="mesh">The Rhino mesh to convert</param>
        /// <param name="includeNormals">Include vertex normals</param>
        /// <param name="includeColors">Include vertex colors</param>
        /// <returns>Serializable MeshData object</returns>
        public static MeshData SerializeMesh(Mesh mesh, bool includeNormals = true, bool includeColors = true)
        {
            if (mesh == null)
                throw new ArgumentNullException(nameof(mesh));

            // Ensure mesh has required data
            mesh.Faces.ConvertQuadsToTriangles();
            mesh.Normals.ComputeNormals();
            mesh.Compact();

            var meshData = new MeshData();

            // Vertices - convert from Rhino Z-up to Unity Y-up
            // Rhino: X=right, Y=forward, Z=up
            // Unity: X=right, Y=up, Z=forward
            // Conversion: (x, y, z) -> (x, z, y)
            // Also convert from mm to m (divide by 1000)
            var vertices = new List<double>(mesh.Vertices.Count * 3);
            foreach (var vertex in mesh.Vertices)
            {
                vertices.Add(vertex.X / 1000.0);  // X stays X
                vertices.Add(vertex.Z / 1000.0);  // Z becomes Y (up)
                vertices.Add(vertex.Y / 1000.0);  // Y becomes Z (forward)
            }
            meshData.Vertices = vertices.ToArray();

            // Triangles - reverse winding order due to coordinate flip
            var triangles = new List<int>(mesh.Faces.Count * 3);
            foreach (var face in mesh.Faces)
            {
                // Reverse winding: A, B, C -> A, C, B
                triangles.Add(face.A);
                triangles.Add(face.C);
                triangles.Add(face.B);
            }
            meshData.Triangles = triangles.ToArray();

            // Normals (optional)
            if (includeNormals && mesh.Normals.Count > 0)
            {
                var normals = new List<double>(mesh.Normals.Count * 3);
                foreach (var normal in mesh.Normals)
                {
                    normals.Add(normal.X);
                    normals.Add(normal.Z);  // Z becomes Y
                    normals.Add(normal.Y);  // Y becomes Z
                }
                meshData.Normals = normals.ToArray();
            }

            // Vertex Colors (optional)
            if (includeColors && mesh.VertexColors.Count > 0)
            {
                var colors = new List<double>(mesh.VertexColors.Count * 4);
                foreach (var color in mesh.VertexColors)
                {
                    colors.Add(color.R / 255.0);
                    colors.Add(color.G / 255.0);
                    colors.Add(color.B / 255.0);
                    colors.Add(color.A / 255.0);
                }
                meshData.Colors = colors.ToArray();
            }

            return meshData;
        }

        /// <summary>
        /// Convert a Brep to Mesh, then to MeshData
        /// </summary>
        public static MeshData SerializeBrep(Brep brep, bool includeNormals = true, bool includeColors = false)
        {
            if (brep == null)
                throw new ArgumentNullException(nameof(brep));

            // Convert Brep to Mesh with reasonable settings
            var meshParams = MeshingParameters.Default;
            meshParams.SimplePlanes = true;

            var meshes = Mesh.CreateFromBrep(brep, meshParams);
            if (meshes == null || meshes.Length == 0)
                throw new InvalidOperationException("Failed to mesh Brep");

            // Combine all meshes
            var combinedMesh = new Mesh();
            foreach (var m in meshes)
            {
                combinedMesh.Append(m);
            }

            return SerializeMesh(combinedMesh, includeNormals, includeColors);
        }

        /// <summary>
        /// Get statistics about a mesh for logging/display
        /// </summary>
        public static (int vertices, int triangles, double sizeKB) GetMeshStats(MeshData meshData)
        {
            int vertices = meshData.Vertices.Length / 3;
            int triangles = meshData.Triangles.Length / 3;

            // Estimate JSON size (rough calculation)
            double sizeBytes = meshData.Vertices.Length * 10  // ~10 chars per number
                             + meshData.Triangles.Length * 6  // ~6 chars per int
                             + (meshData.Normals?.Length ?? 0) * 10
                             + (meshData.Colors?.Length ?? 0) * 6
                             + 200; // overhead

            return (vertices, triangles, sizeBytes / 1024.0);
        }

        /// <summary>
        /// Check if mesh exceeds limits
        /// </summary>
        public static bool ValidateMesh(MeshData meshData, out string error)
        {
            const int MAX_VERTICES = 65535;
            const int MAX_TRIANGLES = 100000;
            const double MAX_SIZE_KB = 5 * 1024; // 5 MB

            var (vertices, triangles, sizeKB) = GetMeshStats(meshData);

            if (vertices > MAX_VERTICES)
            {
                error = $"Mesh has too many vertices ({vertices:N0}). Maximum: {MAX_VERTICES:N0}";
                return false;
            }

            if (triangles > MAX_TRIANGLES)
            {
                error = $"Mesh has too many triangles ({triangles:N0}). Maximum: {MAX_TRIANGLES:N0}";
                return false;
            }

            if (sizeKB > MAX_SIZE_KB)
            {
                error = $"Mesh is too large ({sizeKB:N0} KB). Maximum: {MAX_SIZE_KB:N0} KB";
                return false;
            }

            error = string.Empty;
            return true;
        }
    }
}
