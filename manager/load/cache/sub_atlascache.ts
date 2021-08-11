import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 图集缓存 */
export class AtlasCache extends pkg_loader.BaseCache {
    /**
     * 销毁
     */
    public dispose(): void {
        let tex2d: cc.Texture2D = this._data?.getTexture != null ? this._data?.getTexture() : null
        pkg_engine.Asset().release(tex2d)
        pkg_engine.Asset().release(this._data)
        super.dispose()
    }
}