# electronSolverr

![gingergeek8192](./gingergeek8192.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)  
Copyright (c) 2026 gingergeek8192

A Cloudflare challenge solver module for Electron apps. Spins up a local Express server on port `8191` that accepts FlareSolverr-compatible requests and solves Cloudflare challenges using an Electron `BrowserWindow`.

## Usage

Import and start the server from your Electron main process:

```js
import solverServer from './electronSolverr/solveServer.js'

app.whenReady().then(() => {
    solverServer.solverrListen()
})
```

## Host App Dependencies

The following packages must be installed in the host Electron app:

```bash
npm install axios express quoted-printable
```

| Package | Used In |
|---|---|
| `axios` | `beforeSolve.js`, `beforeAfter.js` — makes HTTP requests to verify cached cookies |
| `express` | `solveServer.js` — runs the local solver API server on port `8191` |
| `quoted-printable` | `solverConfig.js` — used for MHTML snapshot parsing |

## API

Send a POST request to `http://localhost:8191/v1`:

```json
{
    "cmd": "request.get",
    "url": "https://target-site.com",
    "proxy": {
        "url": "http://username:password@host:port"
    }
}
```

`proxy` is optional.

## Storage

`solverPersist.js` persists cookies and HTML snapshots to disk using Electron's `app.getPath('userData')`, which resolves to the host app's data folder:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/<YourApp>/` |
| Windows | `%APPDATA%\<YourApp>\` |

Two files are written:

| File | Contents |
|---|---|
| `solver` | Cached solver results (cookies, URLs) |
| `<domain>` | HTML snapshot of the solved page, used to validate cached cookies on subsequent requests |

The store is flushed to disk automatically on `before-quit`.

## Window Management — `windows.js` (optional)

`windows.js` provides an extended `BrowserWindow` class that lets you tag windows by name for easy lookup and management across your app.

```js
import { BrowserWindow } from './windows.js'

// create a tagged window exactly like you would normally
const win = new BrowserWindow('_main', { width: 1200, height: 800 })

// look it up anywhere by tag
BrowserWindow.fromTag('_main')

// check it exists
BrowserWindow.isWindow('_main')

// get all tagged windows
BrowserWindow.getAllTaggedWindows()

// close all tagged windows
BrowserWindow.closeAll()
```

Tags are automatically removed when a window is closed.

### Using with electronSolverr

`solverManager.js` uses Electron's `BrowserWindow` by default. To integrate with `windows.js`, swap the import and pass a tag when calling `buildSolverWindow`:

```js
// import { session, BrowserWindow, screen } from "electron";  <-- replace this
import { BrowserWindow } from './windows.js'
```

Then in `buildSolverWindow`, pass `'_solver'` as the tag:

```js
this.solverWindow = new BrowserWindow('_solver', { ...opts })
```

You can then use the full `windows.js` API to manage the solver window from anywhere in your app:

```js
// get the solver window instance
BrowserWindow.fromTag('_solver')

// check if the solver window exists
BrowserWindow.isWindow('_solver')

// get all tagged window instances
BrowserWindow.getAllTaggedWindows()

// get all registered tags
BrowserWindow.getAllWindowTags()
```

## Notes

- The host app must use `"type": "module"` in its `package.json` as all files use ES module syntax
- The solver window runs in a sandboxed `BrowserWindow` with a persistent session `persist:solver`
