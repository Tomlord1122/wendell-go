import { GoogleGenerativeAI } from '@google/generative-ai';

interface GeminiResponse {
	text: string;
	error?: string;
}

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export async function extractTextFromImage(
	imageFile: File,
	modelConfig: { model: string },
	customPrompt?: string
): Promise<GeminiResponse> {
	try {
		const model = genAI.getGenerativeModel({ model: modelConfig.model });

		// Convert image to GenerativeContent
		const imageData = await fileToGenerativePart(imageFile);
		console.log(imageData);

		// Prepare prompt
		const defaultPrompt = `請仔細分析這張圖片中的文字內容，並按照以下要求進行：
1. 保持原始的文字排版和格式
2. 確保繁體中文字符的正確識別
3. 保留標點符號
4. 如果有多欄文字，請按照由左至右、由上至下的順序處理
5. 移除任何不必要的空白行
請輸出完整的文字內容。`;

		const prompt = customPrompt || defaultPrompt;

		// Make request to Gemini
		const result = await model.generateContent([prompt, imageData]);
		const response = result.response;
		const text = response.text();

		return { text };
	} catch (error) {
		console.error('Gemini API error:', error);
		return {
			text: '',
			error: error instanceof Error ? error.message : '發生未知錯誤'
		};
	}
}

// Helper function to convert File to GenerativePart
async function fileToGenerativePart(file: File) {
	try {
		const base64Data = await fileToBase64(file);
		return {
			inlineData: {
				data: base64Data.split(',')[1],
				mimeType: file.type
			}
		};
	} catch (error) {
		console.error('Error converting image:', error);
		throw error;
	}
}

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.readAsDataURL(file);
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (error) => reject(error);
	});
}

// New streaming function for typewriter effect
export async function extractTextFromImageStream(
	imageFile: File,
	modelConfig: { model: string },
	customPrompt?: string,
	onChunk?: (chunk: string) => void,
	onComplete?: (fullText: string) => void,
	onError?: (error: string) => void
): Promise<void> {
	try {
		const model = genAI.getGenerativeModel({ model: modelConfig.model });

		// Convert image to GenerativeContent
		const imageData = await fileToGenerativePart(imageFile);

		// Use the provided evaluation prompt (should contain grading rules)
		if (!customPrompt) {
			throw new Error('No evaluation prompt provided');
		}

		console.log('Using evaluation prompt for streaming analysis');

		// Make streaming request to Gemini with evaluation prompt
		const result = await model.generateContentStream([customPrompt, imageData]);

		let fullText = '';

		for await (const chunk of result.stream) {
			const chunkText = chunk.text();
			fullText += chunkText;
			onChunk?.(chunkText);
		}

		onComplete?.(fullText);
	} catch (error) {
		console.error('Gemini API streaming error:', error);
		onError?.(error instanceof Error ? error.message : '發生未知錯誤');
	}
}
