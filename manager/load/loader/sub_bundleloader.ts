import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"
import * as sub_loadtype from "../sub_loadtype"

/** bundle加载器 */
export class BundleLoader implements pkg_loader.ILoader {
    /**
     * 加载
     * @param vo 
     */
    public load(vo: pkg_loader.LoadVO): void {
        let cccRES = sub_loadtype.CCC_RES,
            url = vo.url,
            loadUrl = vo.url.startsWith(cccRES) ? vo.url.replace(cccRES, '') : vo.url,
            filetype = vo.filetype
        pkg_engine.Asset().load(loadUrl, filetype,
            (error: string, asset: any) => {
                vo.sendComplete(url, error, asset)
            },
            (progress: number) => {
                vo.sendProgress(url, progress)
            }
        )
    }
}