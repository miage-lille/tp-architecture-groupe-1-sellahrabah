import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';

type Request = {
  webinarId: string;
  user: User;
};
type Response = void;

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {

    // 1. Vérifiez si le webinaire existe
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new Error(`Webinar with ID ${webinarId} not found`);
    }

    // 2. Vérifiez si l'utilisateur existe
    const userExists = await this.userRepository.findById(user.props.id);
    if (!userExists) {
      throw new Error(`User with ID ${user.props.id} not found`);
    }

    // 3. Vérifiez si l'utilisateur est déjà inscrit
    const participations = await this.participationRepository.findByWebinarId(webinarId);
    const isAlreadyRegistered = participations.some(
      (participation) => participation.props.userId === user.props.id
    );
    if (isAlreadyRegistered) {
      throw new Error(`User with ID ${user.props.id} is already registered`);
    }

    // 4. Vérifiez s'il reste des places
    const remainingSeats = webinar.props.seats - participations.length;
    if (remainingSeats <= 0) {
      throw new Error(`No seats available for webinar with ID ${webinarId}`);
    }

    // 5. Créez une participation
    const participation = new Participation({
      webinarId,
      userId: user.props.id,
    });
    await this.participationRepository.save(participation);

    // 6. Envoyez un email à l'organisateur
    await this.mailer.send({
      to: webinar.props.organizerId,
      subject: 'New participant registered',
      body: `User ${user.props.id} has registered for webinar ${webinarId}`,
    });
  }
}
