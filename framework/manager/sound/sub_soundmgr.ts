import * as pkg_base from "../../core/base/pkg_base"
import * as pkg_common from "../../core/common/pkg_common"
import * as pkg_utils from "../../core/utils/pkg_utils"
import * as pkg_engine from "../../engine/pkg_engine"
import * as pkg_loadmgr from "../load/pkg_loadmgr"
import * as sub_soundstate from "./sub_soundstate"
import * as sub_soundvo from "./sub_soundvo"

/** 声音管理器 */
export class SoundManager implements pkg_common.IRender, pkg_common.IDispose {
    /** 单例 */
    private static _me: SoundManager = null
    /** vo字典 <id, soundvo> */
    private _voDic: pkg_common.Dictionary<number, sub_soundvo.SoundVO> = new pkg_common.Dictionary<number, sub_soundvo.SoundVO>()
    /** BGM vo */
    private _bgmVO: sub_soundvo.SoundVO = null
    /** BGM音量 */
    private _bgmVolume: number = 1
    /** 效果音量 */
    private _effectVolume: number = 1
    /** 计时时间ms */
    private _time: number = 0
    /** 检测时间ms */
    private _checkTime: number = 5000
    /** 准备id字典 <id, isPause> */
    private _prepareIDs: pkg_common.Dictionary<number, boolean> = new pkg_common.Dictionary<number, boolean>()
    /** 是否有效 */
    private _isValid: boolean = true

    /** 单例 */
    public static get me(): SoundManager {
        if (this._me == null) {
            this._me = new SoundManager()
        }
        return this._me
    }

    /** BGM vo */
    public get bgmVO(): sub_soundvo.SoundVO {
        return this._bgmVO
    }

    /** BGM音量 */
    public get bgmVolume(): number {
        return this._bgmVolume
    }

    /** 效果音量 */
    public get effectVolume(): number {
        return this._effectVolume
    }

    /** 渲染 */
    public render(t: number, dt: number): void {
        // 过滤无效
        if (!this._isValid) {
            return
        }

        this._doPlay()
        this._time += dt
        if (this._time >= this._checkTime) {
            this._time = 0
            this._doCleanFail()
        }
    }

    /** 销毁 */
    public dispose(): void {
        this._bgmVO = null
        this._bgmVolume = 1
        this._effectVolume = 1
        this._time = 0
        this._checkTime = 5000
        this._prepareIDs.clean()
        this._isValid = false

        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]
            this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
        }
    }

    /** 唤醒(应用进入前台) */
    public doWakeUp(): void {
        if (cc.sys.isBrowser) {
            // iOS web home后再回到cocos，state=='interrupted'
            if (!cc.sys["__audioSupport"].context.state ||
                cc.sys["__audioSupport"].context.state != "running") {
                cc.sys["__audioSupport"].context.resume()
            }
        }
    }

    /**
     * 播放BGM
     * @param url 资源链接
     * @return vo编号
     */
    public playBGM(url: string): number {
        let id = this.play(url, true, this._bgmVolume, null, true)
        this._bgmVO = this._voDic.getValue(id)
        return id
    }

    /**
     * 播放效果音
     * @param url 资源链接
     * @param complete 播放完成回调
     * @return vo编号
     */
    public playEffect(
        url: string,
        complete: () => void
    ): number {
        return this.play(url, false, this._effectVolume, complete, false)
    }

    /** 停止BGM */
    public stopBGM(): void {
        if (this._bgmVO != null) {
            this.stop(this._bgmVO.id)
        }
    }

    /** 停止所有效果音 */
    public stopAllEffect(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]
            if (vo != this._bgmVO) {
                this.stop(vo.id)
            }
        }
    }

    /** 暂停BGM */
    public pauseBGM(): void {
        if (this._bgmVO != null) {
            this.pause(this._bgmVO.id)
        }
    }

    /** 暂停所有效果音 */
    public pauseAllEffect(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]
            if (vo != this._bgmVO) {
                this.pause(vo.id)
            }
        }
    }

    /** 恢复BGM */
    public resumeBGM(): void {
        if (this._bgmVO != null) {
            this.resume(this._bgmVO.id)
        }
    }

    /** 恢复所有效果音 */
    public resumeAllEffect(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]
            if (vo != this._bgmVO) {
                this.resume(vo.id)
            }
        }
    }

    /**
     * 播放
     * @param url 资源链接
     * @param loop 是否循环
     * @param complete 播放完成回调
     * @param isBreak 是否打断
     * @return vo编号
     */
     public play(
        url: string,
        loop: boolean,
        volume: number,
        complete: () => void,
        isBreak: boolean = false,
    ): number {
        let vo = sub_soundvo.createSoundVO(url, loop, volume, complete, isBreak)

        // 打断
        if (isBreak) {
            let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
            for (let i = 0, len = vos.length; i < len; i++) {
                let vvo = vos[i]

                // 被打断的vo相当于播放失败，不会回调
                if (vvo.url == vo.url) {
                    this._onFail(vvo)
                }
            }
        }

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Prepare)
        return vo.id
    }

    /**
     * 停止
     * @param id 音频编号
     */
    public stop(id: number): void {
        // 过滤无效vo编号
        let vo = this._voDic.getValue(id)
        if (vo == null) {
            pkg_base.logger.error("stop:过滤无效vo编号|%v", id)
            return
        }

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
    }

    /**
     * 暂停
     * @param id 音频编号
     */
    public pause(id: number): void {
        // 过滤无效vo编号
        let vo = this._voDic.getValue(id)
        if (vo == null) {
            pkg_base.logger.error("pause:过滤无效vo编号|%v", id)
            return
        }

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Pasue)
    }

    /**
     * 恢复
     * @param id 音频编号
     */
    public resume(id: number): void {
        // 过滤无效vo编号
        let vo = this._voDic.getValue(id)
        if (vo == null) {
            pkg_base.logger.error("resume:过滤无效vo编号|%v", id)
            return
        }

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Playing)
    }

    /** 停止所有 */
    public stopAll(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]

            // 尝试处理vo
            this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
        }
    }

    /** 暂停所有 */
    public pauseAll(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]

            // 尝试处理vo
            this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Pasue)
        }
    }

    /** 恢复所有 */
    public resumeAll(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]

            // 尝试处理vo
            this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Playing)
        }
    }

    /** 
     * 设置bgm音量
     * @param volume bgm音量
     */
    public setBGMVolume(volume: number): void {
        this._bgmVolume = pkg_utils.limitNumber(volume, 0, 1)

        if (this._bgmVO != null && this._bgmVO.isAudioIDValid) {
            pkg_engine.Audio().setVolume(this._bgmVO.audioID, this._bgmVolume)
        }
    }

    /** 
     * 设置音效音量
     * @param volume 音效音量
     */
    public setEffectVolume(volume: number): void {
        this._effectVolume = pkg_utils.limitNumber(volume, 0, 1)

        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i]
            if (vo != null && vo.isAudioIDValid) {
                pkg_engine.Audio().setVolume(vo.audioID, this._effectVolume)
            }
        }
    }

    /**
     * 尝试处理vo
     * @param vo 音频vo
     * @param state 状态
     */
    private _tryHandleVo(vo: sub_soundvo.SoundVO, state: sub_soundstate.EnumSoundState): void {
        switch (state) {
            case sub_soundstate.EnumSoundState.None: {
                // 停止音频
                if (vo.isAudioIDValid) {
                    pkg_engine.Audio().setFinishCallback(vo.audioID, null)
                    pkg_engine.Audio().stop(vo.audioID)
                }

                // 清理bgm记录
                if (vo == this._bgmVO) {
                    this._bgmVO = null
                }

                // 回收
                this._voDic.remove(vo.id)
                this._prepareIDs.remove(vo.id)
                sub_soundvo.recoverSoundVO(vo)
                break
            }

            case sub_soundstate.EnumSoundState.Prepare: {
                // 记录
                this._prepareIDs.setValue(vo.id, true)
                this._voDic.setValue(vo.id, vo)
                break
            }

            case sub_soundstate.EnumSoundState.Loading: {
                // 清理记录
                this._prepareIDs.remove(vo.id)

                // 加载
                let id = vo.id, url = vo.url
                pkg_loadmgr.LoadManager.me.load(
                    url,
                    null,
                    (info: { [url: string]: string }) => {
                        // 失败处理
                        if (info[url] != null) {
                            pkg_base.logger.error("_tryHandleVo:音频资源加载失败|%v%v", url, info[url])
                            this._onFail(id)
                            return
                        }
                        this._onLoaded(id)
                    },
                    pkg_loadmgr.EnumLoadType.Audio
                )
                break
            }

            case sub_soundstate.EnumSoundState.Playing: {
                // 恢复音频
                if (vo.isAudioIDValid) {
                    pkg_engine.Audio().resume(vo.audioID)
                }
                // 是否已经开始加载
                else if (vo.isStartLoad) {
                    // 资源加载完成
                    if (vo.isLoaded) {
                        // 过滤无效音频资源
                        let clip = vo.getClip()
                        if (clip == null) {
                            pkg_base.logger.error("_tryHandleVo:音频资源无效|%v", vo.url)
                            this._onFail(vo)
                            return
                        }
    
                        // 启动播放
                        let audioID = pkg_engine.Audio().play(clip, vo.loop, vo.volume)
                        vo.setAudioID(audioID)
                    }
                }
                // 还未开始加载
                else {
                    // 不处理，状态会自动转为准备状态，
                    // 直到下一个渲染期才加载资源
                }
                break
            }

            case sub_soundstate.EnumSoundState.Pasue: {
                // 暂停音频
                if (vo.isAudioIDValid) {
                    pkg_engine.Audio().pause(vo.audioID)
                }
                break
            }
        }

        // 切换状态
        vo.tryChangeState(state)
    }

    /** 
     * 音频播放完成回调
     * @param idOrVo 音频编号或vo
     */
    private _onComplete(idOrVo: number | sub_soundvo.SoundVO): void {
        // 获取vo
        let vo = typeof idOrVo == "number" ? this._voDic.getValue(idOrVo) : idOrVo
        if (vo == null) {
            return
        }

        // 回调
        pkg_utils.tryCallFunc(vo.complete)

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
    }

    /** 
     * 音频加载完成回调
     * @param idOrVo 音频编号或vo
     */
    private _onLoaded(idOrVo: number | sub_soundvo.SoundVO): void {
        // 获取vo
        let vo = typeof idOrVo == "number" ? this._voDic.getValue(idOrVo) : idOrVo
        if (vo == null) {
            return
        }

        // 过滤无效缓存
        let cache = pkg_loadmgr.LoadManager.me.getRes(vo.url)
        if (cache == null) {
            pkg_base.logger.error("_onLoaded:音频缓存无效|%v", vo.url)
            this._onFail(vo)
            return
        }

        // 设置缓存
        vo.setCache(cache)

        // 过滤无效音频资源
        let clip = vo.getClip()
        if (clip == null) {
            pkg_base.logger.error("_onLoaded:音频资源无效|%v", vo.url)
            this._onFail(vo)
            return
        }

        // 启动播放
        let audioID = pkg_engine.Audio().play(clip, vo.loop, vo.volume)
        vo.setAudioID(audioID)

        // 过滤失败状态
        let state = pkg_engine.Audio().getState(audioID)
        if (state == pkg_engine.AudioState().ERROR) {
            pkg_base.logger.error("_onLoaded:音频播放失败|%v", vo.url)
            this._onFail(vo)
            return
        }

        // 设置回调
        pkg_engine.Audio().setFinishCallback(audioID, this._onComplete.bind(this, vo.id))
    }

    /** 
     * 音频失败回调
     * @param idOrVo 音频编号或vo
     */
    private _onFail(idOrVo: number | sub_soundvo.SoundVO): void {
        // 获取vo
        let vo = typeof idOrVo == "number" ? this._voDic.getValue(idOrVo) : idOrVo
        if (vo == null) {
            return
        }

        // 失败也会回调
        pkg_utils.tryCallFunc(vo.complete)

        // 尝试处理vo
        this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
    }

    /** 播放准备vo */
    private _doPlay(): void {
        // 过滤
        if (this._prepareIDs.count <= 0) {
            return
        }

        let vids = this._prepareIDs.getKeys()
        for (let i = 0, len = vids.length; i < len; i++) {
            let vo = this._voDic.getValue(vids[i])

            // 尝试处理vo
            this._tryHandleVo(vo, sub_soundstate.EnumSoundState.Loading)
        }
    }

    /** 定期清理失败vo */
    private _doCleanFail(): void {
        let vos: sub_soundvo.SoundVO[] = [].concat(this._voDic.getValues())
        for (let i = 0, len = vos.length; i < len; i++) {
            let vo = vos[i], audioEngine = pkg_engine.Audio()
            if (vo.isAudioIDValid) {
                if (audioEngine.getState(vo.audioID) == pkg_engine.AudioState().ERROR) {
                    // 尝试处理vo
                    this._tryHandleVo(vo, sub_soundstate.EnumSoundState.None)
                }
            }
        }
    }
}