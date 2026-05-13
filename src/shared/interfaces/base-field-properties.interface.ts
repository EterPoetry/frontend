export interface BaseFieldProperties {
    id: string;
    label: string;
    modelValue: string;
    placeholder?: string;
    maxLength?: number;
    errorMessage?: string;
    hint?: string;
    disabled?: boolean;
}
