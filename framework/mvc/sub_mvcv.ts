import * as pkg_base from "../core/base/pkg_base"
import * as sub_imvc from "./sub_imvc"

/** 基础视图 */
export abstract class BaseView implements sub_imvc.IView {
    /** 视图名 */
    public name: string = ""

    /** 控制器引用 */
    public controller: sub_imvc.IController = null

    /** 视图容器(即视图根节点) */
    public container: any = null

    /** 激活回调 */
    public abstract onActive(): void

    /** 退出通知 */
    public abstract onExit(): void
}