import * as pkg_utils from "../utils/pkg_utils"

// 限制使用
const gLevel = {
    debug: 1,
    info: 2,
    error: 3,
    fatal: 4
}


/** 导出全局对象 */
export { gLogger as logger }

/** 日志对象 */
class Logger {
    /** 日志等级 */
    private _level: number = gLevel.debug
    /** 钩子接口 */
    private _hook: (level: number, log: string) => void = null

    /**
     * 设置日志等级
     * @param level 日志等级(debug|info|error|fatal)
     */
    public setLevel(level: string): void {
        // 过滤无效参数
        let lev = this.getLevel(level)

        // 限制等级
        if (lev != this._level) {
            this._level = lev
        }
    }

    /**
     * 设置日志钩子(处理report)
     * @param cb 回调对象
     */
    public setHook(cb: (level: number, log: string) => void) {
        this._hook = cb
    }

    /**
     * 调试输出
     * @param msg 消息字符串
     * @param arg 任意类型参数
     */
    public debug(msg: string, ...args: any[]): void {
        if (this._level <= gLevel.debug) {
            msg = pkg_utils.strFmt(msg, ...args)
            console.debug(msg)

            // 钩子处理
            if (this._hook) {
                this._hook(gLevel.debug, "debug:" + msg)
            }
        }
    }

    /**
     * 信息输出
     * @param msg 消息字符串
     * @param arg 任意类型参数
     */
    public info(msg: string, ...args: any[]): void {
        if (this._level <= gLevel.debug) {
            msg = pkg_utils.strFmt(msg, ...args)
            console.info(msg)

            // 钩子处理
            if (this._hook) {
                this._hook(gLevel.debug, "info :" + msg)
            }
        }
    }

    /**
     * 错误输出
     * @param msg 消息字符串
     * @param arg 任意类型参数
     */
    public error(msg: string, ...args: any[]): void {
        if (this._level <= gLevel.error) {
            msg = pkg_utils.strFmt(msg, ...args)
            console.error(msg)

            // 钩子处理
            if (this._hook) {
                this._hook(gLevel.error, "error:" + msg)
            }
        }
    }

    /**
     * 灾难输出
     * @param msg 消息字符串
     * @param arg 任意类型参数
     */
    public fatal(msg: string, ...args: any[]): void {
        if (this._level <= gLevel.error) {
            msg = pkg_utils.strFmt(msg, ...args)
            console.error(msg)

            // 钩子处理
            if (this._hook) {
                this._hook(gLevel.fatal, "fatal:" + msg)
            }
        }
    }

    /**
     * 转换日志类型
     * @param level 日志字符串类型
     * @return 日志等级
     */
    private getLevel(level: string): number {
        switch (level) {
            case 'debug': return gLevel.debug
            case 'info': return gLevel.info
            case 'error': return gLevel.error
            case 'fatal': return gLevel.fatal
            default: return gLevel.debug
        }
    }
}

// 初始化
let gLogger = new Logger()