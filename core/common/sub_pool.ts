import * as pkg_base from "../base/pkg_base"
import * as sub_dict from "./sub_dict"
import * as sub_interface from "./sub_interface"

/** 导出全局对象 */
export { gStore as store }

/**
 * 对象池装饰器
 * @param poolname 对象池名
 * @param clz 对象类｜对象实例(注意：传入对象实例创建的对象只包含原型链上的属性)
 * @return 类
 */
export function registerPool(poolname: string, clz: any): Function {
    return function (target: Function) {
        // 校验参数
        if (target == null || !target.prototype.isPool) {
            pkg_base.logger.error("RegisterPool:装饰器装饰类对象无效|%v", poolname)
            return
        }

        // 对象池已经注册
        if (gStore.findPool(poolname) != null) {
            pkg_base.logger.error("RegisterPool:对象池已经注册|%v", poolname)
            return
        }

        // 注册对象池
        gStore.addPool(poolname, new (<any>target)(clz))
    }
}

/** 
 * 对象池
 * @description 
 * 用户需要自行复写new\unuse\reuse\dispose方法，new方法可以按自己需求复写，
 * 只要通过put回收的对象都会执行unuse，只要通过get方法获取的对象都会执行reuse，
 */
export class ObjectPool<T = any> implements sub_interface.IDispose {
    /** 对象模版 */
    private _template: any = null
    /** 对象池 */
    private _pool: Array<T> = []

    /**
     * 构造
     * @param clz 类构建对象
     */
    constructor(clz: any) {
        this._template = clz
    }

    /** 对象池标识 */
    public get isPool(): boolean {
        return true
    }

    /** 
     * 获取对象池的对象
     * @param args 构造参数
     * @return 对象
     */
    public get(...args: any[]): T {
        let obj: T = this._pool.length <= 0 ? this.new(...args) : this._pool.shift()

        // 执行复用函数
        if (obj != null) {
            this.reuse(obj, ...args)
        }

        return obj
    }

    /**
     * 回收对象
     * @param obj 对象
     * @param args 回收参数
     */
    public put(obj: T, ...args: any[]): void {
        if (obj == null) {
            return
        }

        this.unuse(obj, ...args)
        this._pool.push(obj)
    }

    /** 销毁对象池 */
    public dispose(): void {
        for (let i = 0, len = this._pool.length; i < len; i++) {
            let obj: any = this._pool[i]
            if (obj != null && typeof obj.dispose === "function") {
                obj.dispose()
            }
        }
        this._pool.length = 0
        this._template = null
    }

    /** 
     * 创建新对象
     * @param args 构造参数
     * @return 对象
     */
    protected new(...args: any[]): T {
        if (this._template == null) {
            return null
        }

        // new
        let clz = this._template
        if (typeof clz === "function") {
            return new clz(...args)
        }

        // copy(只拷贝原型链上的属性)
        if (typeof clz === "object") {
            // 构建拷贝对象函数
            let copyObj = function (target: any): any {
                let out = {}
                for (let name in target) {
                    if (!target.hasOwnProperty(name)) {
                        continue
                    }

                    if (typeof target[name] === "object") {
                        out[name] = copyObj(target[name])
                        continue
                    }

                    out[name] = target[name]
                }
                return out
            }

            // 拷贝对象
            return copyObj(clz)
        }

        return null
    }

    /** 
     * 回收时执行
     * @param obj 对象
     * @param args 回收参数
     */
    protected unuse(obj: T, ...args: any[]): void {
    }

    /** 
     * 复用时执行
     * @param obj 对象
     * @param args 复用参数
     */
    protected reuse(obj: T, ...args: any[]): void {
    }
}

/**
 * 对象商店接口
 */
export interface IObjectStore extends sub_interface.IDispose {

    /**
     * 创建对象池
     * @param poolname 对象池名
     * @param clz 对象类｜对象实例(注意：传入对象实例创建的对象只包含原型链上的属性)
     */
    createPool<T>(poolname: string, clz: any): ObjectPool<T>;

    /** 
     * 获取对象
     * @param poolname 对象池名
     * @param args 构造参数
     */
    getObj<T>(poolname: string, ...args: any[]): T;

    /**
     * 回收对象
     * @param poolname 对象池名
     * @param obj 对象
     * @param args 回收参数
     */
    putObj(poolname: string, obj: any, ...args: any[]): void;

    /**
     * 查找对象池
     * @param poolname 对象池名
     * @return 对象池
     */
    findPool<T>(poolname: string): ObjectPool<T>;

    /**
     * 添加对象池
     * @param poolname 对象池名
     * @param pool 对象池
     */
    addPool(poolname: string, pool: ObjectPool): void;

    /**
     * 销毁对象池
     * @param poolname 对象池名
     */
    disposePool(poolname: string): void;
}

/**
 * 对象商店，统一管理对象池
 */
class ObjectStore implements IObjectStore {
    /** 对象池集合 <name, pool> */
    private _pools: sub_dict.Dictionary<string, ObjectPool> = new sub_dict.Dictionary()

    /**
     * 创建对象池
     * @param poolname 对象池名
     * @param clz 对象类｜对象实例(注意：不重写new函数，则传入对象实例创建的对象只包含原型链上的属性)
     */
    public createPool<T>(poolname: string, clz: any): ObjectPool<T> {
        // 对象池已经注册
        if (gStore.findPool(poolname) != null) {
            pkg_base.logger.error("createPool:对象池已经注册|%v", poolname)
            return null
        }

        // 创建对象池
        let pool = new ObjectPool<T>(clz)
        gStore.addPool(poolname, pool)
        return pool
    }

    /** 
     * 获取对象
     * @param poolname 对象池名
     * @param args 构造参数
     */
    public getObj<T>(poolname: string, ...args: any[]): T {
        let pool = this.findPool<T>(poolname)
        if (pool == null) {
            return null
        }
        return pool.get(...args)
    }

    /**
     * 回收对象
     * @param poolname 对象池名
     * @param obj 对象
     * @param args 回收参数
     */
    public putObj(poolname: string, obj: any, ...args: any[]): void {
        let pool = this.findPool(poolname)
        if (pool == null) {
            return
        }
        pool.put(obj, ...args)
    }

    /**
     * 查找对象池
     * @param poolname 对象池名
     * @return 对象池
     */
    public findPool<T>(poolname: string): ObjectPool<T> {
        return this._pools.getValue(poolname)
    }

    /**
     * 添加对象池
     * @param poolname 对象池名
     * @param pool 对象池
     */
    public addPool(poolname: string, pool: ObjectPool): void {
        if (this.findPool(poolname) == null) {
            this._pools.setValue(poolname, pool)
        }
    }

    /**
     * 销毁对象池
     * @param poolname 对象池名
     */
    public disposePool(poolname: string): void {
        let pool = this.findPool(poolname)
        if (pool != null) {
            pool.dispose()
            this._pools.remove(poolname)
        }
    }

    /** 销毁 */
    public dispose(): void {
        let pools = this._pools.getValues()
        for (let i = 0, len = pools.length; i < len; i++) {
            let pool = pools[i]
            if (pool != null) {
                pool.dispose()
            }
        }
        this._pools.clean()
    }
}

// 初始化
let gStore = new ObjectStore()