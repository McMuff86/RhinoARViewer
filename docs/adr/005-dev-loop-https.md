# ADR-005: Dev-Loop — HTTPS im LAN oder adb reverse

- **Status:** Akzeptiert
- **Datum:** 2026-07-02

## Kontext

WebXR läuft nur in einem **Secure Context**. Der Dev-Server läuft auf dem Windows-PC, getestet wird auf dem Android-Gerät im selben WLAN — `http://<PC-IP>:5180` wäre kein Secure Context. (Port 5180 statt Vite-Default 5173, da 5173 auf der Entwicklungsmaschine anderweitig belegt ist; `strictPort` verhindert stilles Ausweichen.)

## Entscheidung

Zwei unterstützte Wege, beide ohne eigene Zertifikats-Infrastruktur:

1. **WLAN (Standard):** Vite mit `@vitejs/plugin-basic-ssl` (selbstsigniertes Zertifikat). Am Handy `https://<PC-IP>:5180` öffnen und die Zertifikatswarnung einmalig bestätigen („Erweitert → Trotzdem fortfahren").
2. **USB-Kabel:** `adb reverse tcp:5180 tcp:5180`, dann am Handy `https://localhost:5180` — `localhost` ist per Definition ein Secure Context, ganz ohne Zertifikatswarnung. Voraussetzung: USB-Debugging + Android Platform Tools.

## Konsequenzen

- (+) Kein mkcert/CA-Handling; sofort einsatzbereit.
- (−) Die Zertifikatswarnung (Weg 1) muss pro Gerät/Zertifikatswechsel neu bestätigt werden.
- Für den späteren Einsatz übers Internet (ROADMAP) braucht es echtes TLS (z. B. Caddy/Traefik oder einen Tunnel wie cloudflared) — bewusst nicht Teil des PoC.
