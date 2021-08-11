import * as sub_math from "./sub_math"

/**
 * 排序number数组(min->max)(不会修改源数组)
 * @param arr 数组
 * @return 排序后的数组
 */
export function sortNum(arr: Array<number>): Array<number> {
    if (arr == null || arr.length <= 0) {
        return arr
    }

    arr = [].concat(arr)
    return arr.sort((a, b) => { return a - b })
}

/**
 * 以数组元素的属性来排序数组(min->max)(不会修改源数组)
 * @param arr 数组
 * @param name 元素的属性名 
 * @return 排序后的数组
 */
export function sortOn<T>(arr: Array<T>, name: string): Array<T> {
    if (arr == null || arr.length <= 0) {
        return arr
    }

    arr = [].concat(arr)
    return arr.sort((a, b) => {
        return a[name] - b[name];
    });
}

/**
 * 数组去重(不会修改源数组)
 * @param arr 数组
 * @return 过滤后的数组
 */
export function filterRepeat<T>(arr: Array<T>): Array<T> {
    if (arr == null || arr.length <= 0) {
        return arr
    }

    arr = [].concat(arr)
    for (let i = 0; i < arr.length - 1; i++) {
        for (let j = i + 1; j < arr.length; j++) {
            if (arr[i] == arr[j]) {
                arr.splice(j, 1)
                j--
            }
        }
    }
    return arr
}

/**
 * 过滤数组(不会修改源数组)
 * @param arr 数组
 * @param target 需要过滤的目标值
 * @return 过滤后的数组
 */
export function filterItem<T>(arr: Array<T>, target: T): Array<T> {
    if (arr == null || arr.length <= 0) {
        return arr
    }

    return arr.filter((item) => {
        return item != target
    })
}

/**
 * 打乱数组(不会修改源数组)
 * @param arr 数组
 * @return 打乱顺序后的数组
 */
export function messArray<T>(arr: Array<T>): Array<T> {
    if (arr == null || arr.length <= 0) {
        return arr
    }

    arr = [].concat(arr)
    return arr.sort((a, b) => {
        return Math.random() > 0.5 ? 1 : -1
    })
}

/**
 * 获取数组中的一个随机元素
 * @param arr 数组
 * @return 随机元素
 */
export function randomFromArray<T>(arr: Array<T>): T {
    let len: number = arr != null ? arr.length : 0
    if (len <= 0) {
        return null
    }

    return arr[sub_math.randomInt(0, len)]
}

/**
 * 查找两数组间的不同项
 * @param arr1 数组1
 * @param arr2 数组2
 * @return 不同项数组
 */
export function differenceArray<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
    if (arr1 == null || arr1.length <= 0 ||
        arr2 == null || arr2.length <= 0) {
        return []
    }

    let newArr: T[] = []
    arr1 = [].concat(arr1)
    arr2 = [].concat(arr2)
    for (let i = 0, len = arr1.length; i < len; i++) {
        let index = arr2.indexOf(arr1[i])
        if (index != -1) {
            arr2.splice(index, 1)
            arr1.splice(i, 1)
            i--
        }
    }
    if (arr1.length > 0) newArr = newArr.concat(arr1)
    if (arr2.length > 0) newArr = newArr.concat(arr2)

    return newArr
}

/**
 * 查找两数组间的相同项
 * @param arr1 数组1
 * @param arr2 数组2
 * @return 相同项数组
 */
export function identicalArray<T>(arr1: Array<T>, arr2: Array<T>): Array<T> {
    if (arr1 == null || arr1.length <= 0 ||
        arr2 == null || arr2.length <= 0) {
        return []
    }

    let newArr: T[] = []
    for (let i = 0, len = arr1.length; i < len; i++) {
        if (arr2.indexOf(arr1[i]) != -1) {
            newArr.push(arr1[i])
        }
    }
    
    return newArr
}