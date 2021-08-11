import * as pkg_base from "../base/pkg_base"
import * as pkg_common from "../common/pkg_common"
import * as pkg_utils from "../utils/pkg_utils"
import * as sub_loadenum from "./sub_loadenum"
import * as sub_loadvo from "./sub_loadvo"

const LoadTask_Name = "LoadTask"

/**
 * 创建一个加载任务
 * @param tid 任务id
 * @param progress 进度Handler
 * @param complete 完成Handler
 * @param order 优先级(越小优先级越高-1|0|1|2|3)
 * @return 加载任务
 */
export function createLoadTask(
    tid: number,
    progess: pkg_common.Handler,
    complete: pkg_common.Handler,
    order: number
): LoadTask {
    return pkg_common.store.getObj<LoadTask>(LoadTask_Name, tid, progess, complete, order)
}

/**
 * 回收一个加载任务
 * @param task 加载任务
 */
export function recoverLoadTask(task: LoadTask): void {
    pkg_common.store.putObj(LoadTask_Name, task)
}

/** 加载任务 */
export class LoadTask implements pkg_common.IDispose {
    /** 任务编号 */
    private _id: number = -1
    /** 任务进度Handler */
    private _progress: pkg_common.Handler = null
    /** 任务完成Handler */
    private _complete: pkg_common.Handler = null
    /** 任务优先级(越小优先级越高-1|0|1|2|3) */
    private _order: number = 1
    /** 任务状态 */
    private _status: sub_loadenum.EnumLoadTaskStatus = sub_loadenum.EnumLoadTaskStatus.READY
    /** 加载vo字典 <vid, vo> */
    private _voDic: pkg_common.Dictionary<string, sub_loadvo.LoadVO> = new pkg_common.Dictionary()
    /** 可以开始加载的vo id */
    private _readyVOs: string[] = []
    /** 正在加载的vo id */
    private _loadingVOs: string[] = []
    /** 加载完成的vo id */
    private _completeVOs: string[] = []
    /** 记录加载进度信息 */
    private _curProgress: number = 0
    /** vo完成信息 <url, err> */
    private _voInfo: { [url: string]: string } = {}

    /** 创建vo编号 */
    public static createVid(tid: number, voNum: number): string {
        return `${tid}_${voNum}`
    }

    /** 获取task编号 */
    public static getTidFromVid(vid: string): number {
        if (pkg_utils.isEmpty(vid) && typeof vid === "string") {
            return -1
        }

        let arr = vid.split('_')
        return arr.length != 2 ? -1 : Number(arr[0])
    }

    /**
     * 构造
     * @param tid 任务id
     * @param progress 进度Handler
     * @param complete 完成Handler
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     */
    constructor(tid: number, progess: pkg_common.Handler, complete: pkg_common.Handler, order: number) {
        this.setTo(tid, progess, complete, order)
    }

    /** 任务编号 */
    public get id(): number {
        return this._id
    }

    /** 优先级 */
    public get order(): number {
        return this._order
    }

    /** 加载状态 */
    public get status(): sub_loadenum.EnumLoadTaskStatus {
        return this._status
    }

    /** 销毁 */
    public dispose(): void {
        this._id = -1
        if (this._progress != null) {
            this._progress.recover()
            this._progress = null
        }
        if (this._complete != null) {
            this._complete.recover()
            this._complete = null
        }
        this._order = 1
        this._status = sub_loadenum.EnumLoadTaskStatus.DISPOSE
        let vos: sub_loadvo.LoadVO[] = []
        if (this._voDic != null) {
            vos = vos.concat(this._voDic.getValues())
            this._voDic.clean()
        }
        this._readyVOs.length = this._loadingVOs.length = this._completeVOs.length = 0
        this._curProgress = 0
        this._voInfo = {}

        // 清理vo
        vos.forEach((vo: sub_loadvo.LoadVO) => {
            vo.dispose()
        })
    }

    /**
     * 切换状态
     * @param status 状态
     */
    public changeStatus(status: sub_loadenum.EnumLoadTaskStatus): void {
        this._status = status
    }

    /**
     * 设置属性
     * @param tid 任务id
     * @param progress 进度Handler
     * @param complete 完成Handler
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     */
    public setTo(tid: number, progess: pkg_common.Handler, complete: pkg_common.Handler, order: number): void {
        [this._id, this._progress, this._complete, this._order] = [tid, progess, complete, order]
    }

    /** 尝试恢复暂停的任务 */
    public tryResume(): void {
        // 过滤非法状态
        if (this._status != sub_loadenum.EnumLoadTaskStatus.PAUSE) {
            pkg_base.logger.error("tryResume:task状态无效|%v", this._status)
            return
        }

        let status = sub_loadenum.EnumLoadTaskStatus.CANCEL

        switch (true) {
            // 准备状态
            case this._readyVOs.length == this._voDic.count:
                status = sub_loadenum.EnumLoadTaskStatus.READY
                break
            // 加载状态
            case this._loadingVOs.length != 0: {
                status = sub_loadenum.EnumLoadTaskStatus.LOADING
    
                // 恢复加载进度
                if (this._progress != null) {
                    this._progress.runWith(this._curProgress)
                }
                break
            }
            // 加载完成状态
            case this._completeVOs.length == this._voDic.count: {
                status = sub_loadenum.EnumLoadTaskStatus.COMPLETED
    
                // 恢复加载进度
                if (this._progress != null) {
                    this._progress.runWith(this._curProgress)
                }
    
                // 调用完成回调
                if (this._complete != null) {
                    this._complete.runWith(this._voInfo)
                }
    
                // 放开vo持有的资源
                let vos = this._voDic.getValues()
                vos.forEach((vvo: sub_loadvo.LoadVO) => {
                    vvo.letAssetGo()
                })
                break
            }
        }

        this.changeStatus(status)
    }

    /**
     * vo加载进度
     * @param vid 
     * @param progress 
     */
    public doProgress(vid: string, progress: number): void {
        // 计算总任务进度
        let voCount = this._voDic.count,
            totalProgress = (this._completeVOs.length / voCount) + (progress / voCount)
        this._curProgress = Number(totalProgress.toFixed(2))

        // 过滤无效task状态
        if (!this.isActive()) {
            return
        }

        // 调用进度回调
        if (this._progress != null) {
            this._progress.runWith(this._curProgress)
        }
    }

    /**
     * vo加载完成
     * @param vid vo编号
     * @param err 错误信息
     */
    public doComplete(vid: string, err: string): void {
        let vo = this._voDic.getValue(vid)

        // 过滤无效vo
        if (vo == null) {
            return
        }

        // 添加vo完成信息
        this._voInfo[vo.url] = err

        // 还有vo未加载完成
        if (this._voDic.count != this._completeVOs.length) {
            // vo持有一下资源，防止被释放
            vo.holdAsset()
            return
        }

        // 过滤无效task状态
        if (!this.isActive()) {
            return
        }

        // 调用完成回调
        if (this._complete != null) {
            this._complete.runWith(this._voInfo)
        }

        // 放开vo持有的资源
        let vos = this._voDic.getValues()
        vos.forEach((vvo: sub_loadvo.LoadVO) => {
            vvo.letAssetGo()
        })

        // 修改task状态
        this.changeStatus(sub_loadenum.EnumLoadTaskStatus.COMPLETED)
    }

    /**
     * 创建vo
     * @param url 加载路径
     * @param filetype 加载类型
     * @return vo
     */
    public createVO(url: string, filetype: string): sub_loadvo.LoadVO {
        // 过滤无效状态
        if (this._status != sub_loadenum.EnumLoadTaskStatus.READY) {
            pkg_base.logger.error("addVO:过滤无效状态")
            return null
        }

        // 创建vo
        let vo = sub_loadvo.createLoadVO(
            LoadTask.createVid(this._id, this._voDic.count),
            url, filetype
        )

        this._voDic.setValue(vo.id, vo)
        this._readyVOs.push(vo.id)
        return vo
    }

    /**
     * 获取vo
     * @param vid vo编号
     * @return vo 
     */
    public getVO(vid: string): sub_loadvo.LoadVO {
        return this._voDic.getValue(vid)
    }

    /**
     * 获取可以加载的vo数组
     * @return vo数组
     */
    public getReadyLoadVOs(): sub_loadvo.LoadVO[] {
        let vos: sub_loadvo.LoadVO[] = []
        for (let len = this._readyVOs.length, i = len - 1; i >= 0; i--) {
            let vid = this._readyVOs[0],
                vo = this._voDic.getValue(vid)
            if (vo == null) {
                this._readyVOs.splice(i, 1)
                continue
            }
            vos.push(vo)
        }
        return vos
    }

    /**
     * 设置vo加载中
     * @param vid vo编号
     */
    public setVO2loading(vid: string): void {
        this._loadingVOs.push(vid)
        this._readyVOs = pkg_utils.filterItem(this._readyVOs, vid)
        this._loadingVOs = pkg_utils.filterRepeat(this._loadingVOs)
        this._completeVOs = pkg_utils.filterItem(this._completeVOs, vid)
    }

    /**
     * 设置vo加载完成
     * @param vid vo编号
     */
    public setVO2complete(vid: string): void {
        this._completeVOs.push(vid)
        this._readyVOs = pkg_utils.filterItem(this._readyVOs, vid)
        this._loadingVOs = pkg_utils.filterItem(this._loadingVOs, vid)
        this._completeVOs = pkg_utils.filterRepeat(this._completeVOs)
    }

    /**
     * 是否含有对应url的vo
     * @param url 加载路径
     * @return vo
     */
    public hasVOByUrl(url: string): sub_loadvo.LoadVO {
        let vos = this._voDic.getValues(),
            len = vos.length
        for (let i = 0; i < len; i++) {
            if (url == vos[i].url) {
                return vos[i]
            }
        }
        return null
    }

    /**
     * 加载任务是否是活跃的(ready/loading)
     * @return 是否是活跃的
     */
    public isActive(): boolean {
        if (this._status == sub_loadenum.EnumLoadTaskStatus.READY ||
            this._status == sub_loadenum.EnumLoadTaskStatus.LOADING) {
            return true
        }
        return false
    }

    /**
     * 加载任务是否是有效的(ready/loading/pause)
     * @return 是否是有效的
     */
    public isValid(): boolean {
        if (this._status == sub_loadenum.EnumLoadTaskStatus.READY ||
            this._status == sub_loadenum.EnumLoadTaskStatus.LOADING ||
            this._status == sub_loadenum.EnumLoadTaskStatus.PAUSE) {
            return true
        }
        return false
    }
}

/** 加载任务对象池 */
@pkg_common.registerPool(LoadTask_Name, LoadTask)
class LoadTaskPool extends pkg_common.ObjectPool {
    public unuse(obj: LoadTask, ...args: any): void {
        obj.dispose()
    }
    public reuse(obj: LoadTask, ...args: any): void {
        let [tid, progess, complete, order] = [...args]
        obj.setTo(tid, progess, complete, order)
    }
}