# Podoro Timer

Podoro Timer is a desktop pomodoro timer built with [Wails v3](https://v3.wails.io) (alpha), Go, and a vanilla JS frontend.

Copyright (C) 2026 Mauricio Martinez <@mauromartinezr>

## Features

- Focus, short break, and long break modes
- Work and Study duration profiles
- Automatic short break start after a completed focus session
- Fullscreen gray break screen to encourage stepping away
- Session recording with local history
- Native app menu with About entry
- System tray with live countdown and start/pause control
- Window hides on close and restores from the system tray

## Requirements

- [Go](https://go.dev) 1.21+
- [Node.js](https://nodejs.org) 18+
- [Wails v3 CLI](https://v3.wails.io/getting-started/installation/) (`wails3`)

Install the Wails v3 CLI:

```bash
go install github.com/wailsapp/wails/v3/cmd/wails3@latest
```

## Development

Run the app in development mode with hot-reload on Go file changes:

```bash
wails3 dev
```

The first run installs frontend dependencies and starts a Vite dev server on port 9245. Frontend changes require a manual rebuild:

```bash
npm --prefix frontend run build
```

## Production Build

```bash
wails3 build
```

Outputs a `.app` bundle to `build/bin/Podoro Timer.app`.

## Release

- `v1.0.0` — Initial release
- `v1.1.0` — Tray countdown, show window fix, layout stability

## License

This project is licensed under the GNU GPLv3. See [LICENSE](LICENSE).
