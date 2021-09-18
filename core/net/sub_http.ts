import * as pkg_base from "../base/pkg_base"

export { ghttp as http }

/** 超时ms */
const HttpTimeout = 10000

/** http连接对象 */
class HttpImpl {
    /** api地址 */
    private _url: string = ''
    /** 队列ID */
    private _queueRound: number = 0
    /** 超时检测队列 */
    private _checkQueue: { [id: number]: QueueItem } = {}
    /** 检测计时器 */
    private _checkTime: number = 0

    /**
     * 请求消息
     * @param method 方法名
     * @param data 数据对象
     * @param cb 请求回调(data:应答数据对象,err:错误描述)
     * @return 是否请求成功,true=成功
     */
    public request(method: string, data: object, cb: (data: object, err: string) => void): boolean {
        // 校验参数
        if (!cb) {
            pkg_base.logger.error("request:参数无效")
            return false
        }

        this._initWithTest(() => {
            // 没有有效的连接地址
            if (!this._url) {
                pkg_base.logger.error("request:连接地址无效")
                return
            }

            // 获取xmlHttp并设置超时
            let http = new XMLHttpRequest()
            //http.timeout = this.timeout

            // URL附加参数
            let uri = '?timestamp=' + Date.now()
            // 循环数据
            // N:data can be null
            for (var k in data) {
                // 过滤非属性
                if (!data.hasOwnProperty(k)) {
                    continue
                }
                // 构造参数
                uri += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
            }

            // 构造请求地址
            let url = this._url + method + uri

            pkg_base.logger.info("request:url:%v", url)

            // 请求连接
            http.open("GET", url, true)

            // 记录超时
            let qi = this._pushCheckQueue(http, (data: object, err: string) => {
                // 解析格式
                if (err || typeof data["Error"] != "string" ||
                    typeof data["Result"] != "object") {
                    pkg_base.logger.error("request:服务器应答格式错误(data:%v)", data)
                    cb(null, "respone data error")
                    return
                }

                // 应答解包数据
                cb(data["Result"], data["Error"])
            })

            // 完成通知
            http.onreadystatechange = () => {
                // 处理完成状态
                // 4 == http.DONE
                if (http.readyState != 4) {
                    return
                }
                // 接收成功
                if (http.status == 200 || http.status == 1223) {
                    try {
                        // 应答成功
                        qi.call(JSON.parse(http.responseText), null)
                        // 移除超时对象
                        this._popCheckQueue(qi.id)
                        return
                    } catch (err) {
                        pkg_base.logger.error("request:解析json出错(data:%v)|%v", http.responseText, err)
                    }
                }

                // status = 0 可能是超时,奇葩
                pkg_base.logger.error("request:http应答状态(status:%v)", http.status)

                // 应答失败
                qi.call(null, "respine status error")
                // 移除超时对象
                this._popCheckQueue(qi.id)
            }

            // 错误通知
            http.onerror = () => {
                // 应答失败
                qi.call(null, "http error")
                // 移除超时对象
                this._popCheckQueue(qi.id)
            }

            // 发送数据
            http.send()
        })

        return true
    }

    /**
     * 请求消息
     * @param url 请求地址(自行uriencode)
     * @param cb 请求回调(data:应答数据对象,err:错误描述)
     * @return 是否请求成功,true=成功
     */
    public get(url: string, cb: (data: object, err: string) => void): boolean {
        // 校验参数
        if (!url || url.length == 0 || !cb) {
            pkg_base.logger.error("get:参数无效")
            return false
        }

        // 获取xmlHttp并设置超时
        let http = new XMLHttpRequest()
        //http.timeout = this.timeout

        pkg_base.logger.info("get:url:%v", url)

        // 请求连接
        http.open("POST", url, true)

        // 请求格式(url-encoded)
        //http.setRequestHeader("X-Requested-With", "XMLHttpRequest")
        http.setRequestHeader("Content-Type", "application/x-www-form-urlencoded")

        // 记录超时
        let qi = this._pushCheckQueue(http, cb)

        // 完成通知
        http.onreadystatechange = () => {
            // 处理完成状态
            // 4 == http.DONE
            if (http.readyState != 4) {
                return
            }
            // 接收成功
            if (http.status == 200 || http.status == 1223) {
                try {
                    // 应答成功
                    qi.call(JSON.parse(http.responseText), null)
                    // 移除超时对象
                    this._popCheckQueue(qi.id)
                    return
                } catch (err) {
                    pkg_base.logger.error("get:解析json出错(data:%v)|%v", http.responseText, err)
                }
            }

            // status = 0 可能是超时,奇葩
            pkg_base.logger.error("get:http应答状态(status:%v)", http.status)

            // 应答失败
            qi.call(null, "respine status error")
            // 移除超时对象
            this._popCheckQueue(qi.id)
        }

        // 错误通知
        http.onerror = () => {
            // 应答失败
            qi.call(null, "http error")
            // 移除超时对象
            this._popCheckQueue(qi.id)
        }

        // 发送数据
        http.send()

        return true
    }

    /**
     * 请求上传文件(图片、语音)
     * @param url 请求地址
     * @param data 数据对象
     * @param cb 请求回调(data:应答数据对象,err:错误描述)
     * @return 是否请求成功,true=成功
     */
    public post(url: string, data: object, cb: (data: object, err: string) => void): boolean {
        // 校验参数
        if (!url || url.length == 0 || !data || !cb) {
            pkg_base.logger.error("post:参数无效")
            return false
        }

        // json数据处理(body数据,不做uriencode)
        let jstr = ""
        try {
            jstr = JSON.stringify(data)
        } catch (e) {
            pkg_base.logger.error("post:构造json数据失败")
            return false
        }

        // 获取xmlHttp并设置超时
        let http = new XMLHttpRequest()
        //http.timeout = this.timeout

        pkg_base.logger.info("post:url:%v", url)

        // 请求连接
        http.open("POST", url, true)

        // 跨域设置
        //http.setRequestHeader("X-Requested-With", "XMLHttpRequest")
        http.setRequestHeader("Content-Type", "application/json;charset=UTF-8")

        // 记录超时
        let qi = this._pushCheckQueue(http, cb)

        // 完成通知
        http.onreadystatechange = () => {
            // 处理完成状态
            // 4 == http.DONE
            if (http.readyState != 4) {
                return
            }
            // 接收成功
            if (http.status == 200 || http.status == 1223) {
                try {
                    // 应答成功
                    qi.call(JSON.parse(http.responseText), null)
                    // 移除超时对象
                    this._popCheckQueue(qi.id)
                    return
                } catch (err) {
                    pkg_base.logger.error("post:解析json出错(data:%v)|%v", http.responseText, err)
                }
            }

            // status = 0 可能是超时,奇葩
            pkg_base.logger.error("post:http应答状态(status:%v)", http.status)

            // 应答失败
            qi.call(null, "respine status error")
            // 移除超时对象
            this._popCheckQueue(qi.id)
        }

        // 错误通知
        http.onerror = () => {
            // 应答失败
            qi.call(null, "http error")
            // 移除超时对象
            this._popCheckQueue(qi.id)
        }

        // 发送json数据
        http.send(jstr)

        return true
    }

    /**
     * 检测地址是否可用
     * @param urls url地址集合
     * @param timeout 超时时间
     * @param api 是否启用api请求
     * @param cb 完成通知(success:有效的请求地址)
     */
    public test(urls: string[], timeout: number, api: boolean, cb: (success: string[]) => void) {
        // 无效参数
        if (!urls || timeout < 0 || !cb) {
            pkg_base.logger.error("test:参数无效")
            return
        }

        // 应答数据
        let rets: { [url: string]: boolean } = {}

        // 统计连接成功的
        let takeSuccess = () => {
            let sus: string[] = []
            for (let k in rets) {
                if (rets[k]) {
                    sus.push(k)
                }
            }
            return sus
        }

        // 记录超时
        let tm = setTimeout(() => {
            cb(takeSuccess())
        }, timeout)

        // 请求检测全部的URL
        for (let i = 0; i < urls.length; i++) {
            let u = urls[i]
            // 并发请求
            this._doTest(u, api, (success: boolean) => {
                // 如果成功,则可用
                if (!rets[u]) {
                    rets[u] = success
                }
                // 判断是否全部完成
                if (Object.keys(rets).length < urls.length) {
                    return
                }
                // 已经超时,那么不再等待其他应答
                if (tm) {
                    clearTimeout(tm)
                    tm = null
                    cb(takeSuccess())
                }
            })
        }
    }

    /**
     * 检测连接
     * @param url 请求地址
     * @param api 是否启用api请求
     * @param cb 完成通知(success:请求是否有效)
     */
    private _doTest(url: string, api: boolean, cb: (success: boolean) => void) {
        let http = new XMLHttpRequest()
        http.open("GET", url + (api ? "test" : "/test.txt"), true)
        http.onreadystatechange = () => {
            if (http.readyState != 4) {
                return
            }
            if (http.status == 200 || http.status == 1223) {
                cb(true)
                return
            }
            cb(false)
        }
        http.onerror = () => {
            cb(false)
        }
        http.send()
    }

    /**
     * 初始化选择URL地址
     * @param cb 完成通知
     */
    private _initWithTest(cb: () => void) {
        // 已经选择好连接
        if (this._url) {
            cb()
            return
        }

        // TODO:测试连接
        let hostURLs = []
        this.test(hostURLs, 3000, true, (success: string[]) => {
            // 地址全部无效
            if (!success) {
                pkg_base.logger.error("_initWithTest:更新地址无效")
                return
            }
            pkg_base.logger.debug("_initWithTest:本地测试地址(url:%v)", success[0])
            // 保留可用地址
            this._url = success[0]
            cb()
        })
    }

    /**
     * 存入检测队列
     * @param xhr 请求对象
     * @param cb 回调方法
     * @return 队列对象
     */
    private _pushCheckQueue(xhr: XMLHttpRequest, cb: (data: object, err: string) => void): QueueItem {
        // 构造ID
        let id = ++this._queueRound
        let qi = new QueueItem(id, xhr, cb)
        // 记录超时对象
        this._checkQueue[id] = qi
        // 启动计时器
        if (!this._checkTime) {
            // 每秒检测是否请求超时
            this._checkTime = <any>setInterval(() => {
                this._doCheckTimeout()
            }, 1000)
        }
        // 返回超时对象
        return qi
    }

    /**
     * 从检测队列中移除
     * @param id 计时ID
     */
    private _popCheckQueue(id: number) {
        if (this._checkQueue[id]) {
            // 移除对象
            delete this._checkQueue[id]
        }
        // 清理计时器
        if (!Object.keys(this._checkQueue).length && this._checkTime) {
            clearInterval(this._checkTime)
            this._checkTime = 0
        }
    }

    /** 检测超时 */
    private _doCheckTimeout() {
        let now = Date.now()
        for (let k in this._checkQueue) {
            if (this._checkQueue[k].tick < now) {
                // 退出请求
                this._checkQueue[k].xhr.abort()
                // 移除对象
                delete this._checkQueue[k]
            }
        }
    }
}

/** 检测队列对象 */
class QueueItem {
    /** 超时序号 */
    public id: number = 0
    /** 请求对象 */
    public xhr: XMLHttpRequest = null
    /** 超时时间 */
    public tick: number = 0
    /** 回调 */
    public call: (data: object, err: string) => void

    /**
     * 构造
     * @param id 超时序号
     * @param x 请求对象
     * @param cb 应答
     */
    constructor(id: number, x: XMLHttpRequest, cb: (data: object, err: string) => void) {
        this.id = id
        this.xhr = x
        this.tick = Date.now() + HttpTimeout
        this.call = cb
    }
}

// 初始化
let ghttp = new HttpImpl()