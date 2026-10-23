import { Model } from "mongoose";
import { CommerceLock } from "./commerce.schemas";
export declare class CommerceLockService {
    private readonly locks;
    constructor(locks: Model<CommerceLock>);
    ready(): Promise<void>;
    run<T>(key: string, action: () => Promise<T>): Promise<T>;
}
