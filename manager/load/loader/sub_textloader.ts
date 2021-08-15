import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_utils from "../../../core/utils/pkg_utils"
import * as pkg_engine from "../../../engine/pkg_engine"
import * as sub_loadtype from "../sub_loadtype"

/** 文本加载器 */
export class TextLoader implements pkg_loader.ILoader {
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
                vo.sendComplete(url, error, asset)
            },
            (progress: number) => {
                vo.sendProgress(url, progress)
            }
        )
    }
}