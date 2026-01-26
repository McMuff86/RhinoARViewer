using System;
using System.Threading.Tasks;
using SocketIOClient;
using Newtonsoft.Json;

namespace RhinoARSync
{
    /// <summary>
    /// Manages WebSocket connection to the relay server
    /// </summary>
    public class ConnectionManager : IDisposable
    {
        private SocketIOClient.SocketIO? _socket;
        private string _serverUrl = "http://localhost:3000";
        private string? _roomCode;
        private bool _isConnected;
        private int _clientCount;
        private DateTime _lastUpdate = DateTime.MinValue;
        private readonly TimeSpan _throttleInterval = TimeSpan.FromMilliseconds(100); // 10 updates/sec

        public event Action<string>? OnStatusChanged;
        public event Action<string>? OnError;
        public event Action<string, int>? OnRoomJoined;

        public bool IsConnected => _isConnected;
        public string? RoomCode => _roomCode;
        public int ClientCount => _clientCount;
        public string ServerUrl => _serverUrl;

        public void SetServerUrl(string url)
        {
            if (string.IsNullOrWhiteSpace(url)) return;

            // Normalize URL
            if (!url.StartsWith("http://") && !url.StartsWith("https://"))
            {
                url = "http://" + url;
            }

            if (_serverUrl != url)
            {
                _serverUrl = url;
                // Reconnect if connected
                if (_isConnected)
                {
                    _ = DisconnectAsync();
                }
            }
        }

        public async Task<bool> ConnectAsync()
        {
            try
            {
                if (_socket != null)
                {
                    await DisconnectAsync();
                }

                _socket = new SocketIOClient.SocketIO(_serverUrl, new SocketIOOptions
                {
                    Reconnection = true,
                    ReconnectionAttempts = 3,
                    ReconnectionDelay = 1000
                });

                // Event handlers
                _socket.OnConnected += (sender, e) =>
                {
                    _isConnected = true;
                    OnStatusChanged?.Invoke("Connected to server");
                };

                _socket.OnDisconnected += (sender, e) =>
                {
                    _isConnected = false;
                    _roomCode = null;
                    OnStatusChanged?.Invoke("Disconnected from server");
                };

                _socket.OnError += (sender, e) =>
                {
                    OnError?.Invoke($"Socket error: {e}");
                };

                _socket.On("room-info", response =>
                {
                    try
                    {
                        var roomInfo = response.GetValue<RoomInfo>();
                        _roomCode = roomInfo.RoomCode;
                        _clientCount = roomInfo.ClientCount;
                        OnRoomJoined?.Invoke(_roomCode, _clientCount);
                        OnStatusChanged?.Invoke($"Room: {_roomCode} ({_clientCount} clients)");
                    }
                    catch (Exception ex)
                    {
                        OnError?.Invoke($"Failed to parse room info: {ex.Message}");
                    }
                });

                _socket.On("error", response =>
                {
                    try
                    {
                        var error = response.GetValue<dynamic>();
                        OnError?.Invoke($"Server error: {error.message}");
                    }
                    catch
                    {
                        OnError?.Invoke("Unknown server error");
                    }
                });

                await _socket.ConnectAsync();
                return true;
            }
            catch (Exception ex)
            {
                OnError?.Invoke($"Connection failed: {ex.Message}");
                return false;
            }
        }

        public async Task DisconnectAsync()
        {
            if (_socket != null)
            {
                await _socket.DisconnectAsync();
                _socket.Dispose();
                _socket = null;
            }
            _isConnected = false;
            _roomCode = null;
        }

        public async Task<string?> CreateRoomAsync()
        {
            if (_socket == null || !_isConnected)
            {
                OnError?.Invoke("Not connected to server");
                return null;
            }

            try
            {
                await _socket.EmitAsync("create-room", (ack) =>
                {
                    if (ack != null)
                    {
                        var result = ack.GetValue<CreateRoomResponse>();
                        if (result.Success && !string.IsNullOrEmpty(result.RoomCode))
                        {
                            _roomCode = result.RoomCode;
                            OnStatusChanged?.Invoke($"Created room: {_roomCode}");
                        }
                    }
                });

                // Wait a bit for the callback
                await Task.Delay(500);
                return _roomCode;
            }
            catch (Exception ex)
            {
                OnError?.Invoke($"Failed to create room: {ex.Message}");
                return null;
            }
        }

        public async Task<bool> JoinRoomAsync(string roomCode)
        {
            if (_socket == null || !_isConnected)
            {
                OnError?.Invoke("Not connected to server");
                return false;
            }

            if (string.IsNullOrWhiteSpace(roomCode))
            {
                OnError?.Invoke("Room code is required");
                return false;
            }

            try
            {
                await _socket.EmitAsync("join-room", new { roomCode = roomCode.ToUpper() });
                await Task.Delay(500);
                return _roomCode != null;
            }
            catch (Exception ex)
            {
                OnError?.Invoke($"Failed to join room: {ex.Message}");
                return false;
            }
        }

        public async Task<bool> SendMeshUpdateAsync(string meshId, MeshData meshData)
        {
            if (_socket == null || !_isConnected || _roomCode == null)
            {
                return false;
            }

            // Throttle updates
            var now = DateTime.UtcNow;
            if (now - _lastUpdate < _throttleInterval)
            {
                return true; // Skip this update
            }
            _lastUpdate = now;

            try
            {
                var message = new MeshUpdateMessage
                {
                    Timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    MeshId = meshId,
                    Action = "update",
                    Data = meshData
                };

                await _socket.EmitAsync("mesh-update", message);
                return true;
            }
            catch (Exception ex)
            {
                OnError?.Invoke($"Failed to send mesh: {ex.Message}");
                return false;
            }
        }

        public void Dispose()
        {
            _socket?.Dispose();
            _socket = null;
        }
    }
}
