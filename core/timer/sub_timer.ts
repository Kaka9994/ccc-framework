import * as pkg_common from "../common/pkg_common"
import * as sub_frame from "./sub_frame"

const Timer_Name = "KTimer"

/**
 * 创建一个计时器
 * @param complete 完成回调
 * @param ms 计时时长(毫秒)，填0时会立马执行
 * @param repeat 重复次数
 */
export function createTimer(complete: Function, ms: number, repeat: number): KTimer {
    return pkg_common.store.getObj<KTimer>(Timer_Name, complete, ms, repeat) 
}

/**
 * 回收计时器
 * @param timer 计时器
 */
export function recoverTimer(timer: KTimer): void {
    pkg_common.store.putObj(Timer_Name, timer)
}

/** 计时器类 */
export class KTimer implements pkg_common.IDispose {
    /** 计时结束执行回调 */
    public completeCall: pkg_common.Handler = null
    /** 每帧执行回调 */
    private _ontimeCall: pkg_common.Handler = null
    /** 帧执行实例 */
    private _frame: sub_frame.KFrame = null
    /** 是否正在运行 */
    private _isRunning: boolean = false
    /** 是否结束了 */
    private _isEnd: boolean = false
    /** 重试次数 */
    private _repeatCount: number = 0
    /** 计时时长ms */
    private _time: number = 0
    /** 开始计时时间 */
    private _startTime: number = 0
    /** 当前重试次数 */
    private _curRepeat: number = 0

    /**
     * 构造
     * @param complete 完成回调
     * @param ms 计时时长(毫秒)，填0时会立马执行
     * @param repeat 重复次数
     */
    constructor(complete: Function, ms: number, repeat: number) {
        this.completeCall = pkg_common.createHandler(complete, null, null, false)
        this._ontimeCall = pkg_common.createHandler(this.render, this, null, false)
        this._frame = sub_frame.createFrame(this._ontimeCall)
        this._repeatCount = repeat
        this._time = ms
    }

    /** 
     * 设置此对象的指定属性值
     * @param complete 完成回调
     * @param ms 计时时长(毫秒)，填0时会立马执行
     * @param repeat 重复次数
     * @return 返回 timer 本身
     */
    public setTo(complete: Function, ms: number, repeat: number): void {
        this.completeCall = pkg_common.createHandler(complete, null, null, false)
        this._ontimeCall = pkg_common.createHandler(this.render, this, null, false)
        this._repeatCount = repeat
        this._time = ms
    }

    /** 开始 */
    public start(): void {
        // 过滤无效参数
        if (this._isRunning || this._isEnd || this._frame == null) {
            return
        }

        // 设置标识、更新开始时间
        this._isRunning = true
        this._startTime = Date.now()

        // time == 0 立马执行
        if (this._time == 0) {
            this.oncomplete()
            return
        }

        // 开始帧执行
        this._frame.start()
    }

    /** 停止 */
    public stop(): void {
        // 过滤无效参数
        if (!this._isRunning || this._isEnd || this._frame == null) {
            return
        }

        // 设置标识
        this._isRunning = false

        // 停止帧执行
        this._frame.stop()
    }

    /** 重置 */
    public reset(): void {
        if (this._frame != null) {
            this._frame.stop()
        }
        this._isRunning = false
        this._isEnd = false
        this._startTime = 0
        this._curRepeat = 0
    }

    /** 销毁 */
    public dispose(): void {
        if (this._frame != null) {
            this._frame.dispose()
            this._frame == null
        }
        if (this.completeCall != null) {
            this.completeCall.recover()
            this.completeCall = null
        }
        if (this._ontimeCall != null) {
            this._ontimeCall.recover()
            this._ontimeCall = null
        }
        this._isRunning = false
        this._isEnd = false
        this._repeatCount = 0
        this._time = 0
        this._startTime = 0
        this._curRepeat = 0
    }

    /** 渲染 */
    protected render(): void {
        // 过滤无效参数
        if (!this._isRunning) {
            return
        }

        // 计时完成
        if (Date.now() - this._startTime >= this._time) {
            this.oncomplete()
        }
    }

    /** 每次完成回调 */
    protected oncomplete(): void {
        this._curRepeat++

        // 回调
        if (this.completeCall != null) {
            this.completeCall.run()
        }

        // 结束
        if (this._curRepeat > this._repeatCount) {
            this.onend()
            return
        }

        // 更新开始时间
        this._startTime = Date.now()

        // time == 0 立马执行
        if (this._time == 0) {
            this.oncomplete()
        }
    }

    /** 结束回调 */
    protected onend(): void {
        // 停止帧执行
        if (this._frame != null) {
            this._frame.stop()
        }

        // 设置标识
        this._isRunning = false
        this._isEnd = true
    }
}

/** 计时器对象池 */
@pkg_common.registerPool(Timer_Name, KTimer)
class TimerPool extends pkg_common.ObjectPool {
    protected unuse(obj: KTimer): void {
        obj.stop()
        obj.reset()
    }
    protected reuse(obj: KTimer, ...args: any[]): void {
        let [complete, ms, repeat] = [...args]
        obj.setTo(complete, ms, repeat)
    }
}