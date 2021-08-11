import * as pkg_utils from "../../core/utils/pkg_utils"

export { gAsset as Asset }

/** 资源管理实现 */
class CCC245Asset {
    /**
     * 资源加载
     * @param url 资源地址
     * @param filetype 资源类型
     * @param complete 完成回调 
     * @param progress 进度回调
     */
    public load(
        url: string,
        filetype: string,
        complete: (error: string, asset: any) => void,
        progress: (n: number) => void
    ): void {
        // bundle资源
        if (filetype == "bundle") {
            cc.assetManager.loadBundle(url,
                (err: Error, bundle: cc.AssetManager.Bundle) => {
                    progress(1)
                    complete(err ? err.toString() : null, bundle)
                },
            )
            return
        }

        // http资源｜blob资源
        if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:")) {
            cc.assetManager.loadAny({ url: url, type: filetype },
                (finished: number, total: number) => {
                    progress(finished / total)
                },
                (err, res) => {
                    complete(err ? err.toString() : null, res)
                })
            return
        }

        // resources下的资源｜bundle下的资源
        let slashIndex = url.indexOf('/'),
            bundlename = url.substr(0, slashIndex),
            bundle = cc.assetManager.getBundle(bundlename)
        if (bundle != null) {
            let loadurl = url.substr(slashIndex + 1), assetType = null

            // skeleton资源
            if (filetype == "skeleton") {
                assetType = sp.SkeletonData
            } 
            // atlas资源
            else if (filetype == "atlas") {
                assetType = cc.SpriteAtlas
            } 
            // 其他
            else {
                loadurl = pkg_utils.replaceFinal(loadurl, `.${filetype}`, "")
            }

            let args = pkg_utils.filterItem<any>([
                loadurl, assetType,
                (finished: number, total: number) => {
                    progress(finished / total)
                },
                (err, res) => {
                    complete(err ? err.toString() : null, res)
                }
            ], null)

            // @ts-ignore
            bundle.load(...args)
            return
        }

        // 其他(native环境下非ccc打包的资源)
        if (cc.sys.isNative && jsb.fileUtils.isFileExist(url)) {
            cc.assetManager.loadAny({ url: url, type: filetype },
                (finished: number, total: number) => {
                    progress(finished / total)
                },
                (err, res) => {
                    complete(err ? err.toString() : null, res)
                })
        }
    }
    
    /**
     * 缓存释放
     * @param asset 资源
     */
    public release(asset: any): void {
        cc.assetManager.releaseAsset(asset)
    }
}

// 初始化
let gAsset = new CCC245Asset()