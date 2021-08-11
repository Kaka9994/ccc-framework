import * as pkg_base from "../base/pkg_base"
import * as pkg_common from "../common/pkg_common"
import * as pkg_utils from "../utils/pkg_utils"
import * as sub_iload from "./sub_iload"
import * as sub_loadenum from "./sub_loadenum"

const LoadVO_Name = "LoadVO"

/**
 * 创建一个加载vo
 * @param vid 编号
 * @param url 加载路径
 * @param filetype 文件类型
 * @return 加载vo
 */
export function createLoadVO(vid: string, url: string, filetype: string): LoadVO {
    return pkg_common.store.getObj<LoadVO>(LoadVO_Name, vid, url, filetype)
}

/**
 * 回收一个加载vo
 * @param vo 加载vo
 */
export function recoverLoadVO(vo: LoadVO): void {
    pkg_common.store.putObj(LoadVO_Name, vo)
}

/** 加载vo */
export class LoadVO implements pkg_common.IDispose {
    /** 编号 */
    private _id: string = ""
    /** 加载路径 */
    private _url: string = ""
    /** 文件类型 */
    private _filetype: string = ""
    /** 持有的缓存 */
    private _cache: sub_iload.ICache = null

    /**
     * 构造
     * @param vid 编号
     * @param url 加载路径
     * @param filetype 文件类型
     */
    constructor(vid: string, url: string, filetype: string) {
        this.setTo(vid, url, filetype)
    }

    /** 编号 */
    public get id(): string {
        return this._id
    }

    /** 加载路径 */
    public get url(): string {
        return this._url
    }

    /** 文件类型 */
    public get filetype(): string {
        return this._filetype
    }

    /** 销毁 */
    public dispose(): void {
        this._id = ""
        this._url = ""
        this._filetype = ""
        this.letAssetGo()
    }

    /**
     * 设置属性
     * @param tid 任务id
     * @param complete 完成Handler
     * @param progress 进度Handler
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     */
    public setTo(vid: string, url: string, filetype: string): void {
        [this._id, this._url, this._filetype] = [vid, url, filetype]
    }

    /** 持有资源，防止task还未完成就被释放 */
    public holdAsset(): void {
        // 通过事件获取缓存对象
        // 获取事件
        let e = pkg_base.event.getOneEvent(sub_loadenum.EnumLoadEvent.GET_ASSET_CACHE)
        if (e == null) {
            return
        }

        // 发送事件
        let data = e.send(this._url)
        if (data.error != null || data.data == null) {
            return
        }
        
        this._cache = data.data
        this._cache.addRef()
    }

    /** 放开持有的资源 */
    public letAssetGo(): void {
        if (this._cache != null) {
            this._cache.decRef()
            this._cache = null
        }
    }

    /**
     * 发送加载进度事件
     * @param url 加载路径
     * @param progress 加载进度(0~1)
     */
    public sendProgress(url: string, progress: number): void {
        let e = pkg_base.event.getOneEvent(sub_loadenum.EnumLoadEvent.PROGRESS)
        if (e != null) {
            e.post(url, progress)
        }
    }

    /**
     * 发送加载完成事件
     * @param url 加载路径
     * @param err 加载错误信息
     * @param res 资源
     */
    public sendComplete(url: string, err: string, res: any): void {
        let e = pkg_base.event.getOneEvent(sub_loadenum.EnumLoadEvent.COMPLETE)
        if (e != null) {
            e.post(url, err, res)
        }
    }
}

/** 加载任务对象池 */
@pkg_common.registerPool(LoadVO_Name, LoadVO)
class LoadTaskPool extends pkg_common.ObjectPool {
    public unuse(obj: LoadVO, ...args: any): void {
        obj.dispose()
    }
    public reuse(obj: LoadVO, ...args: any): void {
        let [vid, url, filetype] = [...args]
        obj.setTo(vid, url, filetype)
    }
}