import * as pkg_common from "../common/pkg_common"
import * as sub_loadvo from "./sub_loadvo"

/** 加载器接口 */
export interface ILoader {
    /** 
     * 加载
     * @param vo 加载vo
     */
    load(vo: sub_loadvo.LoadVO): void
}

/** 缓存接口 */
export interface ICache extends pkg_common.IDispose {
    /** 获取数据 */
    getData(): any

    /**
     * 设置数据
     * @param url 资源路径
     * @param res 资源
     */
    setData(url: string, res: any): void

    /**
     * 设置生存时间
     * @param lifetime 生存时间
     */
    setLifetime(lifetime: number): void

    /**
     * 持有一次
     */
    addRef(): void

    /**
     * 放开一次持有
     */
    decRef(): void

    /**
     * 尝试释放资源
     */
    tryRelease(): boolean
}