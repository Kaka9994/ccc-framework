import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_utils from "../../../core/utils/pkg_utils"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 预制体加载器 */
export class PrefabLoader implements pkg_loader.ILoader {
    /**
     * 加载
     * @param vo 
     */
    public load(vo: pkg_loader.LoadVO): void {
        let url = vo.url
        pkg_engine.Asset().load(url, vo.filetype,
            (error: string, asset: any) => {
                vo.sendComplete(url, error, asset)
            },
            (progress: number) => {
                vo.sendProgress(url, progress)
            }
        )
    }
}