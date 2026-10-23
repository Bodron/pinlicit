import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  ServiceUnavailableException,
} from "@nestjs/common";
import { finalize } from "rxjs";

// Runs before multipart buffering. Do not queue unlimited 10 MB requests in RAM.
@Injectable()
export class ImageCapacityInterceptor implements NestInterceptor {
  private active = 0;
  intercept(_context: ExecutionContext, next: CallHandler) {
    if (this.active >= 2)
      throw new ServiceUnavailableException(
        "Image processing is busy. Retry shortly.",
      );
    this.active++;
    try {
      return next.handle().pipe(finalize(() => this.active--));
    } catch (error) {
      this.active--;
      throw error;
    }
  }
}
