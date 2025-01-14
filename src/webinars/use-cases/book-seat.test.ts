import { BookSeat } from './book-seat';
import { IParticipationRepository } from 'src/webinars/ports/participation-repository.interface';
import { IWebinarRepository } from 'src/webinars/ports/webinar-repository.interface';
import { IUserRepository } from 'src/users/ports/user-repository.interface';
import { IMailer } from 'src/core/ports/mailer.interface';
import { User } from 'src/users/entities/user.entity';
import { Webinar } from 'src/webinars/entities/webinar.entity';
import { Participation } from 'src/webinars/entities/participation.entity';

describe('BookSeat Use Case', () => {
  let bookSeat: BookSeat;
  let mockParticipationRepository: jest.Mocked<IParticipationRepository>;
  let mockWebinarRepository: jest.Mocked<IWebinarRepository>;
  let mockUserRepository: jest.Mocked<IUserRepository>;
  let mockMailer: jest.Mocked<IMailer>;

  beforeEach(() => {
    mockParticipationRepository = {
      findByWebinarId: jest.fn(),
      save: jest.fn(),
    };
  
    mockWebinarRepository = {
      findById: jest.fn(),
      create: jest.fn(), // Ajout de la méthode `create`
    };
  
    mockUserRepository = {
      findById: jest.fn(),
    };
  
    mockMailer = {
      send: jest.fn(),
    };
  
    bookSeat = new BookSeat(
      mockParticipationRepository,
      mockUserRepository,
      mockWebinarRepository,
      mockMailer,
    );
  });
  

  it('should throw an error if the webinar does not exist', async () => {
    mockWebinarRepository.findById.mockResolvedValue(null);

    await expect(
      bookSeat.execute({ webinarId: 'webinar1', 
                          user: new User({   
                            id: '123',
                            email: 'user@example.com',
                            password: 'securepassword',}) 
                        }),
    ).rejects.toThrow('Webinar with ID webinar1 not found');
  });

  it('should throw an error if the user does not exist', async () => {
    mockWebinarRepository.findById.mockResolvedValue(
      new Webinar({ id: 'webinar1', organizerId: 'org1', title: 'Webinar 1', startDate: new Date(), endDate: new Date(), seats: 10 }),
    );
    mockUserRepository.findById.mockResolvedValue(null);

    await expect(
      bookSeat.execute({ webinarId: 'webinar1', user: new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }) }),
    ).rejects.toThrow('User with ID user1 not found');
  });

  it('should throw an error if the user is already registered', async () => {
    mockWebinarRepository.findById.mockResolvedValue(
      new Webinar({ id: 'webinar1', organizerId: 'org1', title: 'Webinar 1', startDate: new Date(), endDate: new Date(), seats: 10 }),
    );
    mockUserRepository.findById.mockResolvedValue(new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }));
    mockParticipationRepository.findByWebinarId.mockResolvedValue([
      new Participation({ webinarId: 'webinar1', userId: 'user1' }),
    ]);

    await expect(
      bookSeat.execute({ webinarId: 'webinar1', user: new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }) }),
    ).rejects.toThrow('User with ID user1 is already registered');
  });

  it('should throw an error if there are no seats available', async () => {
    mockWebinarRepository.findById.mockResolvedValue(
      new Webinar({ id: 'webinar1', organizerId: 'org1', title: 'Webinar 1', startDate: new Date(), endDate: new Date(), seats: 1 }),
    );
    mockUserRepository.findById.mockResolvedValue(new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }));
    mockParticipationRepository.findByWebinarId.mockResolvedValue([
      new Participation({ webinarId: 'webinar1', userId: 'user2' }),
    ]);

    await expect(
      bookSeat.execute({ webinarId: 'webinar1', user: new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }) }),
    ).rejects.toThrow('No seats available for webinar with ID webinar1');
  });

  it('should successfully book a seat and send an email', async () => {
    mockWebinarRepository.findById.mockResolvedValue(
      new Webinar({ id: 'webinar1', organizerId: 'org1', title: 'Webinar 1', startDate: new Date(), endDate: new Date(), seats: 10 }),
    );
    mockUserRepository.findById.mockResolvedValue(new User({ id: 'user1' ,email: 'user@example.com',password: 'securepassword' }));
    mockParticipationRepository.findByWebinarId.mockResolvedValue([]);

    await bookSeat.execute({ webinarId: 'webinar1', user: new User({id: 'user1' ,email: 'user@example.com',password: 'securepassword'}) });

    expect(mockParticipationRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ props: { webinarId: 'webinar1', userId: 'user1' } }),
    );
    expect(mockMailer.send).toHaveBeenCalledWith({
      to: 'org1',
      subject: 'New participant registered',
      body: 'User user1 has registered for webinar webinar1',
    });
  });
});
