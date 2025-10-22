<script lang="ts">
	import PDFPreview from './PDFPreview.svelte';
	import TextExtractor from './TextExtractor.svelte';
	import JSZip from 'jszip';
	import { textExtractorPrompt } from '../utils/prompts.js';

	// Reactive state using Svelte 5 runes
	let files = $state<File[]>([]);
	let error = $state('');
	let processedImages = $state<File[]>([]);

	// Processing inputs
	let rows = $state(0);
	let pagesPerArticle = $state(2);
	let useUniformColumns = $state(false);
	let processTrigger = $state(0);
	let pageColumns = $state<number[]>([]);

	// Model selection
	const modelOptions = [
		{ value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
		{ value: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash 8B' },
		{ value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro' },
		{ value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' },
		{ value: 'gemini-2.0-pro-exp-02-05', label: 'Gemini 2.0 Pro Exp' }
	];
	let selectedModel = $state('gemini-1.5-flash');

	// Page selection state
	let selectedPageIndex = $state<number>(0);
	let isProcessing = $state(false);

	let customPrompt = $state(textExtractorPrompt);
	let cols = $state(0);
	let extractedText = $state('');

	// Watch for changes in pagesPerArticle and useUniformColumns
	$effect(() => {
		if (useUniformColumns) {
			pageColumns = Array(pagesPerArticle).fill(cols);
		} else {
			// Preserve existing values when switching to individual columns
			const currentCols = [...pageColumns];
			pageColumns = Array(pagesPerArticle)
				.fill(0)
				.map((_, i) => currentCols[i] || 0);
		}
	});

	// Watch for changes in cols when using uniform columns
	$effect(() => {
		if (useUniformColumns) {
			pageColumns = Array(pagesPerArticle).fill(cols);
		}
	});

	function handleChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];

			if (!validTypes.includes(input.files[0].type)) {
				error = '請上傳 JPG、PNG 或 PDF 檔案';
				return;
			}

			files = Array.from(input.files);
			error = '';
			processedImages = [];
		}
	}

	function handleProcessedImages(images: File[]) {
		console.log('Processed images:', images.length);
		processedImages = images;
		isProcessing = false;
	}

	function handleSelectedPages(pageIndex: number) {
		console.log('Selected page:', pageIndex);
		selectedPageIndex = Math.floor(pageIndex / pagesPerArticle);
	}

	async function handleDownloadAll() {
		try {
			const zip = new JSZip();

			processedImages.forEach((file, index) => {
				zip.file(`page-${index + 1}.png`, file);
			});

			const content = await zip.generateAsync({
				type: 'blob',
				compression: 'DEFLATE',
				compressionOptions: {
					level: 6
				}
			});

			const link = document.createElement('a');
			link.href = URL.createObjectURL(content);
			link.download = files[0].name.replace(/\.[^.]+$/, '') + '.zip';
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(link.href);
		} catch (err) {
			console.error('Error creating zip:', err);
			error = '建立壓縮檔時發生錯誤';
		}
	}

	function handleExtractionComplete(text: string) {
		extractedText = text;
	}

	function handleInputSet() {
		if (rows <= 0) {
			error = '請輸入有效的列數（大於 0）';
			return;
		}

		if (!pageColumns.every((col) => col > 0)) {
			error = '請確保每頁的行數都大於 0';
			return;
		}

		try {
			isProcessing = true;
			processTrigger++;
		} catch (err) {
			console.error('Error processing images:', err);
			error = '處理圖片時發生錯誤，請重試';
		}
	}
</script>

<div class="mx-auto max-w-2xl rounded-lg border border-gray-300 bg-white p-6 shadow-md">
	<h2 class="mb-6 border-b border-gray-400 pb-2 font-serif text-2xl font-bold text-gray-800">
		改作文gem
	</h2>
	<div class="prose prose-sm mb-6 text-gray-700">
		<p>
			請上傳一個 PDF
			檔案，或圖片最多兩張(正反面(todo))。上傳會先顯示預覽，確定無誤再轉向。最後再送出給 AI 評分。
			PDF 若需重新輸入資訊，請重整頁面重新上傳。若轉向圖有問題，請確保網格明確。
		</p>
	</div>

	<!-- Error Display -->
	{#if error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
			{error}
		</div>
	{/if}

	<!-- File Upload -->
	<div class="mb-6">
		<label for="file-upload" class="mb-2 block font-medium text-gray-700"
			>上傳檔案 (JPG, PNG, 或 PDF)</label
		>
		<input
			id="file-upload"
			type="file"
			accept=".jpg,.jpeg,.png,.pdf"
			onchange={handleChange}
			class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
			multiple
		/>
	</div>

	<!-- Input Fields -->
	<div class="mb-6 space-y-4">
		<!-- Pages per Article -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="pages-per-article" class="mb-2 block font-medium text-gray-700"
					>每篇文章頁數</label
				>
				<input
					id="pages-per-article"
					type="number"
					min="1"
					bind:value={pagesPerArticle}
					class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label for="rows-input" class="mb-2 block font-medium text-gray-700">列數</label>
				<input
					id="rows-input"
					type="number"
					min="0"
					bind:value={rows}
					class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		</div>

		<!-- Uniform Columns Toggle -->
		<div class="flex items-center space-x-2">
			<input
				type="checkbox"
				bind:checked={useUniformColumns}
				id="uniformColumns"
				class="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			/>
			<label for="uniformColumns" class="font-medium text-gray-700"> 所有頁面使用相同行數 </label>
		</div>

		<!-- Uniform Columns Input -->
		{#if useUniformColumns}
			<div>
				<label for="uniform-cols" class="mb-2 block font-medium text-gray-700">每頁行數</label>
				<input
					id="uniform-cols"
					type="number"
					min="0"
					bind:value={cols}
					class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
				/>
			</div>
		{:else}
			<!-- Individual Page Columns -->
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
				{#each Array(pagesPerArticle) as _, index}
					<div>
						<label for="page-cols-{index}" class="mb-2 block font-medium text-gray-700">
							第 {index + 1} 頁行數
						</label>
						<input
							id="page-cols-{index}"
							type="number"
							min="0"
							bind:value={pageColumns[index]}
							class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="mb-6 flex gap-2">
		<button
			onclick={handleInputSet}
			class="rounded-md bg-blue-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-blue-700"
		>
			轉向
		</button>

		<button
			onclick={handleDownloadAll}
			disabled={!processedImages?.length}
			class="rounded-md bg-green-600 px-4 py-2 text-white transition-colors duration-200 hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
		>
			Download All Images
		</button>
	</div>

	<!-- PDF Preview Component -->
	{#if files && files[0]?.type.startsWith('application/') && files?.length == 1}
		<PDFPreview
			file={files[0]}
			{rows}
			{pagesPerArticle}
			{pageColumns}
			{processTrigger}
			selectedIndex={selectedPageIndex}
			disabled={isProcessing}
			onprocessedimages={handleProcessedImages}
			onselectedpages={handleSelectedPages}
		/>
	{/if}

	<!-- Model Selection -->
	<div class="mb-6">
		<label for="model-select" class="mb-2 block font-medium text-gray-700">Select Model</label>
		<select
			id="model-select"
			bind:value={selectedModel}
			class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
		>
			{#each modelOptions as option}
				<option value={option.value}>
					{option.label}
				</option>
			{/each}
		</select>
	</div>

	<!-- Prompt Input -->
	<div class="mb-6">
		<label for="custom-prompt" class="mb-2 block font-medium text-gray-700">AI 批改 Prompt</label>
		<input
			id="custom-prompt"
			bind:value={customPrompt}
			class="w-full rounded-md border border-gray-300 p-2 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
		/>
	</div>

	<!-- AI Processing Component -->
	{#if processedImages.length}
		<TextExtractor
			images={processedImages}
			{selectedPageIndex}
			{customPrompt}
			modelConfig={{ model: selectedModel }}
			onextractioncomplete={handleExtractionComplete}
		/>
	{/if}
</div>
