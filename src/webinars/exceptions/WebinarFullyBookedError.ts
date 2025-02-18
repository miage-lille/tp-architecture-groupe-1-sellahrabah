export class WebinarFullyBookedError extends Error {
    constructor() {
        super('Webinar is fully booked');
        this.name = 'WebinarFullyBookedError';
    }
}