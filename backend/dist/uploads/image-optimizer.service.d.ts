export declare class ImageOptimizer {
    optimize(input: Buffer): Promise<{
        data: Buffer;
        width: number;
        height: number;
        bytes: number;
    }[]>;
}
