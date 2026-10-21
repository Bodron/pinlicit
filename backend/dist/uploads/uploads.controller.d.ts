import { CreateVideoUploadDto } from "./dto/create-video-upload.dto";
import { UploadsService } from "./uploads.service";
export declare class UploadsController {
    private readonly uploadsService;
    constructor(uploadsService: UploadsService);
    createVideoUrl(dto: CreateVideoUploadDto): Promise<{
        key: string;
        uploadUrl: string;
        videoUrl: string;
        contentType: string;
    }>;
}
