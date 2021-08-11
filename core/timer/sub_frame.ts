import * as pkg_common from "../common/pkg_common"

const Frame_Name = "KFrame"

/**
 * 创建一个帧执行对象
 * @param onframe 每帧执行回调
 * @return 帧执行对象
 */
export function createFrame(onframe: pkg_common.Handler): KFrame {
    return pkg_common.store.getObj<KFrame>(Frame_Name, onframe) 
}

/** 
 * 回收帧执行对象
 * @param frame 帧执行对象
 */
export function recoverFrame(frame: KFrame): void {
    pkg_common.store.putObj(Frame_Name, frame)
}

/** 帧执行对象类(帧数与浏览器的刷新频率相关，跟ccc的帧数无关) */
export class KFrame implements pkg_common.IDispose  {
    /** 每帧回调 */
    public onFrame: pkg_common.Handler = null;
    /** 是否正在运行 */
    private _isRunning: boolean = false
    /** 是否开始渲染 */
    private _isRender: boolean = false
    /** 当前帧编号 */
    private _frameID: number = 0

    /** 构造 */
    constructor() {
        // 更新浏览器下一帧执行函数
        let vendors = ['ms', 'moz', 'webkit', 'o']
        for (let i = 0, len = vendors.length; i < len && !window.requestAnimationFrame; ++i) {
            var vp = vendors[i]
            window.requestAnimationFrame = window[vp + 'RequestAnimationFrame']
            window.cancelAnimationFrame = (window[vp + 'CancelAnimationFrame'] || window[vp + 'CancelRequestAnimationFrame'])
        }

        // 非浏览器则用setTimeout代替
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = <any>function (callback) {
                return setTimeout(() => callback(17), 17)
            }
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = clearTimeout
        }
    }

    /** 开始 */
    public start(): void {
        // 过滤无效参数
        if (this._isRunning && this.onFrame != null) {
            return
        }

        // 设置标识
        this._isRunning = true
        this._isRender = false

        // 执行渲染
        this.render()
    }

    /** 停止 */
    public stop(): void {
        // 过滤无效参数
        if (!this._isRunning) {
            return
        }

        // 设置标识
        this._isRunning = false
        this._isRender = false

        // 取消帧执行
        if (this._frameID != 0) {
            window.cancelAnimationFrame(this._frameID)
        }
    }

    /** 销毁 */
    public dispose(): void {
        if (this._frameID != 0) {
            window.cancelAnimationFrame(this._frameID)
        }
        this._isRunning = false
        this._isRender = false
        this._frameID = 0
        this.onFrame.recover()
        this.onFrame = null
    }

    /** 渲染 */
    protected render(): void {
        // 过滤无效参数
        if (!this._isRunning && this.onFrame == null) {
            return
        }

        // 调用回调
        if (this._isRender) {
            this.onFrame.run()
        }

        // 设置标识
        this._isRender = true

        // 注册下一帧、更新帧编号
        this._frameID = window.requestAnimationFrame(() => this.render())
    }
}


/** 帧执行对象池 */
@pkg_common.registerPool(Frame_Name, KFrame)
class FramePool extends pkg_common.ObjectPool {
    protected unuse(obj: KFrame): void {
        obj.stop()
    }
    protected reuse(obj: KFrame, ...args: any[]): void {
        obj.onFrame = args[0]
    }
}