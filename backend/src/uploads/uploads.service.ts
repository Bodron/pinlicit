import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuid } from "uuid";

@Injectable()
export class UploadsService {
  private readonly s3: S3Client;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      region: config.get<string>("AWS_REGION") || "eu-central-1",
    });
  }

  async createVideoUpload(fileName: string, contentType: string) {
    const bucket = this.config.get<string>("AWS_S3_BUCKET");
    if (!bucket) {
      throw new Error("AWS_S3_BUCKET is not configured.");
    }

    const extension = fileName.split(".").pop() || "mp4";
    const key = `videos/${uuid()}.${extension}`;
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn: 300 });
    const publicBase = this.config.get<string>("PUBLIC_VIDEO_BASE_URL");
    const videoUrl = publicBase
      ? `${publicBase.replace(/\/$/, "")}/${key}`
      : `https://${bucket}.s3.${this.config.get<string>("AWS_REGION") || "eu-central-1"}.amazonaws.com/${key}`;

    return { key, uploadUrl, videoUrl, contentType };
  }
}
