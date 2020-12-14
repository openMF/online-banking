import { AbstractControl, ValidatorFn } from '@angular/forms';

export function principalValidator(bounds): ValidatorFn {
    return (control: AbstractControl): { [key: string]: any } | null =>  {
        const forbidden = control.value &&
            (control.value < bounds.lower || control.value > bounds.upper);
        return forbidden ? { forbiddenPrincipal: {bounds} } : null;
    };
}
