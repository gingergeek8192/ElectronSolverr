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

## Notes

- The host app must use `"type": "module"` in its `package.json` as all files use ES module syntax
- The solver window runs in a sandboxed `BrowserWindow` with a persistent session `persist:solver`
