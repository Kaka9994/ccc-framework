import * as pkg_base from "../core/base/pkg_base"
import * as sub_imvc from "./sub_imvc"

/** 基础模型 */
export abstract class BaseModel implements sub_imvc.IModel {
    /** 模型名 */
    public name: string = ""
    /** 自动事件管理器 */
    public events: pkg_base.AutoEvents = new pkg_base.AutoEvents()

    /** 激活回调 */
    public abstract onActive(): void

    /** 退出通知 */
    public onExit(): void {
        this.events.clean()
    }
}