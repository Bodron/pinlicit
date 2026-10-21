import { ConfigService } from "@nestjs/config";
export declare class UploadsService {
    private readonly config;
    private readonly s3;
    constructor(config: ConfigService);
    createVideoUpload(fileName: string, contentType: string): Promise<{
        key: string;
        uploadUrl: string;
        videoUrl: string;
        contentType: string;
    }>;
}
