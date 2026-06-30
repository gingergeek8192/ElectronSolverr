import axios from 'axios'
import beforeAfter from './beforeAfter.js';
import store from './solverPersist.js'


const beforeSolve = {

    url: null,
    start: null,
    cookie: null,
    html: null,

    time: () => Date.now(),

    title: (html) => html.match(/<title>(.*?)<\/title>/i)?.[1]?.toLowerCase(),
    meta: (html) => html.match(/<meta(.*?)>/i)?.[1]?.toLowerCase(),
    head: (html)=> (!!html.toLowerCase().match(/<head>(.*?)<\/head>/i)?.[1]) && html.toLowerCase().split('<head>')[1].split('</head>')[0],
    all: (html) => html.split(/\s+/).filter(t => t.length > 3),
    random: () => Math.floor(Math.random() * 51) + 10,

    randomSample(html1, html2) {
        const end = this.random()
        const [a, b] = [this.all(html1), this.all(html2)]
            .map(arr => arr.slice(0, end))
        return (a.filter(t => b.includes(t)).length / a.length) >= 0.8
    },

    responseOBJECT() { 
        return {
        status: `ok` ,
        message: `Challenge solved!`,
        solution:  {
            status: 200,
            url: this.url,
            cookies: [{ ...this.cookie, expires: this.cookie.expirationDate }],
            userAgent: beforeAfter.UA,
            response: this.html,
        },
            startTimestamp: this.start,
            endTimestamp: this.time(),
            version: "1.0.0"
        }
    },


    async checkSessionCookies(params) {
        this.start = this.time()
        const obj = store.get(params.key)
        this.cookie = obj?.cookie
        if (!this.cookie) return false
        const exp = this.cookie?.expirationDate || this.cookie?.expires
        if (!exp || (exp * 1000) < this.time()) return false
        const snap = store.getSnap(params.id.split('.').join('-'))
        const response = await beforeAfter.goToURL(params, this.cookie).catch(()=> false)
        if (response?.data && (response?.status === 200) && (response?.request?.res?.responseUrl === params.url)) {
            this.url = params.url
            this.html = response.data
            if (!!this.title(response.data) && !!this.title(snap) && this.title(response.data) === this.title(snap)) return this.responseOBJECT()
            else 
            {
                const head1 = this.head(response.data)
                const head2 = this.head(snap)
                if (head1 && head2) {
                  const meta1 = this.meta(head1)
                  const meta2 = this.meta(head2)
                    if (meta1.length > 0 && meta2.length > 0) {
                        if (meta1.some(m => meta2.includes(m))) return this.responseOBJECT()
                    }
                }
                else
                if (this.randomSample(response.data, snap)) return this.responseOBJECT()
                
            }
        }
        else return false
    }

}

export default beforeSolve