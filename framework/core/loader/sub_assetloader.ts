import * as pkg_base from "../base/pkg_base"
import * as pkg_common from "../common/pkg_common"
import * as pkg_utils from "../utils/pkg_utils"
import * as sub_assetcache from "./sub_assetcache"
import * as sub_iload from "./sub_iload"
import * as sub_loadenum from "./sub_loadenum"
import * as sub_loadtask from "./sub_loadtask"
import * as sub_loadvo from "./sub_loadvo"

const Asset_Loader_Round = "Asset_Loader_Round"

// TODO:失败重试

/** 
 * 资源加载类
 */
export class AssetLoader implements pkg_common.IRender, pkg_common.IDispose {
    /** 监听模块 */
    private _autoEvent: pkg_base.AutoEvents = null
    /** 缓存模块 */
    private _assetCache: sub_assetcache.AssetCache = null
    /** 加载器字典 <type, loader> */
    private _loaderDic: pkg_common.Dictionary<string, sub_iload.ILoader> = new pkg_common.Dictionary()
    /** 扩展名字典 <ext, type> */
    private _extDic: pkg_common.Dictionary<string, string> = new pkg_common.Dictionary()
    /** 任务字典 <tid, task> */
    private _taskDic: pkg_common.Dictionary<number, sub_loadtask.LoadTask> = new pkg_common.Dictionary()
    /** 绑定相同url的vo字典 <url, vid[]> */
    private _bindDic: pkg_common.Dictionary<string, string[]> = new pkg_common.Dictionary()
    /** 最多执行同时执行loader个数 */
    private _maxLoader: number = 0
    /** 缓存检测时间ms */
    private _cacheCheckTime: number = 0
    /** 是否已经初始化 */
    private _isInit: boolean = false
    /** 任务id队列 */
    private _taskQueue: number[] = []
    /** 加载中的url数组 */
    private _loadingUrlArr: string[] = []

    /**
     * 构造
     * @param max 最多执行同时加载个数
     * @param cacheCheckTime 缓存检测时间ms(每隔改时间开始检测缓存释放)
     */
    constructor(max: number = 10, cacheCheckTime: number = 10 * 1000) {
        [this._maxLoader, this._cacheCheckTime] = [max, cacheCheckTime]
    }

    /** 缓存模块 */
    public get caches(): sub_assetcache.AssetCache {
        return this._assetCache
    }

    /** 渲染 */
    public render(t: number, dt: number): void {
        if (this._isInit) {
            this._doLoadTask()
            this._doReleaseTask()
            this._assetCache.render(t, dt)
        }
    }

    /** 销毁 */
    public dispose(): void {
        if (this._autoEvent != null) {
            this._autoEvent.clean()
            this._autoEvent = null
        }
        if (this._assetCache != null) {
            this._assetCache.dispose()
            this._assetCache = null
        }
        this._loaderDic.clean()
        this._extDic.clean()
        let taskArr = this._taskDic.getValues()
        this._taskDic.clean()
        this._bindDic.clean()
        this._maxLoader = 0
        this._cacheCheckTime = 0
        this._isInit = false
        this._taskQueue.length = 0
        this._loadingUrlArr.length = 0

        // 回收任务
        taskArr.forEach((task: sub_loadtask.LoadTask) => {
            sub_loadtask.recoverLoadTask(task)
        })
    }

    /** 初始化 */
    public init(): void {
        this._isInit = true

        // 注册监听
        if (this._autoEvent == null) {
            this._autoEvent = new pkg_base.AutoEvents()
        }
        this._autoEvent.clean()
        this._autoEvent.add(sub_loadenum.EnumLoadEvent.PROGRESS, this._onProgress.bind(this))
        this._autoEvent.add(sub_loadenum.EnumLoadEvent.COMPLETE, this._onComplete.bind(this))
        this._autoEvent.add(sub_loadenum.EnumLoadEvent.GET_ASSET_CACHE, this._onGetAssetCache.bind(this))

        // 创建缓存模块
        if (this._assetCache == null) {
            this._assetCache = new sub_assetcache.AssetCache(this._cacheCheckTime)
        }
    }

    /**
     * 注册加载器
     * @param type 加载类型
     * @param loader 加载器
     */
    public registerLoader(type: string, loader: sub_iload.ILoader): void {
        this._loaderDic.setValue(type, loader)
    }

    /**
     * 注销加载器
     * @param type 加载类型
     */
    public unRegisterLoader(type: string): void {
        this._loaderDic.remove(type)
    }

    /**
     * 注册扩展名
     * @param ext 扩展名
     * @param type 加载类型
     */
    public registerExt(ext: string, type: string): void {
        this._extDic.setValue(ext, type)
    }

    /**
     * 注销扩展名
     * @param ext 扩展名
     */
    public unRegisterExt(ext: string): void {
        this._extDic.remove(ext)
    }

    /**
     * 注册缓存类型
     * @param type 缓存类型
     * @param clz 缓存类
     * @param lifetime 生存时间ms(引用为0时等待释放的时间)
     */
    public registerCache(type: string, clz: Function, lifetime?: number): void {
        this._assetCache.registerCache(type, clz, lifetime)
    }

    /**
     * 注销缓存类型
     * @param type 缓存类型
     */
    public unRegisterCache(type: string): void {
        this._assetCache.unRegisterCache(type)
    }

    /**
     * 加载
     * @param url 加载路径
     * @param progress 进度回调
     * @param complete 完成回调<url, err>
     * @param filetype 文件类型
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     * @return 加载任务id，用于取消加载
     */
    public load(
        url: string,
        progress: (n: number) => void = null,
        complete: (info: { [url: string]: string }) => void = null,
        filetype: string,
        order: number = 1
    ): number {
        // 创建加载任务
        let task = this._createTask(progress, complete, order)

        // 创建vo
        let vo = task.createVO(url, filetype)

        // 过滤无效vo
        if (vo == null) {
            // 回调
            let info = {}
            info[url] = "vo创建失败"
            complete(info)
            // 回收task
            sub_loadtask.recoverLoadTask(task)
            return -1
        }

        // 检测是否有其他加载任务含有相同的vo
        this._bindEqualUrl(url, vo.id)

        // 检测是否有缓存
        if (this._assetCache.hasRes(url)) {
            // 设置完成
            task.setVO2complete(vo.id)
            task.doComplete(vo.id, null)
            // 回收task
            sub_loadtask.recoverLoadTask(task)
            return -1
        }

        // 插入队列
        this._inserQueue(task)
        return task.id
    }

    /**
     * 加载资源组
     * @param group 加载组信息(url-filetype)
     * @param progress 进度回调
     * @param complete 完成回调<url, err>
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     * @return 加载任务id，用于取消加载
     */
    public loadGroup(
        group: { [url: string]: string },
        progress: (n: number) => void = null,
        complete: (info: { [url: string]: string }) => void = null,
        order: number = 1
    ): number {
        // 过滤无效加载信息
        if (pkg_utils.isEmpty(group)) {
            let errStr = "loadGroup:加载组信息无效"
            pkg_base.logger.error(errStr)

            // 回调
            let info = {}
            for (let url in group) {
                info[url] = errStr
            }
            complete(info)

            return -1
        }

        // 创建加载任务
        let task = this._createTask(progress, complete, order)

        // 创建vo
        let needLoad = Object.keys(group).length
        for (let url in group) {
            // 创建vo
            let filetype = group[url],
                vo = task.createVO(url, filetype)

            // 过滤无效vo
            if (vo == null) {
                // 回调
                let info = {}
                info[url] = "vo创建失败"
                complete(info)
                // 回收task
                sub_loadtask.recoverLoadTask(task)
                return -1
            }

            // 检测是否有其他加载任务含有相同的vo
            this._bindEqualUrl(url, vo.id)

            // 检测是否有缓存
            if (this._assetCache.hasRes(url)) {
                needLoad--
                // 设置完成
                task.setVO2complete(vo.id)
                task.doComplete(vo.id, null)
            }
        }

        // 所有资源都有缓存，不需要加载
        if (needLoad <= 0) {
            // 回收task
            sub_loadtask.recoverLoadTask(task)
            return -1
        }

        // 插入队列
        this._inserQueue(task)
        return task.id
    }

    /** 
     * 暂停加载任务
     * @param tid 任务id
     */
    public pauseTask(tid: number): void {
        // 过滤无效task
        let task = this._taskDic.getValue(tid)
        if (task == null) {
            pkg_base.logger.error("pauseTask:task无效")
            return
        }

        // 过滤非法状态
        if (!task.isValid()) {
            pkg_base.logger.error("pauseTask:task状态无效|%v", task.status)
            return
        }

        task.changeStatus(sub_loadenum.EnumLoadTaskStatus.PAUSE)
    }

    /** 
     * 恢复加载任务
     * @param tid 任务id
     */
    public resumeTask(tid: number): void {
        // 过滤无效task
        let task = this._taskDic.getValue(tid)
        if (task == null) {
            pkg_base.logger.error("resumeTask:task无效")
            return
        }

        // 尝试恢复任务
        task.tryResume()
    }

    /** 
     * 取消加载任务
     * @param tid 任务id
     */
    public cancelTask(tid: number): void {
        // 过滤无效task
        let task = this._taskDic.getValue(tid)
        if (task == null) {
            pkg_base.logger.error("cancelTask:task无效")
            return
        }

        // 过滤非法状态
        if (task.status == sub_loadenum.EnumLoadTaskStatus.COMPLETED ||
            task.status == sub_loadenum.EnumLoadTaskStatus.DISPOSE) {
            pkg_base.logger.error("cancelTask:task状态无效|%v", task.status)
            return
        }

        task.changeStatus(sub_loadenum.EnumLoadTaskStatus.CANCEL)
    }

    /**
     * 获取缓存
     * @param url 资源路径
     * @return 缓存
     */
    public getRes(url: string): sub_iload.ICache {
        if (this._assetCache == null) {
            return null
        }
        return this._assetCache.getRes(url)
    }

    /**
     * 创建一个加载任务
     * @param progress 进度回调
     * @param complete 完成回调<url, err>
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     * @return 加载任务
     */
    private _createTask(
        progress: (n: number) => void,
        complete: (info: { [url: string]: string }) => void,
        order: number
    ): sub_loadtask.LoadTask {
        // 构建Handler
        let progressHandler = pkg_common.createHandler(progress, null, null, false)
        let completeHandler = pkg_common.createHandler(complete)

        // 构建加载任务
        let task = sub_loadtask.createLoadTask(
            pkg_common.getRound(Asset_Loader_Round),
            progressHandler,
            completeHandler,
            order
        )

        // 设置状态为可以开始加载
        task.changeStatus(sub_loadenum.EnumLoadTaskStatus.READY)
        return task
    }

    /** 
     * 插入任务队列
     * @param task 任务
     */
    private _inserQueue(task: sub_loadtask.LoadTask): void {
        // 插入id队列
        this._taskQueue.push(task.id)
        for (let len = this._taskQueue.length, i = len - 2; i >= 0; i--) {
            let tid = this._taskQueue[i],
                t = this._taskDic.getValue(tid)
            // 过滤无效任务，从列表移除
            if (t == null) {
                len--
                this._taskQueue.splice(i, 1)
                continue
            }

            if (t.order <= task.order) {
                break
            }

            // 前移
            [this._taskQueue[i + 1], this._taskQueue[i]] =
                [this._taskQueue[i], this._taskQueue[i + 1]]
        }

        // 添加到dict
        this._taskDic.setValue(task.id, task)
    }

    /** 加载一个task */
    private _doLoadTask(): void {
        // 过滤加载上限、队列0任务
        if (this._loadingUrlArr.length >= this._maxLoader ||
            this._taskQueue.length <= 0) {
            return
        }

        // 按优先级查找可以加载的vo
        for (let i = 0; i < this._taskQueue.length; i++) {
            let tid = this._taskQueue[i],
                task = this._taskDic.getValue(tid)

            // 加载数量达到上限
            if (this._loadingUrlArr.length >= this._maxLoader) {
                continue
            }

            // 过滤无效状态
            if (!task.isActive()) {
                continue
            }

            // 获取task可以加载的vo
            let voArr = task.getReadyLoadVOs(),
                voCount = voArr.length,
                loadVoCount = 0

            // 遍历vo
            for (let j = 0; j < voCount; j++) {
                let vo = voArr[j]

                // 加载数量达到上限
                if (this._loadingUrlArr.length >= this._maxLoader) {
                    break
                }

                // 过滤重复加载
                if (this._loadingUrlArr.indexOf(vo.url) != -1) {
                    task.setVO2loading(vo.id)
                    continue
                }

                // 设置状态
                task.changeStatus(sub_loadenum.EnumLoadTaskStatus.LOADING)

                // 查找绑定vo
                let vids = this._bindDic.getValue(vo.url)
                vids = vids == null ? [] : vids
                vids.forEach((vid: string) => {
                    let ttid = sub_loadtask.LoadTask.getTidFromVid(vid),
                        t = this._taskDic.getValue(ttid)

                    // 修改vo状态
                    if (t != null && t.isValid()) {
                        t.setVO2loading(vid)
                    }
                })

                // 加载vo
                loadVoCount++
                this._loadingUrlArr.push(vo.url)
                this._doLoadVO(vo)
            }

            // 移除队列
            if (loadVoCount >= voCount) {
                this._taskQueue.splice(i, 1).length > 0 && i--
            }
        }
    }

    /** 
     * 加载一个vo
     * @param vo 加载vo
     */
    private _doLoadVO(vo: sub_loadvo.LoadVO): void {
        // 获取加载类型
        let type = vo.filetype
        if (pkg_utils.isEmpty(type)) {
            let ext = pkg_utils.getFileExt(vo.url)
            type = this._extDic.getValue(ext)
            type = type == null ? "None" : type
        }

        // 获取加载器
        let loader = this._loaderDic.getValue(type)

        // 过滤非法加载类型
        if (loader == null) {
            pkg_base.logger.error("_doLoadVO:未注册加载类型|%v", type)
            // 通知加载失败
            this._onComplete(vo.url, "未注册加载类型", null)
            return
        }

        // 加载
        loader.load(vo)
    }

    /** 回收任务 */
    private _doReleaseTask(): void {
        // 无需回收
        if (this._taskDic.count <= 0) {
            return
        }

        // 回收task
        let taskArr = [].concat(this._taskDic.getValues())
        taskArr.forEach((task: sub_loadtask.LoadTask) => {
            if (task.status == sub_loadenum.EnumLoadTaskStatus.COMPLETED ||
                task.status == sub_loadenum.EnumLoadTaskStatus.CANCEL) {
                this._taskDic.remove(task.id)
                this._taskQueue = pkg_utils.filterItem(this._taskQueue, task.id)
                sub_loadtask.recoverLoadTask(task)
            }
        })
    }

    /**
     * 加载进度回调
     * @param url 加载路径
     * @param progress 加载进度(0~1)
     */
    private _onProgress(url: string, progress: number): void {
        // 获取关联vo编号数组
        let vids = this._bindDic.getValue(url)
        vids = vids == null ? [] : vids
        let len = vids.length

        // 遍历关联vo
        for (let i = len - 1; i >= 0; i--) {
            let vid = vids[i],
                tid = sub_loadtask.LoadTask.getTidFromVid(vid),
                task = this._taskDic.getValue(tid)

            // 过滤无效任务
            if (task == null || !task.isValid()) {
                vids.splice(i, 1)
                continue
            }

            // 通知vo加载进度
            task.doProgress(vid, progress)
        }

        // 更新绑定
        if (len != vids.length) {
            this._bindDic.setValue(url, vids)
        }
    }

    /**
     * 加载完成回调
     * @param url 加载路径
     * @param err 加载错误信息
     * @param res 资源
     */
    private _onComplete(url: string, err: string, res: any): void {
        // 加载数量减一
        this._loadingUrlArr = pkg_utils.filterItem(this._loadingUrlArr, url)

        // 获取关联vo编号数组
        let vids = this._bindDic.getValue(url)
        vids = vids == null ? [] : vids
        let len = vids.length

        // 遍历关联vo
        let cacheOK = false
        for (let i = len - 1; i >= 0; i--) {
            let vid = vids[i],
                tid = sub_loadtask.LoadTask.getTidFromVid(vid),
                task = this._taskDic.getValue(tid)

            // 过滤无效任务
            if (task == null || !task.isValid()) {
                vids.splice(i, 1)
                continue
            }

            // 获取类型
            let vo = task.getVO(vid), filetype = ""
            if (vo != null) {
                filetype = vo.filetype
            }

            // 缓存资源
            if (pkg_utils.isEmpty(err) && !cacheOK) {
                // 获取加载类型
                if (filetype == "") {
                    let ext = pkg_utils.getFileExt(url)
                    filetype = this._extDic.getValue(ext)
                }

                this._assetCache.setRes(filetype, url, res)
                cacheOK = true
            }

            // 通知vo加载完成
            task.setVO2complete(vid)
            task.doComplete(vid, err)
        }

        // 更新绑定
        if (len != vids.length) {
            this._bindDic.setValue(url, vids)
        }
    }

    /**
     * 获取资源缓存回调
     * @param url 资源路径
     * @return 缓存
     */
    private _onGetAssetCache(url: string): sub_iload.ICache {
        return this._assetCache.getRes(url)
    }

    /**
     * 检测任务集合里是否有相同的加载路径，有则绑定对应vo
     * @param url 加载链接
     * @param args vo编号数组
     */
    private _bindEqualUrl(url: string, ...args: string[]): void {
        // 获取vid列表
        let vids = this._bindDic.getValue(url)
        if (vids == null) {
            vids = []
        }

        // 添加
        vids.push(...args)

        // 查找相同加载路径的vo
        let tasks = this._taskDic.getValues()
        for (let i = 0, len = tasks.length; i < len; i++) {
            let t = tasks[i], v = t.hasVOByUrl(url)
            if (v != null) {
                vids.push(v.id)
            }
        }

        // 去重
        vids = pkg_utils.filterRepeat(vids)
        this._bindDic.setValue(url, vids)
    }
}