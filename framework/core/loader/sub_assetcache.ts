import * as pkg_base from "../base/pkg_base"
import * as pkg_common from "../common/pkg_common"
import * as sub_iload from "./sub_iload"
import * as sub_loadenum from "./sub_loadenum"

/** 渲染执行时间(ms全局) */
let gRenderTime = 0

/** 基础缓存类(一般来说只需要重写dispose) */
export class BaseCache implements sub_iload.ICache {
    /** 持有数量 */
    protected _count: number = 0
    /** 资源路径 */
    protected _url: string = ""
    /** 资源 */
    protected _data: any = null
    /** 生存时间ms */
    protected _lifetime: number = 0
    /** 标记时间戳 */
    protected _recordTime: number = 0

    /** 获取数据 */
    public getData(): any {
        return this._data
    }

    /**
     * 设置数据
     * @param url 资源路径
     * @param data 数据
     */
    public setData(url: string, data: any): void {
        [this._url, this._data, this._recordTime] = [url, data, gRenderTime]
    }

    /**
     * 设置生存时间
     * @param lifetime 生存时间
     */
    public setLifetime(lifetime: number): void {
        this._lifetime = lifetime
    }

    /**
     * 持有一次
     */
    public addRef(): void {
        this._count++

        // 清空记录时间
        this._recordTime = 0
    }

    /**
     * 放开一次持有
     */
    public decRef(): void {
        let oldCount = this._count
        this._count = Math.max(0, this._count - 1)

        // 引用减为0，记一次时间
        if (oldCount != 0 && this._count == 0) {
            this._recordTime = gRenderTime
        }
    }

    /**
     * 尝试释放资源
     * @return 是否释放成功
     */
    public tryRelease(): boolean {
        // 引用不为0
        if (this._count > 0) {
            return false
        }

        // 处于生存时间
        if (this._recordTime != 0 &&
            gRenderTime - this._recordTime <= this._lifetime) {
            return false
        }

        // 销毁(释放)
        this.dispose()
        return true
    }

    /** 销毁(子类dispose里放最后调用) */
    public dispose(): void {
        this._count = 0
        this._url = ""
        this._data = null
        this._lifetime = 0
        this._recordTime = 0
    }
}

/** 
 * 自动缓存管理类
 * @description 用自动缓存管理获取的资源缓存必须用自动缓存管理回收
 */
export class AutoCache {
    /** 缓存列表 */
    private _caches: sub_iload.ICache[] = []

    /**
     * 获取缓存
     * @param url 资源路径
     * @return 缓存
     */
    public getRes(url: string): sub_iload.ICache {
        // 通过事件获取缓存对象
        // 获取事件
        let e = pkg_base.event.getOneEvent(sub_loadenum.EnumLoadEvent.GET_ASSET_CACHE)
        if (e == null) {
            return null
        }

        // 发送事件
        let data = e.send(url)
        if (data.error != null || data.data == null) {
            return null
        }

        // 记录缓存
        let cache: sub_iload.ICache = data.data
        cache.addRef()
        this._caches.push(cache)

        return cache
    }

    /**
     * 回收缓存
     * @param cache 缓存
     */
    public putRes(cache: sub_iload.ICache): void {
        let i = this._caches.indexOf(cache)
        if (i != -1) {
            cache.decRef()
            this._caches.splice(i, 1)
        }
    }

    /**
     * 清理，清理所有记录的缓存
     */
    public clean(): void {
        for (let len = this._caches.length, i = len - 1; i >= 0; i--) {
            let cache = this._caches[i]
            cache.decRef()
            this._caches.splice(i, 1)
        }
    }
}

/** 
 * 资源缓存类
 */
export class AssetCache implements pkg_common.IRender, pkg_common.IDispose, pkg_common.IWakeUp {
    /** 缓存检测时间ms */
    private _cacheCheckTime: number = 0
    /** 缓存字典 <type, cache> */
    private _cacheDic: pkg_common.Dictionary<string, KCache> = new pkg_common.Dictionary()
    /** 资源路径字典(方便查找资源对应的缓存) <url, type> */
    private _urlDic: pkg_common.Dictionary<string, string> = new pkg_common.Dictionary()
    /** 计时时间ms */
    private _time: number = 0

    /**
     * 构造
     * @param cacheCheckTime 缓存检测时间ms(每隔改时间开始检测缓存释放)
     */
    constructor(cacheCheckTime: number) {
        this._cacheCheckTime = cacheCheckTime
    }

    /** 渲染 */
    public render(t: number, dt: number): void {
        // 记录渲染时间
        gRenderTime = t

        // 过滤无效检测时间
        if (this._cacheCheckTime <= 0) {
            return
        }

        this._time += dt
        if (this._time >= this._cacheCheckTime) {
            this._time = 0
            this._doReleaseCache()
        }
    }

    /** 销毁 */
    public dispose(): void {
        this._cacheCheckTime = 0
        this._time = 0

        // 清理缓存
        let urlArr = [].concat(this._urlDic.getKeys())
        urlArr.forEach((url: string) => {
            this.releaseRes(url)
        })
    }

    /** 唤醒 */
    public wakeup(): void {
        // 更新缓存生存时间
    }

    /**
     * 注册缓存
     * @param type 资源类型
     * @param clz 缓存类
     * @param lifetime 生存时间ms(引用为0时等待释放的时间)
     */
    public registerCache(type: string, clz: Function, lifetime: number = 10 * 60 * 1000): void {
        // 校验缓存类
        if (!this._isBaseCacheChild(clz)) {
            pkg_base.logger.error("registerCache:非法缓存类|%v", type)
            return
        }

        // 校验生存时间
        if (this._cacheCheckTime > lifetime) {
            pkg_base.logger.error("registerCache:生存时间小于检测时间|%v,%v,%v",
                type, this._cacheCheckTime, lifetime)
            return
        }

        this._cacheDic.setValue(type, new KCache(type, clz, lifetime))
    }

    /**
     * 注销缓存
     * @param type 资源类型
     */
    public unRegisterCache(type: string): void {
        let value = this._cacheDic.getValue(type)
        if (value != null) {
            value.dispose()
            this._cacheDic.remove(type)
        }
    }

    /**
     * 设置缓存
     * @param type 资源类型
     * @param url 资源路径
     * @param res 资源
     */
    public setRes(type: string, url: string, res: any): void {
        // 过滤非法资源类型
        let caches = this._cacheDic.getValue(type)
        if (caches == null) {
            pkg_base.logger.error("setRes:设置缓存失败|%v", type)
            return
        }

        this._urlDic.setValue(url, type)
        caches.setRes(url, res)
    }

    /**
     * 获取缓存
     * @param url 资源路径
     * @return 缓存
     */
    public getRes(url: string): sub_iload.ICache {
        let type = this._urlDic.getValue(url),
            caches = this._cacheDic.getValue(type)
        if (caches == null) {
            pkg_base.logger.error("getRes:获取缓存失败|%v,%v", url, type)
            return null
        }

        return caches.getRes(url)
    }

    /**
     * 释放资源
     * @param url 资源路径
     */
    public releaseRes(url: string): void {
        let type = this._urlDic.getValue(url),
            caches = this._cacheDic.getValue(type)
        if (caches == null) {
            pkg_base.logger.error("releaseRes:释放缓存失败|%v,%v", url, type)
            return null
        }

        caches.releaseRes(url)
        this._urlDic.remove(url)
    }

    /**
     * 是否有缓存
     * @param url 资源路径
     * @return 是否有缓存
     */
    public hasRes(url: string): boolean {
        let type = this._urlDic.getValue(url),
            caches = this._cacheDic.getValue(type)
        if (caches == null) {
            return false
        }
        return caches.getRes(url) != null
    }

    /**
     * 释放资源
     */
    private _doReleaseCache(): void {
        // 遍历缓存字典
        let cachesArr = this._cacheDic.getValues()
        cachesArr.forEach((caches: KCache) => {
            // 遍历资源路径
            let urlArr = [].concat(caches.me.getKeys())
            urlArr.forEach((url: string) => {
                // 尝试释放缓存
                let cache = caches.getRes(url),
                    ok = cache.tryRelease()

                // 移除缓存记录
                if (ok) {
                    caches.removeRes(url)
                    this._urlDic.remove(url)
                }
            })
        })
    }

    /**
     * 检测是否基础缓存类的子类型
     * @param clz 缓存类
     * @return 是否基础缓存类的子类型
     */
    private _isBaseCacheChild(clz: Function): boolean {
        let o = clz, ok = false
        while (o != null && !ok) {
            if (o == BaseCache) {
                ok = true
                continue
            }

            o = Object.getPrototypeOf(o)
        }
        return ok
    }
}

/** 对应类型的缓存集合类 */
class KCache implements pkg_common.IDispose {
    /** 类型 */
    public type: string = ""
    /** 缓存主体 <url, cache> */
    public me: pkg_common.Dictionary<string, sub_iload.ICache> = new pkg_common.Dictionary()
    /** 对象池名 */
    private _poolname: string = ""
    /** 生存时间ms */
    private _lifetime: number = 0

    /**
     * 构造
     * @param type 加载类型
     * @param clz 缓存类
     * @param lifetime 生存时间ms(引用为0时等待释放的时间)
     */
    constructor(type: string, clz: Function, lifetime: number) {
        [this.type, this._poolname, this._lifetime] = [type, `Cache_${type}`, lifetime]
        pkg_common.store.createPool<sub_iload.ICache>(this._poolname, clz)
    }

    /** 销毁 */
    public dispose(): void {
        this.type = ""
        this._poolname = ""
        this._lifetime = 0

        // 释放资源
        let urlArr = this.me.getKeys()
        urlArr.forEach((url: string) => {
            this.releaseRes(url)
        })
    }

    /** 
     * 设置缓存
     * @param url 资源路径
     * @param res 资源
     */
    public setRes(url: string, res: any): void {
        // 过滤重复缓存
        if (this.me.hasKey(url)) {
            pkg_base.logger.error("setRes:禁止设置重复缓存|%v", url)
            return
        }

        let cache = pkg_common.store.getObj<sub_iload.ICache>(this._poolname)
        cache.setData(url, res)
        cache.setLifetime(this._lifetime)
        this.me.setValue(url, cache)
    }

    /**
     * 获取缓存
     * @param url 资源路径
     * @return 缓存
     */
    public getRes(url: string): sub_iload.ICache {
        return this.me.getValue(url)
    }

    /**
     * 释放缓存
     * @param url 资源路径
     */
    public releaseRes(url: string): void {
        let cache = this.getRes(url)
        if (cache != null) {
            cache.dispose()
            this.removeRes(url)
        }
    }

    /**
     * 移除缓存记录(不会释放缓存)
     * @param url 资源路径
     */
    public removeRes(url: string): void {
        this.me.remove(url)
    }
}