import { UsersService } from "./users.service";
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    me(user: any): {
        id: any;
        name: any;
        email: any;
        role: any;
        blocked: any;
        phone: any;
    };
}
