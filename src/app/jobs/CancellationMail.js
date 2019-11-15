import { format, parseISO } from 'date-fns';
import pt from 'date-fns/locale/pt';
import { Mail } from '../../lib';

class CancellationMail {
  get key() {
    return 'CancellationMail';
  }

  async handle({ data }) {
    const { appointment } = data;
    const {
      provider: { name, email },
      user: { name: userName },
      date,
    } = appointment;

    await Mail.sendMail({
      to: `${name} <${email}>`,
      subject: 'Agendamento cancelado',
      template: 'cancellation',
      context: {
        provider: name,
        user: userName,
        date: format(parseISO(date), "dd 'de' MMM', às' H:mm'h'", {
          locale: pt,
        }),
      },
    });
  }
}

export default new CancellationMail();
