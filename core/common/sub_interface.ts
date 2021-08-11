
/** 回收接口 */
export interface IRecover {
    /** 回收 */
    recover(): void
}

/** 销毁接口 */
export interface IDispose {
    /** 销毁 */
    dispose(): void
}

/** 渲染接口 */
export interface IRender {
    /**
     * 渲染
     * @param t 当前时间(时间戳)
     * @param dt 间隔时间ms
     */
    render(t: number, dt: number): void
}

/** 唤醒接口 */
export interface IWakeUp {
    /** 唤醒 */
    wakeup(): void
}