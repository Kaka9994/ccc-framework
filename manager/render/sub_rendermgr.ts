import * as pkg_base from "../../core/base/pkg_base"
import * as pkg_common from "../../core/common/pkg_common"
import * as pkg_imgr from "../interface/pkg_imgr"
import * as pkg_loadmgr from "../load/pkg_loadmgr"
import * as pkg_soundmgr from "../sound/pkg_soundmgr"
import * as sub_rendertype from "./sub_rendertype"

/** 渲染管理器 */
export class RenderManager implements pkg_common.IDispose {
    /** 管理器字典 <name, mgrArr> */
    private _mgrDic: pkg_common.Dictionary<number, pkg_imgr.IMgr[]> = new pkg_common.Dictionary<number, pkg_imgr.IMgr[]>()

    /** 
     * 渲染
     * @param t 当前时间
     * @param dt 间隔时间
     * @param type 渲染类型
     */
    public render(t: number, dt: number, type: number = sub_rendertype.RenderType.DEF): void {
        let mgrArr = this._mgrDic.getValue(type)
        if (mgrArr != null && mgrArr.length > 0) {
            for (let i = 0, len = mgrArr.length; i < len; i++) {
                let mgr = mgrArr[i]
                mgr.render(t, dt)
            }
        }
    }

    /** 销毁 */
    public dispose(): void {
        let mgrArrs = this._mgrDic.getValues()
        for (let i = 0, len1 = mgrArrs.length; i < len1; i++) {
            let mgrArr = mgrArrs[i]
            for (let j = 0, len2 = mgrArr.length; j < len2; j++) {
                let mgr = mgrArr[j]
                if ("dispose" in mgr) {
                    mgr.dispose()
                }
            }
        }
        this._mgrDic.clean()
    }

    /** 初始化 */
    public init(): void {
        // 添加管理器
        this.addToRender(pkg_loadmgr.LoadManager.me)
        this.addToRender(pkg_soundmgr.SoundManager.me)
    }

    /**
     * 添加需要渲染的对象
     * @param obj 对象
     * @param type 渲染类型
     */
    public addToRender(obj: any, type: number = sub_rendertype.RenderType.DEF): void {
        // 过滤无效参数
        if (!("render" in obj)) {
            pkg_base.logger.error("addToRender:过滤无效参数")
            return
        }

        // 获取控制器数组
        let mgrArr = this._mgrDic.getValue(type)
        if (mgrArr == null) {
            mgrArr = []
            this._mgrDic.setValue(type, mgrArr)
        }

        // 添加控制器
        mgrArr.push(obj)
    }

    /**
     * 从渲染中移除对象
     * @param obj 对象
     * @param type 渲染类型
     */
    public remveToRender(obj: any, type: number = sub_rendertype.RenderType.DEF): void {
        // 过滤无效参数
        if (!("render" in obj)) {
            pkg_base.logger.error("addToRender:过滤无效参数")
            return
        }

        // 获取控制器数组
        let mgrArr = this._mgrDic.getValue(type)
        if (mgrArr != null && mgrArr.length > 0) {
            for (let i = 0, len = mgrArr.length; i < len; i++) {
                if (obj == mgrArr[i]) {
                    mgrArr.splice(i, 1)
                    return
                }
            }
        }
    }
}