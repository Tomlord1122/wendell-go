<script lang="ts">
	import { marked } from 'marked';
	import { tick } from 'svelte';

	interface Props {
		content: string;
		isStreaming: boolean;
		typewriterSpeed?: number;
	}

	let { content, isStreaming, typewriterSpeed = 20 }: Props = $props();

	let displayedContent = $state('');

	// Configure marked for better Chinese text handling
	marked.setOptions({
		breaks: true,
		gfm: true
	});

	// Simple effect to update displayed content
	$effect(() => {
		if (isStreaming) {
			// During streaming, show content as it comes (real-time)
			displayedContent = content;
		} else {
			// When not streaming, show full content immediately
			displayedContent = content;
		}
	});
</script>

<!-- Display content in textarea-like format -->
<div class="relative">
	<textarea
		value={displayedContent}
		readonly
		rows="15"
		placeholder="批改結果將顯示在此處..."
		class="resize-vertical focus:ring-opacity-50 w-full rounded-md border border-gray-300 bg-white p-3 text-sm leading-relaxed text-gray-800 transition-colors duration-150 focus:ring-2 focus:ring-blue-500 focus:outline-none"
		style="font-family: 'Microsoft JhengHei', 'PingFang TC', 'Helvetica Neue', Arial, sans-serif;"
		aria-live="polite"
		aria-label="AI批改結果"
	></textarea>

	<!-- Typing indicator -->
	{#if isStreaming}
		<div
			class="absolute right-3 bottom-3 flex items-center space-x-2 rounded-md bg-white/90 px-2 py-1 shadow-sm"
			aria-live="polite"
		>
			<svg
				class="h-4 w-4 animate-spin text-blue-600"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
				></circle>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				></path>
			</svg>
			<span class="text-xs font-medium text-blue-600">正在輸入...</span>
		</div>
	{/if}
</div>
