import { IMailer } from 'src/core/ports/mailer.interface';
import { IWebinarRepository } from '../ports/webinar-repository.interface';
import { User } from 'src/users/entities/user.entity';
import { InMemoryParticipationRepository } from '../adapters/participation-repository.in-memory';
import { UserRepositoryInMemory } from 'src/users/adapters/user-repository.in-memory';
import { InMemoryWebinarRepository } from '../adapters/webinar-repository.in-memory';
import { InMemoryMailer } from 'src/core/adapters/in-memory-mailer';
import { BookSeat } from './book-seat';
import { Webinar } from '../entities/webinar.entity';
import { addDays } from 'date-fns';
import { UserIsAlreadyRegistered } from 'src/users/exceptions/UserIsAlreadyRegistered';
import { WebinarDatesTooSoonException } from '../exceptions/webinar-dates-too-soon';
import { WebinarFullyBookedError } from '../exceptions/WebinarFullyBookedError';
import { WebinarNotFoundError } from '../exceptions/WebinarNotFoundError';

describe('Feature: Book a seat for a webinar', () => {

  let mailer: IMailer;
  let userRepository: UserRepositoryInMemory;
  let useCase: BookSeat;
  let webinarRepository: IWebinarRepository;
  let participationRepository: InMemoryParticipationRepository;

  let user: User;
  let webinar: Webinar;

  beforeEach(() => {
    participationRepository = new InMemoryParticipationRepository();
    userRepository = new UserRepositoryInMemory();
    webinarRepository = new InMemoryWebinarRepository();
    mailer = new InMemoryMailer();
    useCase = new BookSeat(participationRepository, userRepository, webinarRepository, mailer);

    user = new User({
      id: 'USER-TEST-3O5E-3721',
      email: 'user@mail.com',
      password: 'password123',
    });

    webinar = new Webinar({
      id: 'WEBINAR-TEST-HY65-SH23',
      organizerId: 'ORGANIZER-TEST-M9P1-TE5R',
      title: 'Webinar Test',
      startDate: addDays(new Date(), 5),
      endDate: addDays(new Date(), 6),
      seats: 2,
    });

    webinarRepository.create(webinar);
    userRepository.save(user);
  });

  it('should allow a user to book a seat if there are available seats', async () => {
    await useCase.execute({ webinarId: webinar.props.id, user });

    const participations = await participationRepository.findByWebinarId(webinar.props.id);
    expect(participations.length).toBe(1);
    expect(participations[0].props.userId).toBe(user.props.id);
  });

  it('should not allow booking if there are no available seats', async () => {
    await useCase.execute({ webinarId: webinar.props.id, user });

    const anotherUser = new User({
      id: 'USER-TEST-Y6E5-P721',
      email: 'another@mail.com',
      password: 'password456',
    });

    userRepository.save(anotherUser);
    await useCase.execute({ webinarId: webinar.props.id, user: anotherUser });

    const lastUser = new User({
      id: 'USER-TEST-89IE-L921',
      email: 'last@mail.com',
      password: 'password789',
    });

    userRepository.save(lastUser);

    await expect(useCase.execute({ webinarId: webinar.props.id, user: lastUser })).rejects.toThrow(
      new WebinarFullyBookedError().message
    );
  });

  it('should not allow a user to book twice for the same webinar', async () => {
    await useCase.execute({ webinarId: webinar.props.id, user });

    await expect(useCase.execute({ webinarId: webinar.props.id, user }))
      .rejects.toThrow(new UserIsAlreadyRegistered().message);
  });

  it('should send an email to the organizer when a seat is booked', async () => {
    await useCase.execute({ webinarId: webinar.props.id, user });

    const inMemoryMailer = mailer as InMemoryMailer;

    expect(inMemoryMailer.send.length).toBe(1);
    expect(inMemoryMailer.sentEmails[0]).toEqual({
      to: 'ORGANIZER-TEST-M9P1-TE5R',
      subject: 'New participant registered',
      body: `User has registered for webinar ${webinar.props.id}`,
    });
  });

  it('should throw an error if the webinar does not exist', async () => {
    await expect(useCase.execute({ webinarId: 'invalid-id', user }))
      .rejects.toThrow(new WebinarNotFoundError().message);
  });

  it('should not allow booking if the webinar starts too soon', async () => {
    const webinarTooSoon = new Webinar({
      id: 'WEBINAR-TOO-SOON',
      organizerId: 'ORGANIZER-TEST',
      title: 'Soon Webinar',
      startDate: addDays(new Date(), 2), // Moins de 3 jours
      endDate: addDays(new Date(), 3),
      seats: 5,
    });

    await webinarRepository.create(webinarTooSoon);

    await expect(useCase.execute({ webinarId: webinarTooSoon.props.id, user }))
      .rejects.toThrow(WebinarDatesTooSoonException);
  });

  it('should create user if user does not exist before booking', async () => {
    const newUser = new User({
      id: 'NEW-USER',
      email: 'newuser@mail.com',
      password: 'password123',
    });

    await useCase.execute({ webinarId: webinar.props.id, user: newUser });

    const savedUser = await userRepository.findById(newUser.props.id);
    expect(savedUser).toBeDefined();
  });
});
