import { app, session } from "electron";
import qp from 'quoted-printable'

const solverConfig = {

    async sessionCookies() {
        return await session.fromPartition(`persist:solver`).cookies.get({ name: `cf_clearance` })
    },

    async freshCookie(id) {
        const arr = await this.sessionCookies()
        return arr.filter(c => id.endsWith(c.domain.replace(/^\./, '')))[0]
    },

    config(wc, id, ua) {
        return {
            wc: wc,
            UA: ua,
            HTML: null,
            COOKIE: null,
            URL: null,
            START: Date.now(),
            HEADERS: null,
            PARTITION: `persist:solver`,
            DOMAIN: id,
            MESSAGE: null,
            interval: null,
            solved: false,
            solving: false,
            loaded: false,
            actions: false,
            bottom: '------MultipartBoundary--',
            errorState: false,
            resolving: false,
            time: null,
            resolve: null,
            denied: null,

            get isAction() {
                return this.actions
            },

            get deniedOBJECT() {
                return {
                    status: 'error',
                    message: this.MESSAGE,
                    solution: null,
                    startTimestamp: this.START,
                    endTimestamp: Date.now(),
                    version: "1.0.0"
                }
            },

            get errorOBJECT() {
                return {
                    status: "error",
                    message: "Error: Error reaching the configured indexer URL",
                    solution: null,
                    startTimestamp: this.START,
                    endTimestamp: Date.now(),
                    version: "1.0.0"
                }
            },

            get responseOBJECT() {
                return {
                    status: this.solved ? `ok` : `error`,
                    message: this.MESSAGE,
                    solution: this.solved ? {
                        status: 200,
                        url: this.URL,
                        cookies: [{ ...this.COOKIE, expires: this.COOKIE.expirationDate }],
                        userAgent: this.UA
                    } : null,
                    startTimestamp: this.START,
                    endTimestamp: Date.now(),
                    version: "1.0.0"
                }
            },

            cloudflare: (mhtml) => mhtml.includes('Content-Location: https://challenges.cloudflare.com/'),
            challenge: (mhtml) => mhtml.includes(`checkbox`),
            noKeyWord: (mhtml) => !mhtml.includes('challenges.cloudflare.com'),
            top: (url) => `Content-Location: ${url}`,
            isTarget(url) { return this.wc.getURL() === url },
            PageError(url, mhtml) { return this.isTarget(url) && (mhtml.includes('cf-error-details') || !mhtml.includes('<title>')) },

            async getSnap() {
                return await this.wc.debugger.sendCommand('Page.captureSnapshot').catch(() => { return })
            },

            async sendHID(hid, direction, x_key, y_code, side_virtKC, clicks = 1, wait = 0) {
                const isKey = hid === `Key`
                await this.wc.debugger.sendCommand(
                    `Input.dispatch${hid}Event`, {
                    type: direction === `Down` ? (isKey ? 'keyDown' : 'mousePressed') : (isKey ? 'keyUp' : 'mouseReleased'),
                    ...(!isKey && {
                        x: x_key,
                        y: y_code,
                        button: side_virtKC,
                        clickCount: clicks
                    }),
                    ...(isKey && {
                        key: x_key,
                        code: y_code,
                        windowsVirtualKeyCode: side_virtKC
                    })
                }
                )
                return await new Promise(resolve => setTimeout(resolve, wait > 0 ? (wait + (Math.random() * 60 - 30)) : 10))
            },

            async solverAction() {
                if (this.solving || this.solved) return
                this.solving = true
                this.actions = true
                // each duration is the time that should elapse before the next event.
                // Which is why up is longer than down
                for (const act of [
                    { cmd: ['Mouse', 'Down', 419, 439, 'left', 1, 307] },
                    { cmd: ['Mouse', 'Up', 419, 439, 'left', 1, 800] },
                    { cmd: ['Key', 'Down', 'Tab', 'Tab', 9, 280] },
                    { cmd: ['Key', 'Up', 'Tab', 'Tab', 9, 991] },
                    { cmd: ['Key', 'Down', ' ', 'Space', 32, 291] },
                    { cmd: ['Key', 'Up', ' ', 'Space', 32, 1000] }
                ]) await this.sendHID(...act.cmd)
            },

            async finish() {
                this.COOKIE = await solverConfig.freshCookie(this.DOMAIN)
                if (this.COOKIE) {
                    this.solved = true
                    this.MESSAGE = `Challenge solved!`
                }
                return this.solved
            },

            async action(title, url) {
                this.URL = url
                return await ({
                    [`just a moment...`]: async () => {
                        return await new Promise(resolve => {
                            this.resolve = resolve 
                            this.interval = setInterval(
                                async () => {
                                    let res = await this.getSnap()
                                    if (!res?.data) { return }
                                    if (this.cloudflare(res?.data) && this.challenge(res?.data) && !this.isAction) {
                                        if (this.solving) { return }
                                        await this.solverAction()
                                    }
                                    if (!!this.top(url) && this.noKeyWord(res.data)) {
                                        this.solved = true
                                        this.wc.debugger.removeAllListeners('message')
                                        this.wc.debugger.on('message', (_, method, params) => {
                                            if (method === 'Page.lifecycleEvent' && params.name === 'networkIdle') this.loaded = true
                                        })
                                        await this.wc.debugger.sendCommand('Page.setLifecycleEventsEnabled', { enabled: true })
                                    }
                                    if (this.solved && !!this.top(url) && this.noKeyWord(res.data) && this.loaded) {
                                        this.URL = this.wc.getURL()
                                        const res = await this.getSnap()
                                        if (!res?.data) { return }
                                        if (this.cloudflare(res.data) || !this.noKeyWord(res.data)) { return }
                                        clearInterval(this.interval)
                                        this.COOKIE = await solverConfig.freshCookie(this.DOMAIN)
                                        this.MESSAGE = `Challenge solved!`
                                        if (this.PageError(url, res.data)) resolve(this.errorOBJECT)
                                        resolve(this.responseOBJECT)
                                    }
                                    if (this.denied) {
                                        clearInterval(this.interval)
                                        await this.action(`403 Forbidden`, url)
                                    }
                                }, 200)
                        })
                    },
                    [`403 Forbidden`]: () => {
                        this.MESSAGE = `Access Denied!`
                        return this.deniedOBJECT
                    },
                    [`access denied | ${url.toLowerCase()} used cloudflare to restrict access | ${url.toLowerCase()} | cloudflare`]: () => {
                        this.MESSAGE = `Access Denied!`
                        if (this.resolve) this.resolve(this.deniedOBJECT)
                        else return this.deniedOBJECT
                    },
                    [`challenge not detected`]: () => new Promise(resolve => {
                        const res = async () => {
                            if (!this.resolving) {
                                this.resolving = true;
                                if (await this.finish()) {
                                    clearTimeout(this.time)
                                    resolve(this.responseOBJECT)
                                }
                                else {
                                    clearTimeout(this.time)
                                    this.time = setInterval(async () => {
                                        const res = await this.getSnap()
                                        if (!res?.data) { return }
                                        clearInterval(this.time)
                                        if (this.PageError(url, res.data)) resolve(this.errorOBJECT)
                                        resolve(this.responseOBJECT)
                                    }, 1000)
                                }
                            }
                        }
                        this.wc.once('did-navigate', async () => res())
                        this.wc.once('did-finish-load', async () => res())
                        this.time = setTimeout(async () => res(), 4000)
                    }),
                }[title.toLowerCase()] ?? (() => this.action(`challenge not detected`, url)))()
            }
        }
    }

}
export default solverConfig