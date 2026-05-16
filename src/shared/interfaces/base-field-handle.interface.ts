export interface BaseFieldHandle {
    focus: () => void;
    setSelectionRange: (start: number, end: number) => void;
    getControlElement: () => HTMLInputElement | HTMLTextAreaElement | null;
}
