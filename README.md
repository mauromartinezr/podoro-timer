# Podoro Timer

Podoro Timer is a desktop pomodoro timer built with Wails, Go, and a small vanilla frontend.

Copyright (C) 2026 Mauricio Martinez <@mauromartinezr>

## Features

- Focus, short break, and long break modes
- Work and Study duration profiles
- Automatic short break start after a completed focus session
- Fullscreen gray break screen to encourage stepping away
- Session recording with local history
- Native app menu with About entry

## Window Size

The app currently starts at `380x460`.

## Development

Install frontend dependencies:

```bash
cd frontend
npm install
```

Run the frontend build:

```bash
cd frontend
npm run build
```

Run the desktop app in development:

```bash
wails dev
```

## Production Build

```bash
wails build
```

## Release

First tagged release:

- `v1.0.0`

## License

This project is licensed under the GNU GPLv3. See [LICENSE](/Users/xhlar/coding/my-first-pomodoro-app/LICENSE).
