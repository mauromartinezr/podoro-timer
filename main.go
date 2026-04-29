package main

import (
	"embed"
	"runtime"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

//go:embed all:frontend/dist
var assets embed.FS

//go:embed trayicons/menubarTemplate.png
var trayIcon []byte

func main() {
	controller := NewApp()

	app := application.New(application.Options{
		Name:        "Podoro Timer",
		Description: "A simple focus timer for recording pomodoro sessions.",
		Assets: application.AssetOptions{
			Handler: application.BundledAssetFileServer(assets),
		},
		Mac: application.MacOptions{
			ApplicationShouldTerminateAfterLastWindowClosed: false,
		},
	})
	controller.SetApplication(app)

	mainWindow := app.Window.NewWithOptions(application.WebviewWindowOptions{
		Name:               "main",
		Title:              "Podoro Timer",
		Width:              380,
		Height:             480,
		MinWidth:           380,
		MinHeight:          480,
		UseApplicationMenu: true,
		BackgroundColour:   application.NewRGBA(27, 38, 54, 255),
	})
	controller.SetWindow(mainWindow)

	// Interceptar el cierre de la ventana: ocultar en vez de destruir
	mainWindow.RegisterHook(events.Common.WindowClosing, func(e *application.WindowEvent) {
		e.Cancel()
		mainWindow.Hide()
	})

	app.Menu.Set(applicationMenu(app, controller))
	setupSystemTray(app, controller)

	if err := app.Run(); err != nil {
		println("Error:", err.Error())
	}
}

func applicationMenu(app *application.App, controller *App) *application.Menu {
	menu := app.NewMenu()
	podoroMenu := menu.AddSubmenu("Podoro Timer")
	podoroMenu.Add("About Podoro Timer").OnClick(func(_ *application.Context) {
		controller.ShowAboutFromTray()
	})
	podoroMenu.AddSeparator()
	podoroMenu.Add("Quit Podoro Timer").OnClick(func(_ *application.Context) {
		controller.Quit()
	})
	menu.AddRole(application.EditMenu)
	menu.AddRole(application.WindowMenu)
	return menu
}

func setupSystemTray(app *application.App, controller *App) {
	tray := app.SystemTray.New()
	tray.SetTooltip("Podoro Timer")

	if runtime.GOOS == "darwin" {
		tray.SetTemplateIcon(trayIcon)
	} else {
		tray.SetIcon(trayIcon)
	}

	controller.SetTray(tray)

	menu := app.NewMenu()
	menu.Add("Show").OnClick(func(_ *application.Context) {
		controller.ShowWindow()
	})
	menu.Add("Start / Pause Timer").OnClick(func(_ *application.Context) {
		controller.ToggleTimerFromTray()
	})
	menu.Add("About Podoro Timer").OnClick(func(_ *application.Context) {
		controller.ShowAboutFromTray()
	})
	menu.AddSeparator()
	menu.Add("Quit Podoro Timer").OnClick(func(_ *application.Context) {
		controller.Quit()
	})

	tray.SetMenu(menu)
	tray.OnClick(func() {
		tray.OpenMenu()
	})

	app.Event.On("timer-state-update", func(e *application.CustomEvent) {
		data, ok := e.Data.(map[string]interface{})
		if !ok {
			return
		}
		isRunning, _ := data["isRunning"].(bool)
		secondsLeftFloat, _ := data["secondsLeft"].(float64)
		mode, _ := data["mode"].(string)
		controller.UpdateTimerState(isRunning, int(secondsLeftFloat), mode)
	})
}
