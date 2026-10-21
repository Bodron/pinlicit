import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { Roles } from "../common/roles.decorator";
import { RolesGuard } from "../common/roles.guard";
import { ProductsService } from "../products/products.service";
import { SellerApplicationsService } from "../seller-applications/seller-applications.service";
import { UserRole } from "../users/schemas/user.schema";
import { UsersService } from "../users/users.service";

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.Admin)
@Controller("admin")
export class AdminController {
  constructor(
    private readonly applicationsService: SellerApplicationsService,
    private readonly productsService: ProductsService,
    private readonly usersService: UsersService,
  ) {}

  @Get("seller-applications")
  sellerApplications() {
    return this.applicationsService.listPending();
  }

  @Post("seller-applications/:id/approve")
  approveSeller(@Param("id") id: string, @CurrentUser() admin: any) {
    return this.applicationsService.approve(id, admin._id.toString());
  }

  @Post("seller-applications/:id/reject")
  rejectSeller(@Param("id") id: string, @CurrentUser() admin: any) {
    return this.applicationsService.reject(id, admin._id.toString());
  }

  @Post("products/:id/hide")
  hideProduct(@Param("id") id: string) {
    return this.productsService.hide(id);
  }

  @Patch("users/:id/block")
  blockUser(@Param("id") id: string, @Body("blocked") blocked = true) {
    return this.usersService.blockUser(id, blocked);
  }
}
