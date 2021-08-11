

/**
 * 获取路径参数
 * @param url 路径
 * @return 参数
 */
 export function getUrlParams(url: string): { [key: string]: string } {
    if (url == null || url.length <= 0) {
        return null
    }

    let params: { [key: string]: string } = {}
    let reg = /([^&?]*)=([^&]*)/g
    let res = url.match(reg)
    for (let key in res) {
        let query = res[key].split('=')
        params[query[0]] = query[1]
    }
    return params
}

/**
 * 获取路径参数
 * @param url 路径
 * @param key 参数名
 * @return 参数
 */
export function getUrlParamByKey(url: string, key: string): string {
    if (url == null || url.length <= 0) {
        return ""
    }

    let reg = /([^&?]*)=([^&]*)/g
    let res = url.match(reg)
    for (let k in res) {
        let query = res[k].split('=')
        if (query[0] == key) {
            return query[1]
        }
    }
    return ""
}

/**
 * 获取文件扩展名
 * @param path 路径
 * @return 扩展名
 */
export function getFileExt(path: string): string {
    let reg = /(\.[^\.\/\?\\]*)(\?.*)?$/
    var temp = reg.exec(path);
    return temp != null ? temp[1].slice(1) : '';
}