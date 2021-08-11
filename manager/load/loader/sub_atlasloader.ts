import * as pkg_base from "../../../core/base/pkg_base"
import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_utils from "../../../core/utils/pkg_utils"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 图集加载器 */
export class AtlasLoader implements pkg_loader.ILoader {
    /**
     * 加载
     * @param vo 
     */
    public load(vo: pkg_loader.LoadVO): void {
        // ccc资源
        let slashIndex = vo.url.indexOf('/'),
            bundlename = vo.url.substr(0, slashIndex),
            bundle = cc.assetManager.getBundle(bundlename)
        if (bundle != null) {
            let url = vo.url
            pkg_engine.Asset().load(url, vo.filetype,
                (error, asset) => {
                    vo.sendComplete(url, error, asset)
                },
                (progress: number) => {
                    vo.sendProgress(url, progress)
                }
            )
            return
        }

        // 其他资源
        this._loadAtlas(vo)
    }

    /**
     * 加载图集资源(非ccc打包出来的资源)
     * @param vo 
     */
    private _loadAtlas(vo: pkg_loader.LoadVO): void {
        // 构建加载路径数组
        let url = vo.url,
            arr = [
                { url: url + ".png", type: "png" },
                { url: url + ".plist", type: "plist" }
            ]

        // 下载对应资源
        this._loadArr(arr,
            (error: string, result: { [url: string]: any }) => {
                // 下载失败
                if (error != null) {
                    vo.sendComplete(url, error, null)
                    return
                }

                let texture: cc.Texture2D = result[arr[0].url]
                let plist: { frames: any, metadata: any } = result[arr[1].url]

                // 资源错误
                if (texture == null || plist == null) {
                    vo.sendComplete(url, "获取 altas 信息失败", null)
                    return
                }

                let frameList = this._addSpriteFramesWithPlist(plist, texture),
                    spriteAtlas = new cc.SpriteAtlas()
                    spriteAtlas["_spriteFrames"] = frameList
                
                vo.sendComplete(url, null, spriteAtlas)
            },
            (progress: number) => {
                vo.sendProgress(url, progress)
            }
        )
    }

    /**
     * 添加图集纹理
     * @param plist 图集信息
     * @param texture 纹理
     */
    private _addSpriteFramesWithPlist(plist: { frames: any, metadata: any }, texture: cc.Texture2D): object {
        let framesInfo = plist.frames
        let metadata = plist.metadata
        let spriteFrameList = {}

        if (framesInfo == null || metadata == null) {
            pkg_base.logger.error("_addSpriteFramesWithPlist:图集信息错误")
            return []
        }

        let format = parseInt(metadata.format),
            tmpSize = this._getArrayFromStr(metadata.size),
            textureSize = cc.size(tmpSize[0], tmpSize[1])

        let spriteFrameName: string = null
        let spriteFrame: cc.SpriteFrame = null
        for (let key in framesInfo) {
            spriteFrameName = key
            let frameObj = framesInfo[key]

            switch (format) {
                case 0: {
                    break
                }
                case 1:
                case 2: {
                    let tmpFrame = this._getArrayFromStr(frameObj.frame),
                        frame = cc.rect(tmpFrame[0][0], tmpFrame[0][1], tmpFrame[1][0], tmpFrame[1][1])
                    let tmpOffset = this._getArrayFromStr(frameObj.offset),
                        offest = cc.v2(tmpOffset[0], tmpOffset[1])
                    let tmpSourceSize = this._getArrayFromStr(frameObj.sourceSize),
                        sourceSize = cc.size(tmpSourceSize[0], tmpSourceSize[1])
                    let rotated: boolean = frameObj.rotated

                    spriteFrame = new cc.SpriteFrame()
                    spriteFrame.setTexture(texture, frame, rotated, offest, sourceSize)
                    break
                }
                case 3: {
                    let tmpSpriteSize = this._getArrayFromStr(frameObj.spriteSize),
                        spriteSize = cc.size(tmpSpriteSize[0], tmpSpriteSize[1])
                    let tmpSpriteOffset = this._getArrayFromStr(frameObj.spriteOffset),
                        spriteOffset = cc.v2(tmpSpriteOffset[0], tmpSpriteOffset[1])
                    let tmpSpriteSourceSize = this._getArrayFromStr(frameObj.spriteSourceSize),
                        spriteSourceSize = cc.size(tmpSpriteSourceSize[0], tmpSpriteSourceSize[1])
                    let tmpTextureRect = this._getArrayFromStr(frameObj.textureRect),
                        textureRect = cc.rect(tmpTextureRect[0][0], tmpTextureRect[0][0], tmpTextureRect[1][0], tmpTextureRect[1][1])
                    let textureRotated: boolean = frameObj.textureRotated

                    spriteFrame = new cc.SpriteFrame()
                    spriteFrame.setTexture(
                        texture,
                        new cc.Rect(textureRect.origin.x, textureRect.origin.y, spriteSize.width, spriteSize.height),
                        textureRotated,
                        spriteOffset,
                        spriteSourceSize
                    )
                    break
                }
            }

            spriteFrameList[spriteFrameName] = spriteFrame
        }

        return spriteFrameList
    }

    /**
     * 字符串转数组(将"{0, 1}"这种类型的字符串转换成数组[0, 1])
     * @param str 字符串
     * @return 数组
     */
    private _getArrayFromStr(str: string): any[] {
        // 过滤无效参数
        if (pkg_utils.isEmpty(str) || typeof str !== "string") {
            return []
        }

        str = str.replace(/{/g, '[').replace(/}/g, ']')

        // 尝试转换
        try {
            return JSON.parse(str)
        } catch {
            return []
        }
    }

    /**
     * 加载复数链接
     * @param arr 链接数组
     * @param complete 完成回调
     * @param progress 进度回调
     */
    private _loadArr(arr: { url: string, type: string }[],
        complete: (error: string, result: { [url: string]: any }) => void,
        progress: (progress: number) => void): void {
        // 过滤
        if (arr == null || arr.length <= 0) {
            complete("_loadArr:array is empty", null)
            return
        }

        let results: { [url: string]: any } = {},
            index = 0

        // 构建加载函数
        let doLoad = (url: string, type: string) => {
            pkg_engine.Asset().load(url, type,
                (error: string, asset: any) => {
                    // 加载错误
                    if (error != null) {
                        complete(error, null)
                        return
                    }

                    // 纹理资源
                    if (asset instanceof ImageBitmap) {
                        let tex2d = new cc.Texture2D()
                        tex2d.initWithElement(asset as any)
                        asset = tex2d
                    }

                    // 记录
                    results[url] = asset
                    let info = arr[++index]

                    // 全部加载成功
                    if (info == null) {
                        complete(null, results)
                        return;
                    }

                    // 加载下一个
                    doLoad(info.url, info.type)
                },
                (n: number) => {
                    progress((index / arr.length) + (1 / arr.length) * n)
                }
            )
        }

        // 执行
        doLoad(arr[index].url, arr[index].type);
    }
}