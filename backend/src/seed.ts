import { NestFactory } from "@nestjs/core";
import * as bcrypt from "bcryptjs";
import { AppModule } from "./app.module";
import { CategoriesService } from "./categories/categories.service";
import { UserRole } from "./users/schemas/user.schema";
import { UsersService } from "./users/users.service";

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const categories = app.get(CategoriesService);
  const users = app.get(UsersService);

  await categories.ensureDefaults();

  const adminEmail = "admin@licit.local";
  let admin = await users.findByEmailWithPassword(adminEmail);
  if (!admin) {
    admin = await users.create({
      name: "Licit Admin",
      email: adminEmail,
      passwordHash: await bcrypt.hash("admin1234", 12),
      phone: "+40000000000",
    });
    admin.role = UserRole.Admin;
    await admin.save();
  }

  await app.close();
}

void seed();
