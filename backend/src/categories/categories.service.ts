import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Category, CategoryDocument } from "./schemas/category.schema";

@Injectable()
export class CategoriesService implements OnModuleInit {
  constructor(
    @InjectModel(Category.name)
    private readonly categoryModel: Model<CategoryDocument>,
  ) {}

  async onModuleInit() {
    await this.ensureDefaults();
  }

  async list() {
    return this.categoryModel.find().sort({ name: 1 });
  }

  async ensureDefaults() {
    const defaults = [
      ["Electronice", "electronice"],
      ["Fashion", "fashion"],
      ["Auto", "auto"],
      ["Casa", "casa"],
      ["Collectibles", "collectibles"],
    ];
    await Promise.all(
      defaults.map(([name, slug]) =>
        this.categoryModel.updateOne(
          { slug },
          { $setOnInsert: { name, slug } },
          { upsert: true },
        ),
      ),
    );
  }
}
