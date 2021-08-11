

/** 
 * 音频状态
 * 
 * 活跃状态(Prepare/Loading/Playing 能自动转变到下一阶段)
 * 
 * 惰性状态(None/Pasue 需要主动切换到下一阶段)
 * 
 * vo状态转换描述:
 * 
 * state: None | from: * | to: Prepare
 * 
 * state: Prepare | from: None | to: None/Loading/Playing/Pause
 * 
 * state: Loading | from: Prepare | to: None/Playing/Pause
 * 
 * state: Playing | from: Prepare/Loading/Pause | to: None/Pause
 * 
 * state: Pasue | from: Prepare/Loading/Playing | to: None/Playing
 */
export enum EnumSoundState {
    None = 0,
	/** 准备 */
	Prepare = 1,
	/** 加载中 */
	Loading = 2,
    /** 播放中(常驻状态) */
    Playing = 3,
	/** 暂停(临时状态) */
	Pasue = 4,
}