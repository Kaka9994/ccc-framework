import * as sub_log from './sub_log'
import * as pkg_utils from '../utils/pkg_utils'
import * as pkg_common from '../common/pkg_common'

const Event_Name = "BaseEvent"

/** 导出全局对象 */
export { gEventQueue as event }

/**
 * 创建事件实例
 * @param n 事件名
 * @param c 回调方法
 * @param o 是否一次调用
 * @return 事件实例
 */
export function createEvent(n: string, c: (...args: any[]) => any, o: boolean): BaseEvent {
    return pkg_common.store.getObj<BaseEvent>(Event_Name, n, c, o)
}

/** 事件接口 */
export interface IEvent {

    /**
     * 设置属性
     * @param n 事件名
     * @param c 回调方法
     * @param o 是否一次调用
     */
    setTo(n: string, c: (...args: any[]) => any, o: boolean): void;

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    post(...args: any[]): string;

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    send(...args: any[]): { data: any, error: string };

    exit(): void;
}

/** 自动事件管理 */
export class AutoEvents {
    /** 事件列表 */
    private _events: BaseEvent[] = []

    /**
     * 添加事件
     * @param n 事件名
     * @param c 回调方法
     */
    public add(n: string, c: (...args: any[]) => any) {
        // 过滤无效参数
        if (!n || !c) {
            sub_log.logger.error("addEvent:参数无效")
            return
        }

        // 反复事件
        let ev = createEvent(n, c, false)

        // 注册事件
        let err = gEventQueue.register(ev)
        if (err) {
            sub_log.logger.error("addEvent:注册事件失败(event:%v)(error:%v)", n, err)
            return
        }

        // 记录事件
        this._events.push(ev)
    }

    /**
     * 清空事件
     */
    public clean() {
        // 反注册全部事件
        for (let i = 0; i < this._events.length; i++) {
            this._events[i].exit()
        }
        this._events = []
    }
}

/** 事件对象 */
class BaseEvent implements IEvent {
    /** 事件名(属性) */
    protected name: string = ""
    /** 调用方法 */
    protected call: pkg_common.Handler = null
    /** 是否只调用一次 */
    protected once: boolean = false

    /**
     * 构造
     * @param n 事件名
     * @param c 回调方法
     * @param o 是否一次调用
     */
    constructor(n: string, c: (...args: any[]) => any, o: boolean) {
        this.setTo(n, c, o)
    }

    /**
     * 设置属性
     * @param n 事件名
     * @param c 回调方法
     * @param o 是否一次调用
     */
    public setTo(n: string, c: (...args: any[]) => any, o: boolean) {
        this.name = n ? n : "def_event"
        this.once = o ? true : false
        this.call = c ? pkg_common.createHandler(c, null, null, this.once) : null
        return this
    }

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    public post(...args: any[]): string {
        // 过滤无效参数
        if (!this.call) {
            return "post:参数无效"
        }

        // 清理call，只调用一次
        let call = this.call
        if (this.once) {
            this.exit()
            this.call = null
        }

        // 转换为异步过程
        setTimeout(() => {
            try {
                // 调用方法
                call.runWith(args)
            } catch (error) {
                sub_log.logger.error("post:调用事件异常|%v-%v", error, error.stack)
            }
        }, 0)

        return null
    }

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    public send(...args: any[]): { data: any, error: string } {
        // 过滤无效参数
        if (!this.call) {
            return { data: null, error: "send:参数无效" }
        }

        // 清理call,只调用异常
        let call = this.call
        if (this.once) {
            this.exit()
            this.call = null
        }

        // 调用方法
        try {
            return { data: call.runWith(args), error: null }
        } catch (error) {
            sub_log.logger.error("send:调用事件异常|%v", error)

            return { data: null, error: "send:调用方法异常" }
        }
    }

    /** 注销自己 */
    public exit() {
        // 反注册自己
        setTimeout(() => {
            gEventQueue.unRegister(this)
        }, 0)
    }
}

/**空事件对象 */
class EmptyEvent extends BaseEvent {
    /**
     * 构造
     * @param n 事件名
     */
    constructor(n: string) {
        super(n, null, false)
    }

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    public post(...args: any[]): string {
        sub_log.logger.debug("post:事件没有获取到(event:%v)", this.name)
        return "empty event"
    }

    /**
     * 通知事件
     * @param args 参数集合
     * @return 错误描述
     */
    public send(...args: any[]): { data: any, error: string } {
        sub_log.logger.debug("send:事件没有获取到(even:%v)", this.name)
        return { data: null, error: "empty event" }
    }

    /**
     * 退出事件
     */
    public exit() {
        sub_log.logger.error("exit:事件没有获取到(event:%v)", this.name)
    }
}

/**事件队列 */
class EventQueue {
    /** 事件集合 <name, event> */
    private _events: pkg_common.Dictionary<string, Array<BaseEvent>> = new pkg_common.Dictionary()

    /**
     * 注册事件
     * @param event 事件对象
     * @return 错误描述
     */
    public register(event: BaseEvent): string {
        // 过滤无效参数
        if (!event) {
            return "register:参数无效"
        }

        // 私有调用
        let name = event["name"]
        let call = event["call"]
        if (!name || name.length == 0 || name === "def_event" || !call) {
            return "register:事件对象无效"
        }

        // 构造对象
        if (!this._events.hasKey(name)) {
            this._events.setValue(name, [])
        }

        // 记录事件
        this._events.getValue(name).push(event)

        return null
    }

    /**
     * 反注册事件
     * @param event 事件对象
     * @return 错误描述
     */
    public unRegister(event: BaseEvent): string {
        // 过滤无效参数
        if (!event) {
            return "unRegister:参数无效"
        }

        // 私有调用
        let name = event["name"]
        if (!name || name.length == 0 || name === "def_event") {
            return "unRegister:事件对象无效"
        }

        // 注销事件
        if (this._events.hasKey(name)) {
            let arr = this._events.getValue(name)
            for (let i = 0, len = arr.length; i < len; i++) {
                if (arr[i] === event) {
                    this._events.setValue(name, arr.splice(i, 1))
                    pkg_common.store.putObj(Event_Name, event)
                    return null
                }
            }
        }

        return pkg_utils.strFmt("unRegister:事件对象没有注册(event:%v)", name)
    }

    /**
     * 获取事件对象集合
     * @param name 事件名
     * @return 事件集合
     */
    public getEvent(name: string): BaseEvent[] {
        // 过滤无效参数
        if (!name || name.length == 0) {
            return []
        }

        // 返回事件
        if (this._events.hasKey(name)) {
            return this._events.getValue(name)
        }

        return []
    }

    /**
     * 获取事件对象
     * @param event 
     * @return 错误描述
     */
    public getOneEvent(event: string): BaseEvent {
        let evs = this.getEvent(event)
        // 使用最后添加的事件，认为是最新事件
        return evs && evs.length > 0 ? evs[evs.length - 1] : new EmptyEvent(event)
    }

    /**
     * 清空事件(谨慎使用)
     */
    public clean(): void {
        let values = this._events.getValues()
        for (let i = 0, len1 = values.length; i < len1; i++) {
            for (let j = 0, len2 = values[i].length; j < len2; j++) {
                pkg_common.store.putObj(Event_Name, values[i][j])
            }
        }
        this._events.clean()
    }
}

/** 处理器对象池类 */
@pkg_common.registerPool(Event_Name, BaseEvent)
class EventPool extends pkg_common.ObjectPool {
    protected unuse(obj: BaseEvent): void {
        obj.setTo('', null, false)
    }
    protected reuse(obj: BaseEvent, ...args: any[]): void {
        let [n, c, o] = [...args]
        obj.setTo(n, c, o)
    }
}


// 初始化
let gEventQueue = new EventQueue();