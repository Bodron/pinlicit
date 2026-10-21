import { UsePipes, ValidationPipe, forwardRef, Inject } from "@nestjs/common";
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BidsService } from "../bids/bids.service";
import { ProductsService } from "../products/products.service";

@WebSocketGateway({ cors: { origin: true, credentials: true } })
export class AuctionsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly productsService: ProductsService,
    @Inject(forwardRef(() => BidsService))
    private readonly bidsService: BidsService,
  ) {}

  handleConnection(client: Socket) {
    client.emit("connected", { ok: true });
  }

  @SubscribeMessage("auction:join")
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { productId: string },
  ) {
    const product = await this.productsService.findPublic(body.productId);
    const bids = await this.bidsService.latestForProduct(body.productId);
    await client.join(this.room(body.productId));
    client.emit("auction:update", { product, bids });
  }

  @SubscribeMessage("auction:leave")
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { productId: string },
  ) {
    await client.leave(this.room(body.productId));
  }

  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  @SubscribeMessage("bid:place")
  async place(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { productId: string; userId: string; amount: number },
  ) {
    try {
      const result = await this.bidsService.placeBid(
        body.productId,
        body.userId,
        body.amount,
      );
      client.emit("bid:accepted", result);
    } catch (error) {
      client.emit("bid:rejected", {
        message: error?.message || "Bid rejected.",
      });
    }
  }

  broadcastBid(product: any, bid: any, extended: boolean) {
    const payload = { product, bid };
    this.server.to(this.room(product._id.toString())).emit("bid:new", payload);
    this.server.to(this.room(product._id.toString())).emit("auction:update", {
      product,
      bids: [bid],
    });
    if (extended) {
      this.server
        .to(this.room(product._id.toString()))
        .emit("auction:extended", {
          productId: product._id.toString(),
          endsAt: product.endsAt,
        });
    }
  }

  broadcastClosed(product: any) {
    this.server
      .to(this.room(product._id.toString()))
      .emit("auction:closed", { product });
  }

  private room(productId: string) {
    return `auction:${productId}`;
  }
}
