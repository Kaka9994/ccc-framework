

/** 加载类型 */
export enum EnumLoadType {
    None = "None",
    /** 文本类型 */
    Text = "text",
	/** 二进制类型 */
	Buffer = "arraybuffer",
	/** spine骨骼动画类型 */
	Skeleton = "skeleton",
	/** 预制体 */
	Prefab = "prefab",
	/** 纹理类型 */
	Image = "image",
	/** 音频类型 */
	Audio = "audio",
	/** 图集类型 */
	Atlas = "atlas",
	/** bundle类型 */
	Bundle = "bundle"
}