import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_utils from "../../../core/utils/pkg_utils"
import * as pkg_engine from "../../../engine/pkg_engine"
import * as sub_loadtype from "../sub_loadtype"

/** 纹理加载器 */
export class ImageLoader implements pkg_loader.ILoader {
    /**
     * 加载
     * @param vo 
     */
    public load(vo: pkg_loader.LoadVO): void {
        let cccRES = sub_loadtype.CCC_RES,
            url = vo.url.startsWith(cccRES) ? vo.url.replace(cccRES, '') : vo.url,
            filetype = pkg_utils.getFileExt(vo.url)
        pkg_engine.Asset().load(url, filetype != null ? filetype : "",
            (error: string, asset: any) => {
                if (error == null) {
                    // 尝试转换数据
                    try {
                        let tex2d: cc.Texture2D = null
                        if (asset instanceof ImageBitmap) {
                            tex2d = new cc.Texture2D()
                            tex2d.initWithElement(asset as any)
                        } else if (asset instanceof cc.Texture2D) {
                            tex2d = asset
                        }

                        if (tex2d != null) {
                            asset = new cc.SpriteFrame(tex2d)
                        }
                    } catch { }
                }
                vo.sendComplete(url, error, asset)
            },
            (progress: number) => {
                vo.sendProgress(url, progress)
            }
        )
    }
}