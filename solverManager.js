import { session, BrowserWindow, screen } from "electron";
// import { BrowserWindow } from './windows.js'
import solverConfig from "./solverConfig.js";
import Observer from '../proxy/observer.js';
import store from './solverPersist.js'


const solverManager = {

    solverWindow: null,

    UA: process.platform === 'darwin'
        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
        : 'ADD WINDOWS HERE',

    WC: null,
    url: null,
    permittedURLS: (url) => ['https://challenges.cloudflare.com', String(url)],

    isSolverWindow: () => !!solverManager?.solverWindow && !solverManager.solverWindow.isDestroyed(),

    closeBaseWindow() {
        if (!this.isSolverWindow()) return
        this.solverWindow.webContents = {},
            this.solverWindow.destroy()
        this.solverWindow = null
    },

    async buildSolverWindow(proxy) {
        if (this.isSolverWindow()) return
        this.solverWindow = new BrowserWindow({
            width: Math.floor(1366 - Math.random() * 100),
            height: Math.floor(768 - Math.random() * 100),
            x: Math.floor(screen.width / 2),
            y: Math.floor(screen.height / 2),
            // NOTE: In testing on macOS, if show: true the solver will be halted/throttled when
            // the window is hidden under other app windows. This does not seem to be the case with 
            // show: false
            show: false,
            skipTaskbar: true,
            paintWhenInitiallyHidden: true,
            webPreferences: {
                contextIsolation: true,
                webgl: true,
                backgroundThrottling: false,
                nodeIntegration: false,
                sandbox: true,
                session: store.getSession()
            }
        })
        this.WC = this.solverWindow.webContents
        this.WC.debugger.attach('1.3')
        this.solverWindow.setIgnoreMouseEvents(true)

        if (!proxy.isProxy) return
        await this.WC.session.setProxy({ proxyRules: proxy.hostname + `:` + proxy.port })
        this.WC.on('login', (event, details, authInfo, callback) => {
            event.preventDefault()
            callback(proxy.auth.u, proxy.auth.p)
        })
    },

    async createSolver(id) {
        let retry = 0
        const solver = {}
        solver.id = id
        solver.config = solverConfig.config(this.WC, id, this.UA)

        solver.config.wc.session.webRequest.onBeforeSendHeaders(
            { urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
                callback({ requestHeaders: { ...details.requestHeaders, 'User-Agent': this.UA } })
                solver.config.HEADERS = details.requestHeaders
                solver.connection = details.responseHeaders ? details.responseHeaders : solver.connection
            })

        solver.config.wc.session.webRequest.onHeadersReceived(
            { urls: ['http://*/*', 'https://*/*'] }, (details, callback) => {
                solver.connection = details.responseHeaders
                callback({ responseHeaders: details.responseHeaders })
                Observer.sampleHeaders(details)
            })

        solver.config.wc.session.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*'] }, (details, cb) => {
            cb(details.resourceType !== 'mainFrame' || this.permittedURLS(this.url).some(u => details.url.startsWith(u)) ? {} : { redirectURL: this.url })
        })

        solver.solve = async (url) => await solver.config.action(solver.config.wc.getTitle(), url)

        solver.loadPage = async (url) => {
            this.url = url
            await solver.config.wc.loadURL(url)
                .catch(() => solver.config.errorState = true)
            if (solver.config.errorState) {
                if (retry > 0) return solver.config.errorOBJECT
                retry++
                await new Promise(r => setTimeout(r, 2000))
                solver.config.errorState = false
                return solver.loadPage(url)
            }
            // In case an existing solve persisted cookie lands a 403 (torrent[CORE] for example)
            // This will stop the solver from hanging. Duration/Interval may need adjusting
            return await Promise.race([
                solver.solve(url),
                new Promise(resolve => setTimeout(() => {
                    clearInterval(solver.config.interval)
                    resolve(solver.config.deniedOBJECT)
                }, 15000))
            ])
        }
        return solver
    }

}
export default solverManager