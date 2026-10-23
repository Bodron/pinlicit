import { ConflictException, Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { randomUUID } from "crypto";
import { Model } from "mongoose";
import { CommerceLock } from "./commerce.schemas";

@Injectable()
export class CommerceLockService {
  constructor(
    @InjectModel(CommerceLock.name) private readonly locks: Model<CommerceLock>,
  ) {}
  async ready() {
    await this.locks.init();
  }
  async run<T>(key: string, action: () => Promise<T>): Promise<T> {
    const owner = randomUUID();
    try {
      await this.locks.findOneAndUpdate(
        { key, expiresAt: { $lte: new Date() } },
        {
          $set: { owner, expiresAt: new Date(Date.now() + 120000) },
          $setOnInsert: { key },
        },
        { upsert: true, new: true },
      );
    } catch (error) {
      if (error.code === 11000)
        throw new ConflictException(
          "Operation is already in progress. Retry shortly.",
        );
      throw error;
    }
    let lost = false;
    let renewing = Promise.resolve();
    const heartbeat = setInterval(() => {
      renewing = renewing
        .then(async () => {
          const result = await this.locks.updateOne(
            { key, owner, expiresAt: { $gt: new Date() } },
            { $set: { expiresAt: new Date(Date.now() + 120000) } },
          );
          if (result.matchedCount !== 1) lost = true;
        })
        .catch(() => {
          lost = true;
        });
    }, 30000);
    heartbeat.unref();
    try {
      const result = await action();
      if (lost)
        throw new ConflictException(
          "Operation lease was lost. Reconciliation is required.",
        );
      return result;
    } finally {
      clearInterval(heartbeat);
      await renewing;
      await this.locks.deleteOne({ key, owner });
    }
  }
}
