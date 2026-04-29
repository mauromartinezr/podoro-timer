package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/menu"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:  "Podoro Timer",
		Width:  380,
		Height: 460,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Menu:             applicationMenu(app),
		Bind: []interface{}{
			app,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}

func applicationMenu(app *App) *menu.Menu {
	appMenu := menu.NewMenu()
	pomodoroMenu := appMenu.AddSubmenu("Podoro Timer")
	pomodoroMenu.AddText("About Podoro Timer", nil, func(_ *menu.CallbackData) {
		wailsruntime.EventsEmit(app.ctx, "show-about")
	})
	pomodoroMenu.AddSeparator()
	pomodoroMenu.AddText("Quit Podoro Timer", nil, func(_ *menu.CallbackData) {
		wailsruntime.Quit(app.ctx)
	})

	appMenu.Append(menu.EditMenu())
	appMenu.Append(menu.WindowMenu())

	return appMenu
}
