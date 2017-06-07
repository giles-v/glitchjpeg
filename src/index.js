'use strict';

const base64Map = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('');
const reverseBase64Map = reverseArrToObj(base64Map);
let attachedImages;

function checkCompat() {
	const hasQS = 'querySelectorAll' in document;
	let hasCanvas = false;
	try {
		var canvas = document.createElement('canvas');
		var context = canvas.getContext('2d');
		hasCanvas = !!context;
	} catch(e) {}
	return hasQS && hasCanvas;
}

function reverseArrToObj(arr) {
	const obj = {};
	arr.forEach(function(val, key) { obj[val] = key; });
	return obj;
}

function detectJpegHeaderSize(data) {
	var jpgHeaderLength = 417;
	for (var i = 0, l = data.length; i < l; i++) {
		if (data[i] == 0xFF && data[i+1] == 0xDA) {
			jpgHeaderLength = i + 2;
			return jpgHeaderLength;
		}
	}
	return jpgHeaderLength;
}

// base64 is 2^6, byte is 2^8, every 4 base64 values create three bytes
function base64ToByteArray(str) {
	var result = [], digitNum, cur, prev;
	for (var i = 23, l = str.length; i < l; i++) {
		cur = reverseBase64Map[str.charAt(i)];
		digitNum = (i-23) % 4;
		switch(digitNum){
			//case 0: first digit - do nothing, not enough info to work with
			case 1: //second digit
				result.push(prev << 2 | cur >> 4);
				break;
			case 2: //third digit
				result.push((prev & 0x0f) << 4 | cur >> 2);
				break;
			case 3: //fourth digit
				result.push((prev & 3) << 6 | cur);
				break;
		}
		prev = cur;
	}
	return result;
}

function byteArrayToBase64(arr) {
	var result = ["data:image/jpeg;base64,"], byteNum, cur, prev;
	for (var i = 0, l = arr.length; i < l; i++) {
		cur = arr[i];
		byteNum = i % 3;
		switch (byteNum) {
			case 0: //first byte
				result.push(base64Map[cur >> 2]);
				break;
			case 1: //second byte
				result.push(base64Map[(prev & 3) << 4 | (cur >> 4)]);
				break;
			case 2: //third byte
				result.push(base64Map[(prev & 0x0f) << 2 | (cur >> 6)]);
				result.push(base64Map[cur & 0x3f]);
				break;
		}
		prev = cur;
	}
	if (byteNum === 0) {
		result.push(base64Map[(prev & 3) << 4]);
		result.push("==");
	} else if (byteNum == 1) {
		result.push(base64Map[(prev & 0x0f) << 2]);
		result.push("=");
	}
	return result.join("");
}

function getCorruptedByteArray(img, percentVal) {
	let newByteArray = img.byteArray.slice();
	for (let i = 0; i < 10; i++) {
		const offset = Math.floor(img.headerLength + Math.random() * (newByteArray.length - img.headerLength - 4));
		const newByte = Math.floor(Math.random() * 256);
		newByteArray[offset] = newByte;
	}
	return newByteArray;
}

function glitch(img, percentVal) {
	const imageData = (percentVal)
		? getCorruptedByteArray(img, percentVal)
		: img.byteArray;

	const bufferImage = new Image();
	bufferImage.onload = (e) => {
		img.context.drawImage(
			bufferImage,
			0, 0, bufferImage.width, bufferImage.height
		);
	}
	bufferImage.src = byteArrayToBase64(imageData);
}

function wrapImageElement(img, imgDims) {
	// create a wrapping span, drop it before the <img>
	const wrap = document.createElement('span');
	wrap.setAttribute('class', 'glitch__container');
	wrap.setAttribute('style', 'position: relative; display: inline-block;');
	img.parentNode.insertBefore(wrap, img);

	// then put the <img> inside it
	wrap.appendChild(img);

	// then append a <canvas>, to use as the overlaid draw surface
	const canvas = document.createElement('canvas');
	canvas.setAttribute('width', imgDims.width);
	canvas.setAttribute('height', imgDims.height);
	canvas.setAttribute('style', 'position: absolute; top: 0; left: 0; pointer-events: none; z-index: 1;');
	wrap.appendChild(canvas);

	// save some references on the image, so it holds state
	img.canvas = canvas;
	img.context = canvas.getContext('2d');
	img.wrap = wrap;

	return img;
}

function setupImage(img) {
	const imgDims = img.getBoundingClientRect();

	img = wrapImageElement(img, imgDims);

	img.context.drawImage(
		img,
		0, 0, img.naturalWidth, img.naturalHeight,
		0, 0, imgDims.width, imgDims.height
	);

	img.byteArray = base64ToByteArray(img.canvas.toDataURL("image/jpeg"));
	img.headerLength = detectJpegHeaderSize(img.byteArray);

	return img;
}

function checkPixelPermissions(img, canvas) {
	try {
		const success = canvas.getContext('2d').drawImage(img, 0, 0, 10, 10, 0, 0, 10, 10);
		return true;
	}
	catch(e) {
		console.error("Cannot glitch "+img.getAttribute("src"), e.message);
	}

	return false;
}

export var attachTo = (selector) => {
	if (!checkCompat()) return [];

	const images = document.querySelectorAll(selector);

	const testCanvas = document.createElement('canvas');
	const permittedImages = Array.prototype.filter.call(
		images,
		(img) => checkPixelPermissions(img, testCanvas)
	);

	attachedImages = Array.prototype.map.call(permittedImages, setupImage);

	return attachedImages;
};

export const apply = (img, percentVal) => {
	if (!attachedImages.includes(img)) {
		console.error('glitchjpeg: unattached image', img);
		return;
	}
	requestAnimationFrame(() => glitch(img, percentVal));
};

export const applyRandom = (img) => {
	const percentVal = Math.round(100 * Math.random());
	return apply(img, percentVal);
};

export const resize = (img) => {
	const imgDims = img.getBoundingClientRect();
	img.canvas.setAttribute('width', imgDims.width);
	img.canvas.setAttribute('height', imgDims.height);
};

export const resizeAll = () => {
	attachedImages.forEach((img) => {
		const imgDims = img.getBoundingClientRect();
		img.canvas.setAttribute('width', imgDims.width);
		img.canvas.setAttribute('height', imgDims.height);
	});
};

export const autoResize = (enabled) => {
	if (!window) {
		console.log('autoResize toggled attempted, but no "window" object found.');
		return;
	}
	if (enabled) {
		window.addEventListener('resize', resizeAll);
	}
	else {
		window.removeEventListener('resize', resizeAll);
	}
};
