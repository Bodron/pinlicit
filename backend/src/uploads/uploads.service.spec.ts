import { BadRequestException, ForbiddenException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ImageOptimizer } from "./image-optimizer.service";
import { UploadsService } from "./uploads.service";
import { IMAGE_CACHE_CONTROL, MAX_IMAGE_BYTES } from "./image-policy";
const sharp: typeof import("sharp").default = require("sharp");

const send = jest.fn().mockResolvedValue({});
jest.mock("@aws-sdk/client-s3", () => ({
  S3Client: jest
    .fn()
    .mockImplementation(() => ({ send: (...args: any[]) => send(...args) })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

describe("Image optimizer", () => {
  const optimizer = new ImageOptimizer();
  it("decodes real bytes, corrects orientation and strips EXIF", async () => {
    const source = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "#4583ab" },
    })
      .jpeg()
      .withMetadata({
        orientation: 6,
        exif: { IFD0: { Artist: "private-test" } },
      })
      .toBuffer();
    const result = await optimizer.optimize(source);
    expect(result).toHaveLength(1);
    const metadata = await sharp(result[0].data).metadata();
    expect(metadata).toMatchObject({ width: 80, height: 120, format: "webp" });
    expect(metadata.exif).toBeUndefined();
    expect(metadata.orientation).toBeUndefined();
  });
  it("creates bounded responsive sizes without cropping or enlargement", async () => {
    const source = await sharp({
      create: { width: 2400, height: 1600, channels: 3, background: "#3575a1" },
    })
      .png()
      .toBuffer();
    const result = await optimizer.optimize(source);
    expect(result.map((item) => item.width)).toEqual([320, 960, 1920]);
    for (const item of result) {
      expect(Math.abs(item.width / item.height - 1.5)).toBeLessThan(0.01);
      expect((await sharp(item.data).metadata()).format).toBe("webp");
    }
  });
  it("keeps alpha losslessly and stores a small source once", async () => {
    const source = await sharp({
      create: {
        width: 80,
        height: 40,
        channels: 4,
        background: { r: 10, g: 20, b: 30, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const result = await optimizer.optimize(source);
    expect(result).toHaveLength(1);
    const metadata = await sharp(result[0].data).metadata();
    expect(metadata).toMatchObject({ width: 80, height: 40, hasAlpha: true });
    const decoded = await sharp(result[0].data).raw().toBuffer();
    expect(decoded[3]).toBe(128);
  });
  it.each([
    ["corrupt", Buffer.from("fake JPEG")],
    ["SVG", Buffer.from('<svg width="1" height="1"></svg>')],
    ["empty", Buffer.alloc(0)],
  ])("rejects %s input", async (_label, input: Buffer) => {
    await expect(optimizer.optimize(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
  it("rejects oversized bytes before decoding", async () => {
    await expect(
      optimizer.optimize(Buffer.alloc(MAX_IMAGE_BYTES + 1)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe("Optimized asset storage", () => {
  let saved: any;
  let model: any;
  let service: UploadsService;
  const input = Buffer.from("source fixture");
  const encoded = [
    { data: Buffer.from("webp fixture"), width: 320, height: 200, bytes: 12 },
  ];
  beforeEach(() => {
    send.mockClear();
    send.mockResolvedValue({});
    saved = null;
    model = {
      findById: jest.fn(() => ({ lean: async () => saved })),
      findOne: jest.fn(() => ({ lean: async () => saved })),
      findOneAndUpdate: jest.fn((filter, update) => {
        if (filter.imageKey && !saved) return { lean: async () => null };
        saved = { ...(saved || {}), ...update.$set };
        return {
          lean: async () => saved,
          then: (resolve: any) => resolve(saved),
        };
      }),
      updateOne: jest.fn(async (filter, update) => {
        saved = { ...saved, ...update.$set };
        return { matchedCount: 1 };
      }),
    };
    service = new UploadsService(
      new ConfigService({ AWS_REGION: "eu-north-1", AWS_S3_BUCKET: "fixture" }),
      model,
      { optimize: jest.fn().mockResolvedValue(encoded) } as any,
    );
  });
  it("stores only encoded WebP, with immutable cache and deterministic deduplication", async () => {
    const result = await service.uploadImage("owner", input);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].input).toMatchObject({
      ContentType: "image/webp",
      CacheControl: IMAGE_CACHE_CONTROL,
      Body: encoded[0].data,
    });
    expect(result.imageKey).toMatch(
      /^images\/v1\/[a-f0-9]{64}\/320x200\.webp$/,
    );
    expect(saved.status).toBe("ready");
    const repeat = await service.uploadImage("owner", input);
    expect(repeat.imageKey).toBe(result.imageKey);
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("marks failed uploads retryable and returns no ready image on storage error", async () => {
    send.mockRejectedValueOnce(new Error("storage failure"));
    await expect(service.uploadImage("owner", input)).rejects.toThrow(
      "Image storage is unavailable",
    );
    expect(saved.status).toBe("failed");
    expect(saved.variants[0].key).toMatch(/^images\/v1\//);
  });
  it("requires a ready asset owned by the seller before publication", async () => {
    await expect(
      service.requireImage("foreign-key", "owner"),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      {
        imageKey: "foreign-key",
        owner: "owner",
        status: "ready",
      },
      expect.objectContaining({ $set: expect.any(Object) }),
      { new: true },
    );
  });
});
