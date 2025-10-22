import { writable } from 'svelte/store';

export interface ToastMessage {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
	visible: boolean;
}

function createToastStore() {
	const { subscribe, update } = writable<ToastMessage[]>([]);

	return {
		subscribe,
		add: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
			const id = crypto.randomUUID();
			const toast: ToastMessage = {
				id,
				message,
				type,
				visible: true
			};

			update((toasts) => [...toasts, toast]);

			return id;
		},
		remove: (id: string) => {
			update((toasts) => toasts.filter((t) => t.id !== id));
		},
		clear: () => {
			update(() => []);
		}
	};
}

export const toastStore = createToastStore();
