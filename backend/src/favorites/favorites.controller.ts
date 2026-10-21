import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { FavoritesService } from "./favorites.service";

@UseGuards(JwtAuthGuard)
@Controller("me/favorites")
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  mine(@CurrentUser() user: any) {
    return this.favoritesService.mine(user._id.toString());
  }

  @Post(":productId")
  add(@CurrentUser() user: any, @Param("productId") productId: string) {
    return this.favoritesService.add(user._id.toString(), productId);
  }

  @Delete(":productId")
  remove(@CurrentUser() user: any, @Param("productId") productId: string) {
    return this.favoritesService.remove(user._id.toString(), productId);
  }
}
