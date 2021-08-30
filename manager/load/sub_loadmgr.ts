import * as pkg_base from "../../core/base/pkg_base"
import * as pkg_loader from "../../core/loader/pkg_loader"
import * as pkg_imgr from "../interface/pkg_imgr"
import * as sub_loadtype from "./sub_loadtype"
import { AtlasLoader } from "./loader/sub_atlasloader"
import { AtlasCache } from "./cache/sub_atlascache"
import { AudioLoader } from "./loader/sub_audioloader"
import { AudioCache } from "./cache/sub_audiocache"
import { BinaryCache } from "./cache/sub_binarycache"
import { BinaryLoader } from "./loader/sub_binaryloader"
import { BundleLoader } from "./loader/sub_bundleloader"
import { BundleCache } from "./cache/sub_bundlecache"
import { ImageCache } from "./cache/sub_imagecache"
import { ImageLoader } from "./loader/sub_imageloader"
import { PrefabLoader } from "./loader/sub_prefabloader"
import { PrefabCache } from "./cache/sub_prefabcache"
import { Skeletonloader } from "./loader/sub_skeletonloader"
import { SkeletonCache } from "./cache/sub_skeletoncache"
import { TextLoader } from "./loader/sub_textloader"
import { TextCache } from "./cache/sub_textcache"

/** 加载管理器 */
export class LoadManager implements pkg_imgr.IMgr {
    /** 单例 */
    private static _me: LoadManager = null
    /** 资源加载器 */
    private _assetloader: pkg_loader.AssetLoader = null

    /** 单例 */
    public static get me(): LoadManager {
        if (this._me == null) {
            this._me = new LoadManager()
            this._me.init()
        }
        return this._me
    }

    /** 渲染 */
    public render(t: number, dt: number): void {
        if (this._assetloader != null) {
            this._assetloader.render(t, dt)
        }
    }

    /** 销毁 */
    public dispose(): void {
        if (this._assetloader != null) {
            this._assetloader.dispose()
        }
    }

    /** 初始化 */
    public init(): void {
        // 创建资源加载器
        this._assetloader = new pkg_loader.AssetLoader()
        this._assetloader.init()

        // 注册扩展名
        this._registerExt(["mp3", "ogg", "wav", "m4a"], sub_loadtype.EnumLoadType.Audio)
        this._registerExt(["binary"], sub_loadtype.EnumLoadType.Buffer)
        this._registerExt(["png", "jpg"], sub_loadtype.EnumLoadType.Image)
        this._registerExt(["txt", "xml", "json"], sub_loadtype.EnumLoadType.Text)

        // 注册纹理加载器\缓存类型
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Atlas, new AtlasLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Atlas, AtlasCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Audio, new AudioLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Audio, AudioCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Buffer, new BinaryLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Buffer, BinaryCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Bundle, new BundleLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Bundle, BundleCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Image, new ImageLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Image, ImageCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Prefab, new PrefabLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Prefab, PrefabCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Skeleton, new Skeletonloader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Skeleton, SkeletonCache, 60 * 10 * 1000)
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.Text, new TextLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.Text, TextCache, 60 * 10 * 1000)

        // 默认加载器
        this._assetloader.registerLoader(sub_loadtype.EnumLoadType.None, new BinaryLoader())
        this._assetloader.registerCache(sub_loadtype.EnumLoadType.None, BinaryCache, 60 * 10 * 1000)
    }

    /**
     * 加载
     * @description 若需要加载ccc构建的资源，资源路径需要加上"ccc/"
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
        filetype: sub_loadtype.EnumLoadType = sub_loadtype.EnumLoadType.None,
        order: number = 1
    ): number {
        // 过滤无效参数
        if (this._assetloader == null) {
            let error = "load:资源加载器无效"
            pkg_base.logger.error(error)

            // 回调
            let info = {}
            info[url] = error
            complete(info)
            return -1
        }
        return this._assetloader.load(url, progress, complete, filetype, order)
    }


    /**
     * 加载资源组
     * @description 若需要加载ccc构建的资源，资源路径需要加上"ccc/"
     * @param group 加载组信息(url-filetype)
     * @param progress 进度回调
     * @param complete 完成回调<url, err>
     * @param order 优先级(越小优先级越高-1|0|1|2|3)
     * @return 加载任务id，用于取消加载
     */
    public loadGroup(
        group: { [url: string]: sub_loadtype.EnumLoadType },
        progress: (n: number) => void = null,
        complete: (info: { [url: string]: string }) => void = null,
        order: number = 1
    ): number {
        // 过滤无效参数
        if (this._assetloader == null) {
            let error = "loadGroup:资源加载器无效"
            pkg_base.logger.error(error)

            // 回调
            let info = {}
            for (let url in group) {
                info[url] = error
            }
            complete(info)
            return -1
        }
        return this._assetloader.loadGroup(group, progress, complete, order)
    }

    /**
     * 获取缓存
     * @param url 资源路径
     * @return 缓存
     */
     public getRes(url: string): pkg_loader.ICache {
        // 过滤无效参数
        if (this._assetloader == null) {
            pkg_base.logger.error("getRes:资源加载器无效")
            return null
        }
        return this._assetloader.getRes(url)
    }

    /**
     * 注册扩展名
     * @param extArr 扩展名数组
     * @param type 加载类型
     */
    private _registerExt(extArr: string[], type: sub_loadtype.EnumLoadType): void {
        if (this._assetloader != null && Array.isArray(extArr)) {
            extArr.forEach((ext: string) => {
                this._assetloader.registerExt(ext, type)
            })
        }
    }
}