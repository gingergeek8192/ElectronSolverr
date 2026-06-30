import axios from "axios"

const beforeAfter = {
    
    UA: process.platform === 'darwin' 
    ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36'
    : 'Add Windows Here',

    goToURL(params, cookie) {
        return axios.get(params.url, {
            ...(params.isProxy &&{
                proxy: {
                    protocol: params.proxy.protocol,
                    host: params.proxy.hostname,
                    port: params.proxy.port,
                    auth: {
                        username: params.proxy.auth.u,
                        password: params.proxy.auth.p,
                    }
                }
            }),
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'User-Agent': this.UA,
                'Cookie': `${cookie.name}=${cookie.value}`,
                'x-Observer': 'challenge'
            }
        })
    },
}

export default beforeAfter