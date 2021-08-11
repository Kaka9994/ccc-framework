import { impl } from "./pkg_engineimpl"

/** 资源管理接口 */
export interface IEngineAsset {
    /**
     * 资源加载
     * @param url 资源地址
     * @param filetype 资源类型
     * @param complete 完成回调 
     * @param progress 进度回调
     */
    load(
        url: string, 
        filetype: string, 
        complete: (error: string, asset: any) => void,
        progress: (n: number) => void
    ): void
    
    /**
     * 缓存释放
     * @param asset 资源
     */
    release(asset: any): void
}

/**
 * 获取资源管理接口
 * @return 资源管理接口
 */
export function Asset(): IEngineAsset {
    return gAsset
}

// 全局对象
let gAsset: IEngineAsset = impl.Asset