

/**
 * 从js加载ts类型
 * @param js json字符串
 * @param ts 模版输出数据
 * @param ignore 忽略原型判断
 * @return 数据对象
 */
export function js2ts<T>(js: string | object, ts: T, ignore: boolean = false): T {
    try {
        // 检查是否匹配
        let tmp = typeof js == "string" ? JSON.parse(js) : js
        if (checkJs2Ts(ts, tmp, ignore)) {
            return tmp
        }
    } catch (e) { }

    return null
}

/**
 * 递归转换
 * @param ts 模型输出数据
 * @param js json对象
 * @param ignore 忽略原型判断
 * @return 是否符合
 */
function checkJs2Ts(ts: any, js: any, ignore: boolean): boolean {
    try {
        // 类型不一致
        if (typeof ts !== typeof js) {
            return false
        }

        // 对象类型
        if (typeof ts === "object") {
            // 原型判断
            if (!ignore && ts.__proto__ !== js.__proto__) {
                return false
            }

            // 数组
            if (ts.sort) {
                // 无数据不继续解析
                if (!js.length) {
                    return true
                }
                // 数组只比较第一个
                if (!checkJs2Ts(ts[0], js[0], false)) {
                    return false
                }
            } else {
                // 枚举成员
                for (let i in ts) {
                    // es5
                    if (!ts.hasOwnProperty(i)) {
                        continue
                    }
                    // 递归
                    if (!checkJs2Ts(ts[i], js[i], false)) {
                        return false
                    }
                }
            }

            return true
        }
    } catch (e) { }

    return false
}