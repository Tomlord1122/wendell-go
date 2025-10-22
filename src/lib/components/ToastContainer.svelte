<script lang="ts">
	import { toastStore } from '../stores/toastStore.js';
	import Toast from './Toast.svelte';

	let toasts = $state(toastStore);

	function handleToastClose(id: string) {
		toastStore.remove(id);
	}
</script>

<div class="pointer-events-none fixed inset-0 z-50" aria-live="polite" aria-label="通知區域">
	<div class="flex min-h-screen flex-col items-end justify-start space-y-2 p-4 sm:p-6">
		{#each $toasts as toast (toast.id)}
			<Toast
				message={toast.message}
				type={toast.type}
				visible={toast.visible}
				onclose={() => handleToastClose(toast.id)}
			/>
		{/each}
	</div>
</div>
