import * as pkg_base from "../../../core/base/pkg_base"
import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"
import * as sub_loadtype from "../sub_loadtype"

/** 骨骼加载器 */
export class Skeletonloader implements pkg_loader.ILoader {
    /**
     * 加载
     * @param vo 
     */
    public load(vo: pkg_loader.LoadVO): void {
        // ccc资源
        if (vo.url.startsWith(sub_loadtype.CCC_RES)) {
            let url = vo.url.replace(sub_loadtype.CCC_RES, '')
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
        this._loadSkeleton(vo)
    }

    /**
     * 加载骨骼资源(非ccc打包出来的资源)
     * @param vo 
     */
    private _loadSkeleton(vo: pkg_loader.LoadVO): void {
        // 构建加载路径数组
        let url = vo.url,
            arr = [
                { url: url + ".json", type: "json" },
                { url: url + ".atlas", type: "atlas" }
            ]

        // 下载对应资源
        this._loadArr(arr,
            (error: string, result: { [url: string]: any }) => {
                // 下载失败
                if (error != null) {
                    vo.sendComplete(url, error, null)
                    return
                }

                // 构建骨骼对象
                let dirName = cc.path.dirname(url),
                    skeletonData = new sp.SkeletonData()

                // 设置骨骼数据
                skeletonData.skeletonJson = result[arr[0].url]
                skeletonData.atlasText = result[arr[1].url]

                // 获取纹理路径
                let textureNames: string[] = [],
                    texturePaths: string[] = [],
                    textureAtlas: TextureAtlas = new TextureAtlas()
                textureAtlas.parseData(skeletonData.atlasText, (name: string) => {
                    textureNames.push(name)
                    texturePaths.push(dirName + "/" + name)
                })

                // @ts-ignore
                skeletonData.textureNames = textureNames

                // 构建纹理加载路径数组
                let texUrls: { url: string, type: string }[] = []
                for (let i in texturePaths) {
                    let texPath = texturePaths[i]
                    texUrls.push({ url: texPath, type: "png" })
                }

                // 加载纹理
                let texture: cc.Texture2D[] = []
                this._loadArr(
                    texUrls,
                    (error, texResults: { [url: string]: any }) => {
                        // 下载失败
                        if (error != null) {
                            vo.sendComplete(url, error, null)
                            return
                        }

                        // 设置纹理
                        for (let j = 0; j < texUrls.length; j++) {
                            texture.push(texResults[texUrls[j].url])
                        }
                        skeletonData.textures = texture

                        // 加载完成
                        vo.sendComplete(url, null, skeletonData)
                    },
                    (progress: number) => {
                        vo.sendProgress(url, 0.5 + progress * 0.5)
                    }
                )
            },
            (progress: number) => {
                vo.sendProgress(url, progress * 0.5)
            }
        )
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

class TextureAtlas {
    public parseData(atlasText, textureLoader) {
        let reader = new TextureAtlasReader(atlasText)
        let tuple = new Array(4)
        let page = null

        while (true) {
            let line = reader.readLine()
            if (line == null)
                break
            line = line.trim()
            if (line.length == 0)
                page = null
            else if (!page) {
                page = {}
                page.name = line
                if (reader.readTuple(tuple) == 2) {
                    reader.readTuple(tuple)
                }
                reader.readTuple(tuple)
                reader.readValue()
                textureLoader(line)
            }
            else {
                reader.readValue()
                reader.readTuple(tuple)

                reader.readTuple(tuple)
                if (reader.readTuple(tuple) == 4) {
                    if (reader.readTuple(tuple) == 4) {
                        reader.readTuple(tuple)
                    }
                }
                reader.readTuple(tuple)
                reader.readValue()
            }
        }
    }
}

class TextureAtlasReader {
    private _index
    private _lines

    constructor(text) {
        this._index = 0
        this._lines = text.split(/\r\n|\r|\n/)
    }

    public readLine() {
        if (this._index >= this._lines.length)
            return null
        return this._lines[this._index++]
    }

    public readValue() {
        let line = this.readLine()
        let colon = line.indexOf(":")
        if (colon == -1) {
            pkg_base.logger.error("readValue:Invalid line|%v", line)
            return null
        }
        return line.substring(colon + 1).trim()
    }

    public readTuple(tuple) {
        let line = this.readLine()
        let colon = line.indexOf(":")
        if (colon == -1) {
            pkg_base.logger.error("readTuple:Invalid line|%v", line)
            return null
        }
        let i = 0, lastMatch = colon + 1
        for (; i < 3; i++) {
            let comma = line.indexOf(",", lastMatch)
            if (comma == -1)
                break
            tuple[i] = line.substr(lastMatch, comma - lastMatch).trim()
            lastMatch = comma + 1
        }
        tuple[i] = line.substring(lastMatch).trim()
        return i + 1
    };
}

