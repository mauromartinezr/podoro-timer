# Changelog

All notable changes to this project will be documented in this file.

## [v1.1.0] - 2026-04-29

### Added

- System tray now shows live timer state and countdown (▶ 24:35 / ⏸ 24:35)
- "Complete focus" button appears when timer is paused mid-session
- `wails3 dev` support via `build/config.yml` with hot-reload on Go file changes

### Fixed

- "Show" tray option now correctly brings the window to the foreground on macOS
- Closing the window with the red button now hides it instead of destroying it, so "Show" always works
- App no longer scrolls or changes size when the "Complete focus" button appears

### Changed

- Window startup size updated to `380x480`
- Mode label ("Focus session") is hidden while a status message is active to reduce visual noise
- Layout uses `height: 100vh; overflow: hidden` to enforce fixed window dimensions

---

## [v1.0.0] - 2026-04-29

### Added

- First release of Podoro Timer
- Focus, short break, and long break timer modes
- Work and Study duration profiles
- Sidebar for profile settings and recorded session history
- Native About menu entry in the desktop app menu
- Session recording stored locally
- Automatic short break start after focus completion
- Notification when focus completes
- Gray fullscreen break treatment with centered timer

### Changed

- App branding renamed to `Podoro Timer`
- Startup window size set to `380x460`
- Homepage simplified with icon-based menu access
