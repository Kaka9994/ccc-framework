import * as pkg_base from "../base/pkg_base"
import * as sub_pool from "./sub_pool"
import * as sub_round from "./sub_round"

const Handler_Name = "Handler"

/*
注意：使用handler回收后需要将外部引用清空，否则将引起不必要的问题。
     若once设置true(只执行一次)，则外部不要长时间持有该handler。
*/

/**
 * 从对象池内创建一个Handler，默认会执行一次并立即回收，如果不需要自动回收，设置once参数为false
 * @param method 回调方法
 * @param caller 执行域this(填null则默认method绑定的执行域)
 * @param args 携带的参数
 * @param once 是否只执行一次，如果为true，回调后执行recover()进行回收，默认为true
 * @return 返回创建的handler实例
 */
export function createHandler(method: Function, caller: any = null, args: Array<any> = null, once: boolean = true): Handler {
    let h = sub_pool.store.getObj<Handler>(Handler_Name, method, caller, args, once)
    if (h != null) {
        gUsing[h.id] = h
    }
    return h
}

/** 清理所有在使用中的Handle，只在离开游戏最后阶段调用 */
export function recoverHandlers(): void {
    for (let id in gUsing) {
        let h = gUsing[id]
        if (h != null) {
            h.recover()
        }
    }
}

/** 处理器类 */
export class Handler {
    /** 编号id */
    private _id: number = 0
    /** 处理方法 */
    private _method: Function
    /** 执行域this */
    private _caller: any
    /** 参数 */
    private _args: any[]
    /** 表示是否只执行一次。如果为true，回调后执行recover()进行回收，回收后会被再利用，默认为false */
    private _once: boolean = false

    /**
     * 根据指定的属性值，创建一个Handler类的实例
     * @param method 处理函数
     * @param caller 执行域
     * @param args 函数参数
     * @param once 是否只执行一次
     */
    constructor(method: Function = null, caller: any = null, args: any[] = null, once: boolean = false) {
        this.setTo(method, caller, args, once)
    }

    /**
     * 设置此对象的指定属性值
     * @param method 回调方法
     * @param caller 执行域
     * @param args 携带的参数
     * @param once 是否只执行一次，如果为true，执行后执行recover()进行回收
     * @return 返回 handler 本身
     */
    public setTo(method: Function, caller: any, args: any[], once: boolean): Handler {
        [this._id, this._method, this._caller, this._args, this._once] =
            [sub_round.getRound(Handler_Name, 1), method, caller, args, once]
        return this
    }

    /** 编号id */
    public get id(): number {
        return this._id;
    }

    /**
     * 执行处理器
     * @return 返回值
     */
    public run(): any {
        // 过滤无效方法
        if (this._method == null || typeof this._method !== "function") {
            return null
        }

        // 过滤无效id
        if (this._id == 0) {
            pkg_base.logger.error("run:不可执行处于已回收状态的Handler")
            return null
        }

        // 执行方法
        let result = this._caller == null ? this._method(...this._args) :
            this._method.apply(this._caller, this._args)

        // 回收
        this._once && this.recover()

        return result
    }

    /**
     * 执行处理器，携带额外数据
     * @param data 附加的回调数据，可以是单数据或者Array(作为多参)
     * @return 返回值
     */
    public runWith(data: any): any {
        // 过滤无效方法
        if (this._method == null || typeof this._method !== "function") {
            return null
        }

        // 过滤无效id
        if (this._id == 0) {
            pkg_base.logger.error("runWith:不可执行处于已回收状态的Handler")
            return null
        }

        // 执行方法
        let result = null
        if (data == null) {
            result = this._caller == null ? this._method(...this._args) :
                this._method.apply(this._caller, this._args)
        } else if (!this._args && !(data instanceof Array)) {
            result = this._caller == null ? this._method(data) :
                this._method.call(this._caller, data)
        } else if (this._args) {
            result = this._caller == null ? this._method(...this._args.concat(data)) :
                this._method.apply(this._caller, this._args.concat(data))
        } else {
            result = this._caller == null ? this._method(...data) :
                this._method.apply(this._caller, data)
        }

        // 回收
        this._once && this.recover()

        return result
    }

    /**
     * 清理对象
     * @return 返回清理后的handle
     */
    public clear(): Handler {
        this._method = null
        this._caller = null
        this._args = null
        return this
    }

    /** 清理并回收到 Handler 对象池内 */
    public recover(): void {
        if (this._id != 0) {
            if (gUsing[this._id] != null) {
                delete gUsing[this._id]
            }

            this._id = 0
            sub_pool.store.putObj(Handler_Name, this)
        }
    }
}

/** 处理器对象池类 */
@sub_pool.registerPool(Handler_Name, Handler)
class HandlerPool extends sub_pool.ObjectPool {
    protected unuse(obj: Handler): void {
        obj.clear()
    }
    protected reuse(obj: Handler, ...args: any[]): void {
        let [method, caller, objargs, once] = [...args]
        obj.setTo(method, caller, objargs, once)
    }
}

// 初始化
let gUsing: { [id: number]: Handler } = {}
