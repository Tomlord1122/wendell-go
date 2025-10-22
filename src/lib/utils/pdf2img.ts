import * as pdfjsLib from 'pdfjs-dist';

export default async function pdfToImg(pdfFile: Blob) {
	const reader = new FileReader();
	reader.readAsArrayBuffer(pdfFile);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const data: any = await new Promise((resolve) => {
		reader.onload = () => {
			resolve(reader.result);
		};
	});
	const pdfData = new Uint8Array(data);

	pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
		'pdfjs-dist/build/pdf.worker.mjs',
		import.meta.url
	).toString();

	const pdf = await pdfjsLib.getDocument(pdfData).promise;
	return pdf;
}
