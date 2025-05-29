import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function OnlyOneDefined(
  propertyNames: string[],
  validationOptions?: ValidationOptions,
) {
  return function (object: Object) {
    registerDecorator({
      name: 'OnlyOneDefined',
      target: object.constructor,
      propertyName: '', // no aplica a una propiedad específica
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments) {
          const object = args.object as Record<string, any>;
          const definedCount = propertyNames.filter(
            (prop) => object[prop] !== undefined && object[prop] !== null,
          ).length;
          return definedCount === 1;
        },
      },
    });
  };
}
