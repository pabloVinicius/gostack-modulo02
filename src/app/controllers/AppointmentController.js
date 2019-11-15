import * as Yup from 'yup';
import pt from 'date-fns/locale/pt';
import { startOfHour, parseISO, isBefore, format, subHours } from 'date-fns';
import { Appointment, User, File } from '../models';
import { Notification } from '../schemas';
import { Queue } from '../../lib';
import { CancellationMail } from '../jobs';

class AppointmentController {
  async index(req, res) {
    const { page = 0, perPage = 20 } = req.query;
    const appointments = await Appointment.findAll({
      where: {
        user_id: req.userId,
        canceled_at: null,
      },
      order: ['date'],
      attributes: ['id', 'date', 'canceled_at'],
      limit: perPage,
      offset: page * perPage,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      provider_id: Yup.number().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation failed' });
    }

    const { provider_id, date } = req.body;

    /*
      Checking if provider_id is realy a provider
    */
    const isProvider = await User.findOne({
      where: { id: provider_id, provider: true },
    });

    if (!isProvider) {
      return res
        .status(400)
        .json({ error: 'You can only create appointments with providers.' });
    }

    /*
      Checking if user is trying to register with past date
    */
    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({
        error:
          'You are trying to register an appointment before the current date. That is not permited.',
      });
    }

    /*
      Checking if provider_id and userId is same
    */

    const userIsSameProvider = provider_id === req.userId;
    if (userIsSameProvider) {
      return res.status(400).json({
        error: 'You can not schedule an appointment for yourself.',
      });
    }

    /*
      Check date availability
    */

    const checkAvailavility = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (checkAvailavility) {
      return res.status(400).json({
        error: 'Date is not available.',
      });
    }

    const appointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    /*
    Notifying provider
    */

    const user = await User.findByPk(req.userId);
    const formatedDate = format(hourStart, "dd 'de' MMM', às' H:mm'h'", {
      locale: pt,
    });
    await Notification.create({
      content: `Novo agendamento de ${user.name} para dia ${formatedDate}`,
      user: provider_id,
    });

    return res.json(appointment);
  }

  async delete(req, res) {
    const appointment = await Appointment.findByPk(req.params.id, {
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['name', 'email'],
        },
        {
          model: User,
          as: 'user',
          attributes: ['name'],
        },
      ],
    });

    /*
      Checking if appointment exists
    */
    if (!appointment) {
      return res.status(404).json({
        error: 'There is no appointment with this id.',
      });
    }

    /*
      Checking if appointment is already canceled
    */
    if (appointment.canceled_at !== null) {
      return res.status(400).json({
        error: 'Appointment is already canceled.',
      });
    }

    /*
      Checking if appointment owner is the requester
    */
    if (appointment.user_id !== req.userId) {
      return res.status(401).json({
        error: 'You do not have permission to cancel others users appointments',
      });
    }

    /*
      Checking if user is trying to cancel an appointment at least 2 hours before
    */
    const subtractedDate = subHours(appointment.date, 2);

    if (isBefore(subtractedDate, new Date())) {
      return res.status(401).json({
        error: 'You can only cancel appointments 2 hours in advance.',
      });
    }

    appointment.canceled_at = new Date();

    await appointment.save();

    await Queue.add(CancellationMail.key, {
      appointment,
    });

    return res.json({ appointment });
  }
}

export default new AppointmentController();
