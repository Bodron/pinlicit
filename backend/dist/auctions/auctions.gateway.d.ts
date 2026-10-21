import { OnGatewayConnection } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { BidsService } from "../bids/bids.service";
import { ProductsService } from "../products/products.service";
export declare class AuctionsGateway implements OnGatewayConnection {
    private readonly productsService;
    private readonly bidsService;
    server: Server;
    constructor(productsService: ProductsService, bidsService: BidsService);
    handleConnection(client: Socket): void;
    join(client: Socket, body: {
        productId: string;
    }): Promise<void>;
    leave(client: Socket, body: {
        productId: string;
    }): Promise<void>;
    place(client: Socket, body: {
        productId: string;
        userId: string;
        amount: number;
    }): Promise<void>;
    broadcastBid(product: any, bid: any, extended: boolean): void;
    broadcastClosed(product: any): void;
    private room;
}
