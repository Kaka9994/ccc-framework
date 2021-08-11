/**字典数据结构类 */
export class Dictionary<KT, VT> {
    private _keys: KT[] = []
    private _values: VT[] = []

    /**
     * 设置
     * @param key 
     * @param value 
     */
    public setValue(key: KT, value: VT): void {
        let index = this._keys.indexOf(key)
        if (index == -1) {
            this._keys.push(key)
            this._values.push(value)
        } else {
            this._values[index] = value
        }
    }

    /**
     * 获取
     * @param key 
     * @return 值
     */
    public getValue(key: KT): VT {
        let index = this._keys.indexOf(key)
        return index == -1 ? null : this._values[index]
    }

    /**
     * 移除
     * @param key 
     */
    public remove(key: KT) {
        var index = this._keys.indexOf(key, 0)
        if (index > -1) {
            this._keys.splice(index, 1)
            this._values.splice(index, 1)
        }
    }

    /**
     * 是否存在
     * @param key 
     * @return 
     */
    public hasKey(key: KT): boolean { 
        return this._keys.indexOf(key) != -1
    }

    /** 清理 */
    public clean(): void {
        this._keys.length = this._values.length = 0
    }

    public getKeys(): KT[] { return this._keys }
    public getValues(): VT[] { return this._values }
    public get count(): number { return this._keys.length }
}