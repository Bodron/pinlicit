"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const bcrypt = require("bcryptjs");
const app_module_1 = require("./app.module");
const categories_service_1 = require("./categories/categories.service");
const user_schema_1 = require("./users/schemas/user.schema");
const users_service_1 = require("./users/users.service");
async function seed() {
    const app = await core_1.NestFactory.createApplicationContext(app_module_1.AppModule);
    const categories = app.get(categories_service_1.CategoriesService);
    const users = app.get(users_service_1.UsersService);
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
        admin.role = user_schema_1.UserRole.Admin;
        await admin.save();
    }
    await app.close();
}
void seed();
//# sourceMappingURL=seed.js.map