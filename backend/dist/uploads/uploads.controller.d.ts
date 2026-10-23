import { UploadsService } from "./uploads.service";
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    upload(user: any, image: Express.Multer.File): Promise<{
        imageKey: string;
        imageUrl: string;
        variants: {
            url: string;
            key: string;
            width: number;
            height: number;
            bytes: number;
            contentType: "image/webp";
        }[];
        sourceBytes: number;
        totalBytes: number;
    }>;
}
