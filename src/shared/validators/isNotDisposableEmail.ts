import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const DISPOSABLE_DOMAINS = new Set<string>([
  'yopmail.com',
  'mailinator.com',
  'mailinator.net',
  'mailinator.org',
  '10minutemail.com',
  '10minutemail.net',
  '20minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'guerrillamail.info',
  'guerrillamailblock.com',
  'sharklasers.com',
  'grr.la',
  'temp-mail.org',
  'temp-mail.io',
  'tempmail.com',
  'tempmailo.com',
  'tempail.com',
  'throwawaymail.com',
  'dispostable.com',
  'getnada.com',
  'getairmail.com',
  'maildrop.cc',
  'mohmal.com',
  'trashmail.com',
  'trashmail.de',
  'trashmail.net',
  'fakeinbox.com',
  'fakemailgenerator.com',
  'mytemp.email',
  'tempinbox.com',
  'spam4.me',
  'spambox.us',
  'spambog.com',
  'emailondeck.com',
  'inboxkitten.com',
  'mintemail.com',
  'moakt.com',
  'mailnesia.com',
  'mytrashmail.com',
  'nowmymail.com',
  'tempmailaddress.com',
  'burnermail.io',
  'disposablemail.com',
  'mail-temp.com',
  'mailcatch.com',
  'mailnull.com',
  'mvrht.net',
  'notmailinator.com',
  'yopmail.fr',
  'yopmail.net',
]);

export function IsNotDisposableEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsNotDisposableEmail',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true;
          const at = value.lastIndexOf('@');
          if (at === -1) return true;
          const domain = value.slice(at + 1).trim().toLowerCase();
          return !DISPOSABLE_DOMAINS.has(domain);
        },
        defaultMessage(args: ValidationArguments) {
          return `El dominio del correo "${args.value}" no está permitido`;
        },
      },
    });
  };
}
