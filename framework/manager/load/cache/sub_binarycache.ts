import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"

/** binary缓存 */
export class BinaryCache extends pkg_loader.BaseCache {

    /** 获取数据 */
    public getData(): any {
        if (this._data instanceof cc.Asset) {
            return this._data["_nativeAsset"]
        }

        return this._data
    }

    /**
     * 销毁
     */
    public dispose(): void {
        pkg_engine.Asset().release(this._data)
        super.dispose()
    }
}