
/** 加载任务状态 */
export enum EnumLoadTaskStatus {
    /** 任务可以开始 */
	READY = 0,
	/** 任务加载中 */
	LOADING = 1,
    /** 任务加载完成 */
	COMPLETED = 2,
    /** 任务被暂停 */
	PAUSE = 3,
    /** 任务回收 */
	DISPOSE = 4,
    /** 任务取消 */
	CANCEL = 5,
}

/** 加载事件枚举 */
export enum EnumLoadEvent {
    /** 加载进度事件 */
    PROGRESS = "Asset_Load_Progress",
    /** 加载完成事件 */
    COMPLETE = "Asset_Load_Complete",
	/** 获取资源缓存(解耦assetload，不需要引用assetload就能拿到缓存数据，业务代码禁止使用) */
	GET_ASSET_CACHE = "Get_Asset_Cache"
}