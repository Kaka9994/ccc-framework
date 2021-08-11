
/** 单位弧度对应的角度 */
const gPI = 180 / Math.PI

/**
 * 按比例缩放图片
 * @param w 宽
 * @param h 高
 * @param limit limit:限制宽高度(图片压缩使用大值,显示边界使用小值)
 * @return rw:缩放后的宽,rh:缩放后的高
 */
export function imageRate(w: number, h: number, limit: number): { rw: number, rh: number } {
    // 限制除数
    if (!limit) {
        return { rw: 0, rh: 0 }
    }

    // 取宽高中小值的缩放比例
    let rate = w > h ? (w / limit) : (h / limit)
    let rw = w > h ? limit : Math.floor(w / rate)
    let rh = w > h ? Math.floor(h / rate) : limit

    return { rw: rw, rh: rh }
}

/**
 * 角度转弧度
 * @param angle 角度
 * @return 弧度
 */
export function angle2radian(angle: number): number {
    return angle / gPI
}

/**
 * 弧度转角度
 * @param radian 弧度
 * @return 角度
 */
export function radian2angle(radian: number): number {
    return radian * gPI
}

/**
 * 限制角度0-360范围
 * @param angle 角度
 * @return 限制在0-360的角度
 */
export function angleLimit360(angle: number): number {
    angle = angle % 360
    if (angle < 0) {
        angle += 360
    }
    return angle
}

/**
 * uint颜色值转换为16进制字符串颜色值
 * @param color uint颜色值
 * @return 6进制字符串颜色值
 */
export function toHexColor(color: number): string {
    if (color < 0 || isNaN(color)) {
        return null
    }

    let str: string = color.toString(16)

    while (str.length < 6) {
        str = "0" + str
    }

    return "#" + str
}

/**
 * 版本比对
 * @param vA 版本A (e.g. 0.0.8)
 * @param vB 版本B (e.g. 2.0.4)
 * @return >0:A大于B , =0:A等于B , <0:A小于B
 */
export function compareVer(vA: string, vB: string): number {
    let arrA = vA.split('.')
    let arrB = vB.split('.')
    for (let i = 0; i < arrA.length; ++i) {
        let a = parseInt(arrA[i])
        let b = parseInt(arrB[i]) || 0
        if (a === b) {
            continue
        } else {
            return a - b
        }
    }
    if (arrB.length > arrA.length) {
        return -1
    } else {
        return 0
    }
}

/**
 * 获取两数之间的随机数
 * @param min 最小值，随机数不小于最小值(>=)
 * @param max 最大值，随机数小于最大值(<)
 * @return 随机数
 */
export function random(min: number, max: number): number {
    return Math.random() * (max - min) + min
}

/**
 * 获取两数之间的随机整数
 * @param min 最小值，随机数不小于最小值(>=)
 * @param max 最大值，随机数小于最大值(<)
 * @return 随机整数
 */
export function randomInt(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min)) + min
}

/**
 * 获取两数之间的随机整数(包括两个数在内)
 * @param min 最小值
 * @param max 最大值
 * @return 随机整数
 */
export function randomInt2(min: number, max: number): number {
    min = Math.ceil(min)
    max = Math.floor(max)
    return Math.floor(Math.random() * (max - min + 1)) + min
}

/**
 * 获取圆内任意一点(不在圆上)
 * @param x 圆心x
 * @param y 圆心y
 * @param r 半径
 * @return 任意点
 */
export function randomCriclePoint(x: number, y: number, r: number): { x: number, y: number } {
    let angle = random(0, 360), rr = random(0, r)
    return { x: Math.cos(angle) * rr + x, y: Math.sin(angle) * rr + y }
}

/**
 * 两点的距离
 * @param x1 点1x
 * @param y1 点1y
 * @param x2 点2x
 * @param y2 点2y
 * @return 距离
 */
export function pointsDistance(x1: number, y1: number, x2: number, y2: number): number {
    return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2))
}

/**
 * 查找两定点间差值t的点
 * @param x1 点1x
 * @param y1 点1y
 * @param x2 点2x
 * @param y2 点2y
 * @param t 0~1
 * @return 差值t的点
 */
export function pointsInterpolate(x1: number, y1: number, x2: number, y2: number, t: number)
    : { x: number, y: number } {
    let t1 = 1 - t
    return { x: x1 * t + x2 * t1, y: y1 * t + y2 * t1 }
}

/**
 * 限制一个数大小
 * @param num 数
 * @param min 最小值
 * @param max 最大值  
 */
export function limitNumber(num: number, min: number, max: number): number {
    if (typeof num !== "number" || typeof min !== "number" || typeof max !== "number") {
        return num
    }
    return Math.max(Math.min(num, max), min)
}