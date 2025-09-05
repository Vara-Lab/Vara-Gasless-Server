import { registerDecorator, ValidationArguments, ValidationOptions } from "class-validator";

export function IsVaraAddress(validationOptions?: ValidationOptions) {
    return function(object: Object, propertyName: string) {
        registerDecorator({
            name: "isVaraAddress",
            target: object.constructor,
            propertyName,
            options: validationOptions,
            validator: {
                validate(value: any, validationArguments: ValidationArguments) {
                    return typeof value === "string" && /^0x[a-fA-F0-9]{40,}$/.test(value);
                }
            },
            
        })
    }
}