import { IMailer } from 'src/core/ports/mailer.interface';
import { Executable } from 'src/shared/executable';
import { User } from 'src/users/entities/user.entity';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { Participation } from 'src/webinars/entities/participation.entity';
import { WebinarNotFoundError } from '../exceptions/WebinarNotFoundError';
import { WebinarFullyBookedError } from '../exceptions/WebinarFullyBookedError';
import { UserIsAlreadyRegistered } from 'src/users/exceptions/UserIsAlreadyRegistered';
import { WebinarDatesTooSoonException } from '../exceptions/webinar-dates-too-soon';
type Request = {
  webinarId: string;
  user: User;
};
type Response = {
  participation: Participation;
};

export class BookSeat implements Executable<Request, Response> {
  constructor(
    private readonly participationRepository: IParticipationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webinarRepository: IWebinarRepository,
    private readonly mailer: IMailer,
  ) {}

  async execute({ webinarId, user }: Request): Promise<Response> {
    const webinar = await this.webinarRepository.findById(webinarId);
    if (!webinar) {
      throw new WebinarNotFoundError();
    }

    if (webinar.isTooSoon(new Date())) {
      throw new WebinarDatesTooSoonException();
    }

    const userExists = await this.userRepository.findById(user.props.id);
    if (!userExists) {
      await this.userRepository.save(user);
    }

    const participations = await this.participationRepository.findByWebinarId(webinarId);
    const isAlreadyRegistered = participations.some(
      (participation) => participation.props.userId === user.props.id
    );
    if (isAlreadyRegistered) {
      throw new UserIsAlreadyRegistered();
    }

    const remainingSeats = webinar.props.seats - participations.length;
    if (remainingSeats <= 0) {
      throw new WebinarFullyBookedError();
    }

    const participation = new Participation({
      webinarId,
      userId: user.props.id,
    });
    await this.participationRepository.save(participation);

    await this.mailer.send({
      to: webinar.props.organizerId,
      subject: 'New participant registered',
      body: `User has registered for webinar ${webinarId}`,
    });

    return { participation };
  }
}