import { AssetBase } from '@awayjs/core';

export class ManagedPool<T extends AssetBase> {
    /**
     * @description Reduce a size every n-sec
     */
    public static REDUCE_TIMEOUT = 5000;
    private _store: T[] = [];

    constructor(
        public readonly baseClass: {new (...args: any): T, assetType: string},
        private _limit: number = 10, 
        public enabled = true) {}

    private resize(target: number) {

        if(target >= this._store.length) {
            return;
        }

        const diff = this._store.splice(0, this._store.length - target);

        for(const s of diff) s.dispose();
    }

    public get size(): number {
        return this._store.length;
    }

    public set size(v: number) {
        this.resize(v);
    }

    public get limit(): number {
        return this._limit;
    }

    public set limit(v: number) {
        this.resize(v);
        this._limit = v;
    }

    public pop(): T | null {
        return this._store.length && this.enabled ?  this._store.shift() : null;
    }

    public store(entry: T): boolean {
        if(!this.enabled) {
            return false;
        }

        if(entry.assetType !== this.baseClass.assetType) {
            return false;
        }

        if(this._store.length >= this._limit) {
            return false;
        }

        this._store.push(entry);

        return true;
    }

    public release(entry: T): boolean {
        const index = this._store.indexOf(entry);

        if(index === -1) {
            return false;
        }

        this._store.splice(index, 1);
        return true;
    }

    public clear() {
        this.resize(0);
    }

    public dispose() {
        for(const s of this._store) s.dispose();

        this._store = null;
        this._limit = 0;
    }

}