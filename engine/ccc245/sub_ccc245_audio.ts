
export { gAudio as Audio, CCC245AudioState as AudioState }

/** 音频管理实现 */
class CCC245Audio {
    /**
     * 播放
     * @param clip 音频切片资源
     * @param loop 是否循环
     * @param volume 音量(0~1)
     * @return 播放编号
     */
    public play(clip: any, loop: boolean, volume: number): number {
        return cc.audioEngine.play(clip, loop, volume)
    }

    /**
     * 停止
     * @param id 播放编号
     */
    public stop(id: number): void {
        cc.audioEngine.stop(id)
    }

    /**
     * 停止所有
     */
    public stopAll(): void {
        cc.audioEngine.stopAll()
    }

    /**
     * 暂停
     * @param id 播放编号
     */
    public pause(id: number): void {
        cc.audioEngine.pause(id)
    }

    /**
     * 暂停所有
     */
    public pauseAll(): void {
        cc.audioEngine.pauseAll()
    }

    /**
     * 恢复
     * @param id 播放编号
     */
    public resume(id: number): void {
        cc.audioEngine.resume(id)
    }

    /**
     * 设置音量
     * @param id 播放编号
     * @param volume 音量(0~1)
     */
    public setVolume(id: number, volume: number): void {
        cc.audioEngine.setVolume(id, volume)
    }

    /**
     * 获取音量
     * @param id 播放编号
     * @return 音量(0~1)
     */
    public getVolume(id: number): number {
        return cc.audioEngine.getVolume(id)
    }

    /**
     * 获取音频状态
     * @param id 播放编号
     * @return 音频状态
     */
    public getState(id: number): number {
        return cc.audioEngine.getState(id)
    }

    /**
     * 设置完成回调
     * @param id 播放编号
     * @param callback 完成回调
     */
    public setFinishCallback(id: number, callback: Function): void {
        cc.audioEngine.setFinishCallback(id, callback)
    }
}

/** 音频状态接口 */
const CCC245AudioState = cc.audioEngine.AudioState

// 初始化
let gAudio = new CCC245Audio()