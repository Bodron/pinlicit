import { CallHandler, ExecutionContext, NestInterceptor } from "@nestjs/common";
export declare class ImageCapacityInterceptor implements NestInterceptor {
    private active;
    intercept(_context: ExecutionContext, next: CallHandler): import("rxjs").Observable<any>;
}
