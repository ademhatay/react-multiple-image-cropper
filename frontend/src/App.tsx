import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';

import 'react-image-crop/dist/ReactCrop.css';

export default function App() {
	const [imgSrc, setImgSrc] = useState<string[]>([]);
	const previewCanvasRefs = useRef<any[]>([]);
	const imgRefs = useRef<any[]>([]);
	const hiddenAnchorRef = useRef<HTMLAnchorElement>(null);
	const blobUrlRef = useRef<string>('');
	const [crop, setCrop] = useState<Crop[]>([]);
	const [completedCrop, setCompletedCrop] = useState<PixelCrop[]>([]);

	useEffect(() => {
		completedCrop.forEach((crop, index) => {
			const canvas: any = previewCanvasRefs.current[index];
			const image = imgRefs.current[index];

			const scaleX = image.naturalWidth / image.width;
			const scaleY = image.naturalHeight / image.height;

			const canvasWidth = crop.width * scaleX;
			const canvasHeight = crop.height * scaleY;

			canvas.width = canvasWidth;
			canvas.height = canvasHeight;

			const ctx = canvas.getContext('2d');

			ctx?.drawImage(
				image,
				crop.x * scaleX,
				crop.y * scaleY,
				canvasWidth,
				canvasHeight,
				0,
				0,
				canvasWidth,
				canvasHeight
			);
		});
	}, [completedCrop]);

	function onSelectFiles(e: any) {
		if (e.target.files && e.target.files.length > 0) {
			setCrop([]);
			setCompletedCrop([]);

			const selectedImgSrcs: string[] = [];
			const selectedImgRefs: HTMLImageElement[] = [];

			for (let i = 0; i < e.target.files.length; i++) {
				const file = e.target.files[i];
				const reader = new FileReader();

				reader.addEventListener('load', () => {
					selectedImgSrcs.push(reader.result as string);

					if (selectedImgSrcs.length === e.target.files.length) {
						setImgSrc(selectedImgSrcs);
					}
				});

				reader.readAsDataURL(file);

				const imgRef = new Image();
				selectedImgRefs.push(imgRef);
			}

			imgRefs.current = selectedImgRefs;
		}
	}

	function onImageLoad(index: number) {
		setCrop((prevCrop) => {
			const newCrop = [...prevCrop];
			newCrop[index] = {
				x: 9.7,
				y: 19.9,
				width: 81.75,
				height: 35,
				unit: '%',
			};
			return newCrop;
		});
	}

	function onDownloadCropClick(index: number) {
		const canvasRef = previewCanvasRefs.current[index];

		if (!canvasRef) {
			throw new Error('Crop canvas does not exist');
		}

		canvasRef.toBlob((blob: any) => {
			if (!blob) {
				throw new Error('Failed to create blob');
			}

			if (blobUrlRef.current) {
				URL.revokeObjectURL(blobUrlRef.current);
			}

			blobUrlRef.current = URL.createObjectURL(blob);
			hiddenAnchorRef.current!.href = blobUrlRef.current;
			hiddenAnchorRef.current!.click();
		});
	}

	function exportAllCrops() {
		if (imgSrc.length === 0) {
			alert('Lütfen önce resim seçin.');
			return;
		}
		const zip = new JSZip();
		const imgPromises = imgSrc.map((src, index) => {
			return new Promise<void>((resolve) => {
				const canvas = previewCanvasRefs.current[index];
				console.log(src);
				
				canvas.toBlob((blob: any) => {
					zip.file(`crop_${index + 1}.png`, blob);
					resolve();
				});
			});
		});

		Promise.all(imgPromises).then(() => {
			zip.generateAsync({ type: 'blob' }).then((content) => {
				saveAs(content, 'image_crops.zip');
			});
		});
	}

	function resetState() {
		setImgSrc([]);
		setCrop([]);
		setCompletedCrop([]);
		previewCanvasRefs.current = [];
		imgRefs.current = [];
		if (blobUrlRef.current) {
			URL.revokeObjectURL(blobUrlRef.current);
		}

		const fileInput = document.getElementById('file-input') as HTMLInputElement;
		if (fileInput) {
			fileInput.value = '';
		}
	}

	return (
		<div className="App">
			<div className="Crop-Controls">
				<input id="file-input" type="file" multiple accept="image/*" onChange={onSelectFiles} />
				<button onClick={exportAllCrops}>Hepsini İndir</button>
				<button onClick={resetState}>Reset</button>
			</div>
			{imgSrc && Array.isArray(imgSrc) && imgSrc.length > 0 && (
				<div className="Crop-Container">
					{imgSrc.map((src, index) => (
						<div key={index} className="Crop-Item">
							<ReactCrop
								crop={crop[index]}
								onChange={(_, percentCrop) => {
									setCrop((prevCrop) => {
										const newCrop = [...prevCrop];
										newCrop[index] = percentCrop;
										return newCrop;
									});
								}}
								onComplete={(c) => {
									setCompletedCrop((prevCompletedCrop) => {
										const newCompletedCrop = [...prevCompletedCrop];
										newCompletedCrop[index] = c;
										return newCompletedCrop;
									});
								}}
								className="Crop-Image"
							>
								<img
									ref={(imgRef) => (imgRefs.current[index] = imgRef)}
									alt={`Crop me ${index}`}
									src={src}
									onLoad={() => onImageLoad(index)}
									className="Crop-Img"
								/>
							</ReactCrop>

							{!!completedCrop[index] && (
								<div className="Crop-Result">
									<canvas
										ref={(canvasRef) => (previewCanvasRefs.current[index] = canvasRef)}
										className="Crop-Canvas"
										
									/>
									<div className="Crop-Buttons">
										<button onClick={() => onDownloadCropClick(index)}>Download Crop</button>
										<a
											ref={hiddenAnchorRef}
											download
											style={{
												position: 'absolute',
												top: '-200vh',
												visibility: 'hidden',
											}}
										>
											Hidden download
										</a>
									</div>
								</div>
							)}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
