import { Participation } from "../entities/participation.entity";
import { IParticipationRepository } from "../ports/participation-repository.interface";

export class InMemoryParticipationRepository implements IParticipationRepository{

    constructor(private participations: Participation[] = []) {}

    async findByWebinarId(webinarId: string): Promise<Participation[]> {
        return this.participations.filter((participation) => participation.props.webinarId === webinarId);
    }

    async save(newParticipation: Participation): Promise<void> {
        this.participations.push(newParticipation);
    }
}