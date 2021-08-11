import * as pkg_common from "../core/common/pkg_common"

/** 模型接口 */
export interface IModel {
    /** 模型名 */
    name: string

    /** 激活回调 */
    onActive(): void

    /** 退出通知 */
    onExit(): void
}

/** 视图接口 */
export interface IView {
    /** 视图名 */
    name: string

    /** 控制器引用 */
    controller: IController

    /** 激活回调 */
    onActive(): void

    /** 退出通知 */
    onExit(): void
}

/** 控制器接口 */
export interface IController extends pkg_common.IDispose {
    /** 控制器名 */
    name: string

    /** 视图引用 */
    view: IView

    /** 模型引用 */
    model: IModel

    /** 启动 */
    startUp(): void
}