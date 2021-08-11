import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 骨骼缓存 */
export class SkeletonCache extends pkg_loader.BaseCache {
    /**
     * 销毁
     */
    public dispose(): void {
        let tex2ds: cc.Texture2D[] = this._data?.textures ? this._data?.textures : []
        for (let i = 0, len = tex2ds.length; i < len; i++) {
            pkg_engine.Asset().release(tex2ds[i])
        }
        pkg_engine.Asset().release(this._data)
        super.dispose()
    }
}