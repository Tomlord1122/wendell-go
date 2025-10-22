<script lang="ts">
	import { extractTextFromImageStream } from '../services/geminiService.js';
	import StreamingMarkdown from './StreamingMarkdown.svelte';

	interface Props {
		images: File[];
		modelConfig: {
			model: string;
		};
		customPrompt?: string;
		selectedPageIndex?: number;
		onextractioncomplete: (text: string) => void;
	}

	let {
		images,
		modelConfig,
		customPrompt,
		selectedPageIndex = 0,
		onextractioncomplete
	}: Props = $props();

	let extractedText = $state('');
	let isProcessing = $state(false);
	let isStreaming = $state(false);
	let error = $state('');

	async function handleExtraction() {
		if (!images?.length || selectedPageIndex === undefined) {
			error = '請選擇圖片';
			return;
		}

		isProcessing = true;
		isStreaming = true;
		error = '';
		extractedText = ''; // Reset content for new stream

		try {
			console.log('Selected image:', {
				index: selectedPageIndex,
				totalImages: images.length,
				selectedImage: images[selectedPageIndex]
			});

			const selectedImage = images[selectedPageIndex];
			if (!selectedImage) {
				throw new Error('No image found at selected index');
			}

			// Use streaming API with evaluation prompt
			await extractTextFromImageStream(
				selectedImage,
				modelConfig,
				customPrompt, // This should be the evaluation prompt for grading
				(chunk: string) => {
					// Handle each chunk - append to existing content
					extractedText += chunk;
				},
				(fullText: string) => {
					// Handle completion - only update streaming state, don't touch extractedText
					console.log('Streaming complete, full text length:', fullText.length);
					console.log('Current extractedText length:', extractedText.length);
					isStreaming = false;
					onextractioncomplete(extractedText); // Use accumulated text, not fullText
				},
				(errorMsg: string) => {
					// Handle error
					error = `文字擷取失敗：${errorMsg}`;
					isStreaming = false;
				}
			);
		} catch (err: unknown) {
			error = `文字擷取失敗：${err instanceof Error ? err.message : '未知錯誤'}`;
			isStreaming = false;
		} finally {
			isProcessing = false;
		}
	}
</script>

<div class="mb-6">
	<div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<h2 class="m-0 font-serif text-xl font-semibold text-gray-800">批改結果</h2>
		<button
			onclick={handleExtraction}
			disabled={isProcessing || !images?.length}
			class="focus:ring-opacity-50 rounded-md px-4 py-2 text-sm font-medium text-white transition-colors duration-150 focus:ring-2 focus:outline-none focus-visible:ring-offset-2
				{isProcessing || !images?.length
				? 'cursor-not-allowed bg-gray-400 focus:ring-gray-400'
				: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'}"
			aria-describedby={isProcessing ? 'extraction-status' : undefined}
		>
			{#if isProcessing && isStreaming}
				<div class="flex items-center">
					<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
						></path>
					</svg>
					<span>AI 正在分析中...</span>
				</div>
			{:else if isProcessing}
				正在批改中...
			{:else}
				開始批改
			{/if}
		</button>
		{#if isProcessing}
			<span id="extraction-status" class="sr-only">AI 正在分析圖片內容，請稍候</span>
		{/if}
	</div>

	{#if error}
		<div
			class="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
			role="alert"
			aria-live="polite"
		>
			<div class="flex items-start">
				<svg
					class="mt-0.5 mr-3 h-4 w-4 flex-shrink-0 text-red-600"
					fill="currentColor"
					viewBox="0 0 20 20"
					aria-hidden="true"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
						clip-rule="evenodd"
					/>
				</svg>
				<span>{error}</span>
			</div>
		</div>
	{/if}

	<!-- Streaming Markdown Content -->
	<div class="min-h-[400px] w-full rounded-md border border-gray-300 bg-white p-4 shadow-sm">
		{#if extractedText || isStreaming}
			<StreamingMarkdown content={extractedText} {isStreaming} typewriterSpeed={10} />
		{:else}
			<div class="flex h-32 items-center justify-center text-gray-500">
				<div class="text-center">
					<svg
						class="mx-auto mb-2 h-8 w-8 text-gray-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
						/>
					</svg>
					<p class="text-sm">批改結果將顯示在此處...</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Raw Text Fallback (for debugging) -->
	{#if extractedText && !isStreaming}
		<details class="mt-4">
			<summary class="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
				顯示原始文字 (除錯用)
			</summary>
			<textarea
				bind:value={extractedText}
				rows="10"
				readonly
				class="resize-vertical mt-2 w-full rounded-md border border-gray-300 bg-gray-50 p-3 font-mono text-xs leading-relaxed"
			></textarea>
		</details>
	{/if}
</div>
