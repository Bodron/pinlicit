import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { ProductsService } from "./products.service";

@UseGuards(JwtAuthGuard)
@Controller("me/products")
export class MyProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  mine(@CurrentUser() user: any) {
    return this.productsService.findMine(user._id.toString());
  }
}
