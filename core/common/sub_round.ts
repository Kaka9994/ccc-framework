import * as sub_dict from "./sub_dict"

const Def_Round_Name = "def_round_name"

/**
 * 获取循环编号(只有新的循环编号名，填first\end才生效，默认0\0xffffff)
 * @param rname 循环编号名
 * @param first 起始编号
 * @param end 终止编号
 */
export function getRound(rname?: string, first?: number, end?: number): number {
    rname = rname ? rname : Def_Round_Name
    let r = gRounds.getValue(rname)
    if (r == null) {
        r = new KRound(first, end)
        gRounds.setValue(rname, r)
    }
    return r.id
}

/** 循环编号类 */
class KRound {
    /** id编号 */
    private _id: number = 0
    /** 起始编号 */
    private _first: number = 0
    /** 终止编号 */
    private _end: number = 0

    /**
     * 构造
     * @param first 起始编号
     * @param end 终止编号
     */
    constructor(first?: number, end?: number) {
        this._first = typeof first == "number" ? first : 0
        this._end = typeof end == "number" ? end : 0xffffff
        this._id = this._first - 1
    }

    public get id() {
        if (++this._id > this._end) {
            this._id = this._first
        }
        return this._id
    }
}

// 初始化 <name, round>
let gRounds: sub_dict.Dictionary<string, KRound> = new sub_dict.Dictionary()