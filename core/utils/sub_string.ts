
/**
 * 格式化字符串(参数替换字符串中的%v)
 * @param msg 格式化字符串
 * @param args 格式化对象
 * @return 格式化后的字符串
 */
export function strFmt(msg: string, ...args: any[]): string {
    // 过滤无效参数
    if (!msg) {
        return ""
    }

    // 解析输出
    let out: string = ""
    let index: number = 0

    // 解析%v格式化
    let reg = /(%v)/g
    out = msg.replace(reg, (s) => {
        return index <= args.length - 1 ? args[index++] : s
    })

    return out
}

/**
 * 格式化时间(默认 yyyy-MM-dd hh:mm:ss)
 * @param d 时间对象
 * @param fmt 时间格式
 * @return 格式化时间
 */
export function formatDate(d?: Date, fmt?: string): string {
    // 处理时间
    let date = d ? d : new Date()
    let out = fmt ? fmt : "yyyy-MM-dd hh:mm:ss"

    // 格式
    let o = {
        "M+": date.getMonth() + 1, //月份
        "d+": date.getDate(), //日
        "h+": date.getHours(), //小时
        "m+": date.getMinutes(), //分
        "s+": date.getSeconds(), //秒
        "q+": Math.floor((date.getMonth() + 3) / 3), //季度
        "S": date.getMilliseconds() //毫秒
    }

    if (/(y+)/.test(out)) {
        out = out.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length))
    }

    for (var k in o) {
        if (new RegExp("(" + k + ")").test(out)) {
            out = out.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)))
        }
    }

    return out
}

/**
 * 转换对象为字符串
 * @param obj 需要转换的对象
 * @return 对象转换字符串
 */
export function obj2string(obj: any): string {
    // 过滤空
    if (obj === null) {
        return "null"
    }

    // boolean类型
    if (typeof obj === "boolean") {
        return obj ? "true" : "false"
    }

    // string类型直接返回
    if (typeof obj === "string") {
        return obj
    }

    // number类型
    if (typeof obj === "number") {
        return obj.toString()
    }

    // 对象装换字符串
    if (typeof obj === "object") {
        // 转换string
        if ("toString" in obj) {
            return obj.toString()
        }

        let r = []
        if (Array.isArray(obj)) {
            // 数组类型转换字符串
            for (let i = 0; i < obj.length; i++) {
                r.push(obj2string(obj[i]))
            }
            return "[" + r.join() + "]"
        } else {
            // 转换子类型
            for (let i in obj) {
                r.push(i + ":" + obj2string(obj[i]));
            }
            return "{" + r.join() + "}";
        }
    }

    return ""
}

/**
 * 检查字符串是否包含中文
 * @param str 字符串
 * @return 是否包含中文
 */
export function checkCHN(str: string): boolean {
    if (/.*[\u4e00-\u9fa5]+.*$/.test(str)) {
        return true
    }
    return false
}

/**
 * 检查字符串是否包含全角字符或中文
 * @param str 字符串
 * @return 是否包含全角字符或中文
 */
export function checkSymbolAndCHN(str: string): boolean {
    if (/[^\x00-\xff]/ig.test(str)) {
        return true;
    }
    return false;
}

/**
 * 去掉前后空格
 * @param str 字符串
 * @return 字符串
 */
export function trimSpace(str: string): string {
    return str.replace(/^\s*(.*?)[\s\n]*$/g, '$1')
}

/**
 * 获取字符串长度，中文为2
 * @param str 字符串
 * @return 长度
 */
export function strLen(str: string): number {
    let strArr = str.split(""), len = 0
    for (let i = 0, len = strArr.length; i < len; i++) {
        let s = strArr[i]
        if (checkCHN(s)) {
            len += 2
        } else {
            len += 1
        }
    }
    return len
}

/**
 * 替换匹配到的第一个字符串
 * @param str 字符串
 * @param matchStr 配置字符串
 * @param repStr 替换字符串
 * @return 替换后的字符串
 */
export function replaceFirst(str, matchStr: string, repStr: string): string {
    // 过滤无效参数
    if (typeof str !== "string" || str.length <= 0 ||
        typeof matchStr !== "string" || matchStr.length <= 0 ||
        typeof repStr !== "string") {
        return str
    }

    let arr = str.split(matchStr)
    if (arr.length == 1) {
        return str
    } else {
        arr[0] = repStr
        return arr.join("")
    }
}

/**
 * 替换匹配到的最后一个字符串
 * @param str 字符串
 * @param matchStr 配置字符串
 * @param repStr 替换字符串
 * @return 替换后的字符串
 */
 export function replaceFinal(str, matchStr: string, repStr: string): string {
    // 过滤无效参数
    if (typeof str !== "string" || str.length <= 0 ||
        typeof matchStr !== "string" || matchStr.length <= 0 ||
        typeof repStr !== "string") {
        return str
    }

    let arr = str.split(matchStr)
    if (arr.length == 1) {
        return str
    } else {
        arr[arr.length - 1] = repStr
        return arr.join("")
    }
}