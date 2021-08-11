import * as pkg_base from "../core/base/pkg_base"
import * as sub_imvc from "./sub_imvc"

/** 基础控制器 */
export class BaseController implements sub_imvc.IController {
    /** 控制器名 */
    public name: string = ""

    /** 视图引用 */
    public view: sub_imvc.IView = null

    /** 模型引用 */
    public model: sub_imvc.IModel = null

    /** 启动 */
    public startUp(): void {
        // 过滤无效参数
        if (this.view == null ||
            this.model == null) {
            pkg_base.logger.error("startUp:启动失败|%v", this.name)
            return
        }

        this.view.onActive()
        this.model.onActive()
    }

    /** 销毁 */
    public dispose(): void {
        if (this.view != null) {
            this.view.onExit()
            this.view = null
        }
        if (this.model != null) {
            this.model.onExit()
            this.model = null
        }
    }
}