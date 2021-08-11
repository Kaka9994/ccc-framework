import * as pkg_loader from "../../../core/loader/pkg_loader"
import * as pkg_utils from "../../../core/utils/pkg_utils"
import * as pkg_engine from "../../../engine/pkg_engine"

/** 文本缓存 */
export class TextCache extends pkg_loader.BaseCache {

    /** 保存解析后的json数据 */
    private _json: any = null

    /** 获取数据 */
    public getData(): any {
        // 扩展名
        let filetype = pkg_utils.getFileExt(this._url)

        // json
        if (filetype == "json") {
            // 尝试解析
            if (typeof this._data === "string") {
                try {
                    this._json = JSON.parse(this._data)
                } catch { }
            } else if (this._data instanceof cc.JsonAsset) {
                this._json = this._data.json
            } else {
                this._json = this._data
            }

            return this._json
        }

        // xml TODO
        if (filetype == "xml") {
            if (this._data instanceof cc.TextAsset) {
                return this._data.text
            }
        }

        // txt
        if (filetype == "txt") {
            if (this._data instanceof cc.TextAsset) {
                return this._data.text
            }
        }

        return this._data
    }

    /**
     * 销毁
     */
    public dispose(): void {
        pkg_engine.Asset().release(this._data)
        this._json = null
        super.dispose()
    }
}