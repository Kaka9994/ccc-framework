import * as pkg_base from "../../core/base/pkg_base"
import * as pkg_common from "../../core/common/pkg_common"
import * as pkg_loader from "../../core/loader/pkg_loader"
import * as sub_soundstate from "./sub_soundstate"

const SoundVO_Name = "SoundVO"

/**
 * 创建一个音频vo
 * @param url 资源链接
 * @param loop 是否循环
 * @param onplay 开始播放回调
 * @param complete 播放完成回调
 * @param isBreak 是否打断
 * @return 音频vo
 */
export function createSoundVO(
    url: string,
    loop: boolean,
    volume: number,
    complete: () => void,
    isBreak: boolean = false
): SoundVO {
    return pkg_common.store.getObj<SoundVO>(SoundVO_Name, url, loop, volume, complete, isBreak)
}

/**
 * 回收一个音频vo
 * @param vo 音频vo
 */
export function recoverSoundVO(vo: SoundVO): void {
    pkg_common.store.putObj(SoundVO_Name, vo)
}

/** 音频vo */
export class SoundVO implements pkg_common.IDispose {
    /** 资源链接 */
    public url: string = null
    /** 是否循环 */
    public loop: boolean = false
    /** 音量(0~1) */
    public volume: number = 1
    /** 播放完成回调(若是loop,则不会回调) */
    public complete: () => void = null
    /** 是否打断,当需要播放的url正在播放时,停止当前的,重新开始播放 */
    public isBreak: boolean = false

    /** vo编号 */
    private _id: number = -1
    /** 音频编号 */
    private _audioID: number = -1
    /** vo状态 */
    private _state: sub_soundstate.EnumSoundState = sub_soundstate.EnumSoundState.None
    /** 缓存 */
    private _cache: pkg_loader.ICache = null
    /** 开始加载资源 */
    private _startLoad: boolean = false

    /** vo编号 */
    public get id(): number {
        return this._id
    }

    /** 音频编号 */
    public get audioID(): number {
        return this._audioID
    }

    /** vo状态 */
    public get state(): sub_soundstate.EnumSoundState {
        return this._state
    }

    /** 是否已经开始加载 */
    public get isStartLoad(): boolean {
        return this._startLoad
    }

    /** 是否加载完成 */
    public get isLoaded(): boolean {
        return this._cache?.getData != null && this._cache?.getData() != null
    }

    /** 是否音频编号有效 */
    public get isAudioIDValid(): boolean {
        return this._audioID != -1
    }

    /** 销毁 */
    public dispose(): void {
        [this.url, this.loop, this.volume, this.complete, this.isBreak] =
            [null, false, 1, null, null, false]

        this._id = -1
        this._audioID = -1
        this._state = sub_soundstate.EnumSoundState.None
        if (this._cache != null) {
            this._cache.decRef()
            this._cache = null
        }
        this._startLoad = false
    }

    /**
     * 设置属性
     * @param url 资源链接
     * @param loop 是否循环
     * @param volume 音量
     * @param onplay 开始播放回调
     * @param complete 播放完成回调
     * @param isBreak 是否打断
     */
    public setTo(
        url: string,
        loop: boolean,
        volume: number,
        complete: () => void,
        isBreak: boolean = false
    ): void {
        [this.url, this.loop, this.volume, this.complete, this.isBreak] =
            [url, loop, volume, complete, isBreak]

        this._id = pkg_common.getRound(SoundVO_Name)
    }

    /**
     * 设置音频编号
     * @param audioID 音频编号
     */
    public setAudioID(audioID: number): void {
        this._audioID = audioID
    }

    /** 
     * 尝试切换vo状态
     * @param state 状态
     */
    public tryChangeState(state: sub_soundstate.EnumSoundState): void {
        switch (state) {
            case sub_soundstate.EnumSoundState.Loading:
                this._startLoad = true
                this._state = sub_soundstate.EnumSoundState.Loading
                break
            case sub_soundstate.EnumSoundState.Playing:
                // 还未开始加载
                if (!this._startLoad) {
                    this._state = sub_soundstate.EnumSoundState.Prepare
                }
                // 加载未完成
                else if (!this.isLoaded) {
                    this._state = sub_soundstate.EnumSoundState.Loading
                }
                // 资源存在
                else {
                    this._state = sub_soundstate.EnumSoundState.Playing
                }
                break
            default:
                this._state = state
                break
        }
    }

    /**
     * 设置缓存
     * @param cache 缓存
     */
    public setCache(cache: pkg_loader.ICache): void {
        this._startLoad = true
        this._cache = cache
        if (this._cache != null) {
            this._cache.addRef()
        }
    }

    /**
     * 获取音频资源
     * @return 音频资源
     */
    public getClip(): any {
        return this._cache?.getData != null ? this._cache?.getData() : null
    }
}

/** 加载任务对象池 */
@pkg_common.registerPool(SoundVO_Name, SoundVO)
class SoundVOPool extends pkg_common.ObjectPool {
    public unuse(obj: SoundVO, ...args: any): void {
        obj.dispose()
    }
    public reuse(obj: SoundVO, ...args: any): void {
        let [url, loop, volume, complete, isBreak] = [...args]
        obj.setTo(url, loop, volume, complete, isBreak)
    }
}