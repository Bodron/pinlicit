import { forwardRef, Inject } from "@nestjs/common";
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

  // Socket clients may observe auctions. Financial writes use the JWT-guarded
  // HTTP endpoint, whose buyer identity comes from the validated token.
  @SubscribeMessage("bid:place")
  place(@ConnectedSocket() client: Socket) {
    client.emit("bid:rejected", {
      message: "Use the authenticated HTTP bidding endpoint.",
    });
  }

  broadcastBid(product: any, bid: any, extended: boolean) {
    const publicBid = {
      _id: bid._id,
      amount: bid.amount,
      createdAt: bid.createdAt,
      bidder: { _id: bid.bidder?._id, name: bid.bidder?.name },
    };
    const payload = { product, bid: publicBid };
    this.server.to(this.room(product._id.toString())).emit("bid:new", payload);
    this.server.to(this.room(product._id.toString())).emit("auction:update", {
      product,
      bids: [publicBid],
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
