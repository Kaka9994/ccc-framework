import { impl } from "./pkg_engineimpl"

/** 音频管理接口 */
export interface IEngineAudio {
    /**
     * 播放
     * @param clip 音频切片资源
     * @param loop 是否循环
     * @param volume 音量(0~1)
     * @return 播放编号
     */
    play(clip: any, loop: boolean, volume: number): number

    /**
     * 停止
     * @param id 播放编号
     */
    stop(id: number): void

    /**
     * 停止所有
     */
    stopAll(): void

    /**
     * 暂停
     * @param id 播放编号
     */
    pause(id: number): void

    /**
     * 暂停所有
     */
    pauseAll(): void

    /**
     * 恢复
     * @param id 播放编号
     */
    resume(id: number): void

    /**
     * 设置音量
     * @param id 播放编号
     * @param volume 音量(0~1)
     */
    setVolume(id: number, volume: number): void

    /**
     * 获取音量
     * @param id 播放编号
     * @return 音量(0~1)
     */
    getVolume(id: number): number

    /**
     * 获取音频状态
     * @param id 播放编号
     * @return 音频状态
     */
    getState(id: number): number

    /**
     * 设置完成回调
     * @param id 播放编号
     * @param callback 完成回调
     */
    setFinishCallback(id: number, callback: Function): void
}

/** 音频状态接口 */
export interface IEngineAudioState {
    /** 错误 */
    ERROR: number
    /** 初始化中 */
    INITIALZING: number
    /** 播放中 */
    PLAYING: number
    /** 暂停 */
    PAUSED: number
    /** 停止 */
    STOPPED: number
}

/**
 * 获取音频管理接口
 * @return 音频管理接口
 */
export function Audio(): IEngineAudio {
    return gAudio
}

/**
 * 获取音频状态
 * @return 音频状态
 */
export function AudioState(): IEngineAudioState {
    return gAudioState
}

// 全局对象
let gAudio: IEngineAudio = impl.Audio
let gAudioState: IEngineAudioState = impl.AudioState