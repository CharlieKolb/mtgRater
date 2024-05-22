export const ProgramStore = new class ProgramStore {
    private _map = new Map<string, string>();

    clear(): void {
        this._map.clear();
        try {
            localStorage.clear();
        } catch (e) { }
    }
    getItem(key: string): string | null {
        let val: string | null | undefined = this._map.get(key);
        if (val === undefined) val = null;
        try {
            if (val === null) val = localStorage.getItem(key);
        } catch (e) { }
        console.log(val);
        return val;
    }
    removeItem(key: string): void {
        this._map.delete(key);
        try {
            localStorage.removeItem(key);
        } catch (e) { }
    }
    setItem(key: string, value: string): void {
        this._map.set(key, value);
        try {
            localStorage.setItem(key, value);
        } catch (e) { }

    }

}();