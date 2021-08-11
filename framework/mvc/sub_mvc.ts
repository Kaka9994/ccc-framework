import * as pkg_base from "../core/base/pkg_base"
import * as pkg_common from "../core/common/pkg_common"
import * as pkg_utils from "../core/utils/pkg_utils"
import * as sub_imvc from "./sub_imvc"

/**
 * 注册mvc
 * @param name 
 * @param build 
 */
export function register(name: string, build: () => { m: sub_imvc.IModel, v: sub_imvc.IView, c: sub_imvc.IController }): void {
    gMCV.register(name, build)
}

/**
 * 获取控制器
 * @param name 组名
 * @return 控制器
 */
export function getController(name: string): sub_imvc.IController {
    return gMCV.getController(name)
}

/**
 * 加载mvc
 * @param name 组名
 * @return 控制器
 */
export function loadMVC(name: string): sub_imvc.IController {
    return gMCV.loadMVC(name)
}

/**
 * 销毁mvc
 * @param name 组名
 */
export function disposeMVC(name: string): void {
    gMCV.disposeMVC(name)
}

/** MVC管理对象 */
class MVCMananger {
    /** mvc注册记录集合 */
    private _mvcs: pkg_common.Dictionary<string, () => { m: sub_imvc.IModel, v: sub_imvc.IView, c: sub_imvc.IController }> =
        new pkg_common.Dictionary<string, () => { m: sub_imvc.IModel, v: sub_imvc.IView, c: sub_imvc.IController }>()
    /** 运行中的控制器集合 */
    private _controllers: pkg_common.Dictionary<string, sub_imvc.IController> = new pkg_common.Dictionary<string, sub_imvc.IController>()

    /**
     * 注册mvc
     * @param name 组名
     * @param build 构建方法(m:模型，v:视图，c:控制器)
     */
    public register(name: string, build: () => { m: sub_imvc.IModel, v: sub_imvc.IView, c: sub_imvc.IController }): void {
        // 过滤无效参数
        if (pkg_utils.isEmpty(name) || typeof build !== "function") {
            pkg_base.logger.error("register:参数无效")
            return
        }

        this._mvcs.setValue(name, build)
    }

    /**
     * 获取控制器
     * @param name 组名
     * @return 控制器
     */
    public getController(name: string): sub_imvc.IController {
        return this._controllers.getValue(name)
    }

    /**
     * 加载mvc
     * @param name 组名
     * @return 控制器
     */
    public loadMVC(name: string): sub_imvc.IController {
        // 过滤无效参数
        if (pkg_utils.isEmpty(name)) {
            pkg_base.logger.error("loadMVC:参数无效")
            return null
        }

        // 过滤未注册
        let build = this._mvcs.getValue(name)
        if (build == null) {
            pkg_base.logger.error("loadMVC:未注册|%v", name)
            return null
        }

        // 构建
        let result = build()
        if (result == null) {
            pkg_base.logger.error("loadMVC:构建失败|%v", name)
            return null
        }

        // 组装
        let m = result.m, v = result.v, c = result.c
        m.name = name + "Model"
        v.name = name + "View"
        c.name = name + "Controller"
        c.model = m
        c.view = v
        v.controller = c

        // 记录
        this._controllers.setValue(name, c)

        // 启动
        c.startUp()

        return c
    }

    /**
     * 销毁mvc
     * @param name 组名
     */
    public disposeMVC(name: string): void {
        // 过滤无效参数
        if (pkg_utils.isEmpty(name)) {
            pkg_base.logger.error("disposeMVC:参数无效")
            return null
        }

        // 过滤无效mvc
        let c = this._controllers.getValue(name)
        if (c == null) {
            pkg_base.logger.error("disposeMVC:MVC未启动|%v", name)
            return
        }

        // 销毁
        this._controllers.remove(name)
        c.dispose()
    }
}

// 初始化
let gMCV = new MVCMananger()