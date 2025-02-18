export class UserIsAlreadyRegistered extends Error {
    constructor(message: string = "User is already registered") {
        super(message);
        this.name = "UserAlreadyRegistered";
    }
}