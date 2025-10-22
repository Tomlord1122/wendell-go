<script lang="ts">
	import cv from '@techstark/opencv-js';
	import type { Mat } from '@techstark/opencv-js';
	import getPDF from '../utils/pdf2img.js';
	import type { PDFDocumentProxy } from 'pdfjs-dist';
	import { processImage } from '../utils/fileProcessor.js';
	import { tick } from 'svelte';

	interface Props {
		file: File;
		rows: number;
		pagesPerArticle: number;
		pageColumns: number[];
		processTrigger: number;
		selectedIndex?: number;
		disabled?: boolean;
		onprocessedimages: (images: File[]) => void;
		onselectedpages: (pageIndex: number) => void;
	}

	let {
		file,
		rows,
		pagesPerArticle,
		pageColumns,
		processTrigger,
		onprocessedimages,
		onselectedpages
	}: Props = $props();

	let previewUrl = $state<string>('');
	let processedMats = $state<(Mat | null)[]>([]);
	let imageFiles = $state<File[]>([]);
	let isConverting = $state(false);
	let conversionError = $state<string | null>(null);
	let canvases = $state<HTMLCanvasElement[]>([]);
	let successPages = $state<number[]>([]);
	let converted = $state(false);
	let processedImageFiles = $state<File[]>([]);
	let selectedPages = $state<number[]>([]);

	// Convert PDF to images using local utility
	async function convertPDFToImages(file: File) {
		console.log('Starting conversion');
		converted = false;
		isConverting = true;
		conversionError = null;

		try {
			console.log('file', file);
			const pdf = (await getPDF(file)) as PDFDocumentProxy;
			console.log('Conversion complete');
			canvases = new Array(pdf.numPages).fill(null);

			// Use temporary array to collect all files, then assign once
			const tempImageFiles: File[] = [];

			for (let i = 0; i < pdf.numPages; i++) {
				await tick();
				const page = await pdf.getPage(i + 1);
				const viewport = page.getViewport({ scale: 1 });
				const canvas = document.createElement('canvas');
				canvas.id = `pdf-canvas-${i + 1}`;
				const context = canvas.getContext('2d');
				if (!context) {
					throw new Error(`Failed to get 2D context for page ${i + 1}`);
				}
				canvas.height = viewport.height;
				canvas.width = viewport.width;
				console.log('canvas', canvas.width, canvas.height);
				const renderContext = {
					canvasContext: context,
					viewport: viewport
				};

				try {
					await page.render(renderContext as any).promise;
					console.log(`Page ${i + 1} rendered successfully`);
				} catch (renderError) {
					console.error(`Error rendering page ${i + 1}:`, renderError);
					throw new Error(`Failed to render page ${i + 1}`);
				}

				canvases[i] = canvas;

				// Convert each canvas to image file with error handling
				try {
					const blob = await new Promise<Blob | null>((resolve, reject) => {
						canvas.toBlob((b) => {
							if (!b) reject(new Error(`Failed to create blob for page ${i + 1}`));
							resolve(b);
						}, 'image/png');
					});

					if (!blob) {
						throw new Error(`Null blob generated for page ${i + 1}`);
					}

					const file = new File([blob], `page-${i + 1}.png`, { type: 'image/png' });
					tempImageFiles.push(file);
					console.log(`Successfully converted page ${i + 1} to image`);
				} catch (blobError) {
					console.error(`Error converting canvas to blob for page ${i + 1}:`, blobError);
					throw blobError;
				}
			}

			// Assign all files at once to trigger reactivity
			imageFiles = tempImageFiles;
			converted = true;

			console.log(
				'All pages converted:',
				imageFiles.map((f) => f.name)
			);
		} catch (error) {
			console.error('Error converting PDF:', error);
			conversionError = error instanceof Error ? error.message : 'Conversion failed';
			throw error;
		} finally {
			isConverting = false;
		}
	}

	// Track previous file to avoid re-processing
	let previousFile: File | null = null;

	// Set up preview URL and auto-convert PDF when file changes (like original Vue version)
	$effect(() => {
		if (file && file !== previousFile) {
			console.log('newFile', file);
			previousFile = file;

			if (previewUrl) {
				URL.revokeObjectURL(previewUrl);
			}
			conversionError = null;

			if (file.type === 'application/pdf') {
				previewUrl = URL.createObjectURL(file);
				// Auto-convert PDF to images (like original Vue version)
				convertPDFToImages(file);
			} else {
				previewUrl = '';
				imageFiles = [];
			}
		}
	});

	// Track previous trigger to avoid re-processing
	let previousTrigger = 0;

	// Process images when trigger changes
	$effect(() => {
		console.log('Process trigger effect:', {
			processTrigger,
			previousTrigger,
			converted,
			imageFilesLength: imageFiles.length,
			rows,
			pageColumnsLength: pageColumns.length
		});

		if (processTrigger > 0 && processTrigger !== previousTrigger) {
			console.log('Processing trigger detected, checking conditions...');

			if (converted && imageFiles.length > 0) {
				console.log('Starting image processing...');
				previousTrigger = processTrigger; // Only update after we start processing
				processImagesAsync();
			} else {
				console.log('Not processing - converted:', converted, 'imageFiles:', imageFiles.length);
				// Don't update previousTrigger here - wait until we can actually process
			}
		}
	});

	async function processImagesAsync() {
		console.log('processImagesAsync called with:', {
			imageFilesLength: imageFiles.length,
			rows,
			pageColumnsLength: pageColumns.length,
			pageColumns: pageColumns
		});

		if (imageFiles.length > 0 && rows > 0 && pageColumns.length > 0) {
			console.log('Starting image processing loop...');
			// Reset state before reprocessing
			selectedPages = [];
			processedImageFiles = [];
			successPages = [];

			// Clear previous canvases from the containers
			const processedContainer = document.querySelector('.processed-images-container');
			if (processedContainer) processedContainer.innerHTML = '';

			// Cleanup previous processed mats
			cleanupProcessedMats();

			await tick();

			for (let i = 0; i < imageFiles.length; i += pagesPerArticle) {
				let results: Mat[] = Array(pagesPerArticle).fill(null);
				let tempCanvas: HTMLCanvasElement[] = Array(pagesPerArticle).fill(null);
				await tick();
				try {
					for (let j = 0; j < pagesPerArticle; j++) {
						const pageIndex = i + j;
						if (pageIndex >= imageFiles.length) break;

						results[j] = await processImage(imageFiles[pageIndex], rows, pageColumns[j]);
						tempCanvas[j] = document.createElement('canvas');
						tempCanvas[j].width = results[j].cols;
						tempCanvas[j].height = results[j].rows;
						cv.imshow(tempCanvas[j], results[j]);
					}

					if (tempCanvas.every((canvas) => canvas !== null)) {
						const fullMergedCanvas = document.createElement('canvas');
						const maxWidth = Math.max(...results.map((result) => result.cols));
						const totalHeight = results.reduce((sum, result) => sum + result.rows, 0);

						fullMergedCanvas.width = maxWidth;
						fullMergedCanvas.height = totalHeight;

						const ctx = fullMergedCanvas.getContext('2d');
						if (ctx) {
							let currentY = 0;
							for (let j = 0; j < pagesPerArticle; j++) {
								if (tempCanvas[j] && results[j]) {
									ctx.drawImage(tempCanvas[j], 0, currentY);
									currentY += results[j].rows;
								}
							}
							fullMergedCanvas.id = `processed-image-${i}-${i + results.length - 1}`;
							fullMergedCanvas.style.border = '1px solid #ccc';
							fullMergedCanvas.style.maxWidth = '100%';
							fullMergedCanvas.style.height = 'auto';

							const mergedBlob = await new Promise<Blob>((resolve) =>
								fullMergedCanvas.toBlob((blob) => resolve(blob!), 'image/png')
							);

							const pageRange = Array.from(
								{ length: results.length },
								(_, idx) => i + idx + 1
							).join('-');

							processedImageFiles.push(
								new File([mergedBlob], `pages-${pageRange}.png`, { type: 'image/png' })
							);

							appendCanvasWithPageNumber(fullMergedCanvas, i);
						}
					}
				} finally {
					results.forEach((result) => {
						if (result) result.delete();
					});
				}
			}
			await tick();
			console.log('Calling onprocessedimages with', processedImageFiles.length, 'files');
			onprocessedimages(processedImageFiles);
		}
	}

	function cleanupProcessedMats() {
		processedMats.forEach((mat) => {
			if (mat) mat.delete();
		});
	}

	// Modify the canvas appending logic to include page numbers
	function appendCanvasWithPageNumber(canvas: HTMLCanvasElement, pageIndex: number) {
		const container = document.createElement('div');
		container.id = `page-container-${pageIndex}`; // Add ID for easy reference
		container.style.display = 'inline-block';
		container.style.position = 'relative';
		container.style.marginRight = '10px';
		container.style.cursor = 'pointer';
		container.style.transition = 'border 0.2s ease'; // Smooth transition for selection
		container.style.border = '1px solid #ccc';

		const pageNumber = document.createElement('div');
		pageNumber.id = `page-number-${pageIndex}`; // Add ID for easy reference
		pageNumber.textContent = `Page ${pageIndex + 1}`;
		pageNumber.style.position = 'absolute';
		pageNumber.style.bottom = '5px';
		pageNumber.style.left = '5px';
		pageNumber.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
		pageNumber.style.color = 'white';
		pageNumber.style.padding = '2px 5px';
		pageNumber.style.borderRadius = '3px';
		pageNumber.style.fontSize = '12px';
		pageNumber.style.transition = 'background-color 0.2s ease'; // Smooth transition

		container.appendChild(canvas);
		container.appendChild(pageNumber);

		// Add click handler for selection
		container.onclick = () => handlePageSelection(pageIndex);

		const previewContainer = document.querySelector('.processed-images-container');
		if (previewContainer) {
			previewContainer.appendChild(container);
		}
	}

	// Handle page selection logic
	function handlePageSelection(pageIndex: number) {
		console.log('Selected page index:', pageIndex);

		// Check if clicking the same page (toggle selection)
		if (selectedPages.includes(pageIndex)) {
			selectedPages = []; // Deselect if clicking the same page
			onselectedpages(-1); // Emit -1 to indicate no selection
		} else {
			// Clear previous selection first
			const previousSelection = [...selectedPages];
			selectedPages = [pageIndex];
			onselectedpages(pageIndex);
			onprocessedimages(processedImageFiles);

			// Force immediate update for previous selection
			previousSelection.forEach((prevIndex) => {
				const prevContainer = document.getElementById(`page-container-${prevIndex}`);
				const prevPageNumber = document.getElementById(`page-number-${prevIndex}`);
				if (prevContainer) {
					prevContainer.style.border = '1px solid #ccc';
				}
				if (prevPageNumber) {
					prevPageNumber.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
				}
			});
		}

		// Force update visuals after state change
		tick().then(() => {
			updateSelectionVisuals();
			console.log('Updated selection:', selectedPages);
		});
	}

	function updateSelectionVisuals() {
		// Reset all containers first
		processedImageFiles.forEach((_, index) => {
			const container = document.getElementById(`page-container-${index}`);
			const pageNumber = document.getElementById(`page-number-${index}`);
			if (container) {
				container.style.border = '1px solid #ccc';
			}
			if (pageNumber) {
				pageNumber.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
			}
		});

		// Update selected pages only if there are selections
		if (selectedPages.length > 0) {
			selectedPages.forEach((index) => {
				const container = document.getElementById(`page-container-${index}`);
				const pageNumber = document.getElementById(`page-number-${index}`);
				if (container) {
					container.style.border = '3px solid #4CAF50';
				}
				if (pageNumber) {
					pageNumber.style.backgroundColor = '#4CAF50';
				}
			});
		}
	}
</script>

{#if file}
	<div class="overflow-hidden rounded-lg border border-gray-300 bg-gray-50 shadow-sm">
		<div class="p-4">
			<!-- Conversion Status -->
			{#if isConverting}
				<div class="mb-4 text-center text-gray-600">Converting PDF pages to images...</div>
			{/if}

			<!-- PDF Preview -->
			<div class="mb-4">
				<h4 class="mb-2 text-sm font-medium text-gray-700">PDF Preview:</h4>
				<iframe
					src={previewUrl}
					class="h-[400px] w-full rounded-md border border-gray-300"
					title="PDF Preview"
				></iframe>
			</div>

			<!-- Conversion Error -->
			{#if conversionError}
				<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-center text-red-600">
					{conversionError}
				</div>
			{/if}

			<!-- Processed Images Container -->
			<div
				class="processed-images-container overflow-x-auto rounded-md border border-gray-200 bg-white p-4 whitespace-nowrap"
			>
				<h4 class="mb-2 text-sm font-medium text-gray-700">Final Processed Results:</h4>
			</div>

			<!-- Add selection instruction -->
			<div class="mb-4 text-sm text-gray-600">點擊轉向後的圖以選擇作文</div>
		</div>
	</div>
{/if}
