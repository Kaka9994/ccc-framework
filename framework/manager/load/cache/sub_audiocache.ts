import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 音频缓存 */
export class AudioCache extends pkg_loader.BaseCache {
    /**
     * 销毁
     */
    public dispose(): void {
        pkg_engine.Asset().release(this._data)
        super.dispose()
    }
}