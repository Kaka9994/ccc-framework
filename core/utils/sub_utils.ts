

/**
 * 判断值是否为空
 * @param v 值
 * @return 值是否为空
 */
export function isEmpty(v: any): boolean {
    return v === null || v === undefined || v === ''
}

/**
 * 尝试执行函数
 * @param func 函数
 * @param args 参数
 * @return 返回值
 */
export function tryCallFunc(func: Function, ...args: any[]): any {
    if (func != null && typeof func === "function") {
        return func(...args)
    }
    return null
}

/**
 * 下一帧执行
 * @param func 函数
 * @param args 参数
 */
export function callNextFrame(func: Function, ...args: any[]): void {
    try {
        setTimeout(tryCallFunc(func, ...args), 0)
    } catch { }
}