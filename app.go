package main

import (
	"fmt"

	"github.com/wailsapp/wails/v3/pkg/application"
)

type App struct {
	app    *application.App
	window *application.WebviewWindow
	tray   *application.SystemTray
}

func NewApp() *App {
	return &App{}
}

func (a *App) SetApplication(app *application.App) {
	a.app = app
}

func (a *App) SetWindow(window *application.WebviewWindow) {
	a.window = window
}

func (a *App) SetTray(tray *application.SystemTray) {
	a.tray = tray
}

func (a *App) UpdateTimerState(isRunning bool, secondsLeft int, mode string) {
	if a == nil || a.tray == nil {
		return
	}

	minutes := secondsLeft / 60
	secs := secondsLeft % 60
	timeStr := fmt.Sprintf("%02d:%02d", minutes, secs)

	var icon string
	if isRunning {
		icon = "▶"
	} else {
		icon = "⏸"
	}

	a.tray.SetLabel(fmt.Sprintf("%s %s", icon, timeStr))
}

func (a *App) ShowWindow() {
	if a == nil || a.window == nil {
		return
	}

	a.window.Show()
	a.window.UnMinimise()
	a.window.Center()
	a.window.Focus()
}

func (a *App) ToggleTimerFromTray() {
	if a == nil || a.window == nil {
		return
	}

	a.window.EmitEvent("tray-toggle-timer")
}

func (a *App) ShowAboutFromTray() {
	if a == nil || a.window == nil {
		return
	}

	a.window.EmitEvent("show-about")
}

func (a *App) Quit() {
	if a == nil || a.app == nil {
		return
	}

	a.app.Quit()
}
