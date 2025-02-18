export class WebinarNotFoundError extends Error {
    constructor() {
        super('Webinar not found');
        this.name = 'WebinarNotFoundError';
    }
}  