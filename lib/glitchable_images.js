;(function($){
	window.GlitchableImages = function(selector) {
		var base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
			base64Map = base64Chars.split(""),
			reverseBase64Map = false,
			hover_img = false,
			elSelector = selector;

		function setupReverseBase64Map() {
			reverseBase64Map = {};
			base64Map.forEach(function(val, key) { 
				reverseBase64Map[val] = key;
			});
		}
		
		function detectJpegHeaderSize(data) {
			var jpgHeaderLength = 417;
			for (var i = 0, l = data.length; i < l; i++) {
				if (data[i] == 0xFF && data[i+1] == 0xDA) {
					//console.log("xxxxxxx<<<<", data[i], data[i+1], i, l);
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
		
		function glitchJpegBytes(strArr, jpgHeaderLength) {
			var rnd = Math.floor(jpgHeaderLength + Math.random() * (strArr.length - jpgHeaderLength - 4));
			strArr[rnd] = Math.floor(Math.random() * 256);
		}
		
		function glitchJpeg() {
			try {
				var glitchCopy = hover_img.dataArr.slice();
				for (var i = 0; i < 10; i++) {
					glitchJpegBytes(glitchCopy, hover_img.headerLength);
				}
				var new_img = new Image();
				new_img.onload = function() {
					// if the load event fires after we've moused off
					if (typeof(hover_img.ctx)==="undefined") return;
					hover_img.ctx.drawImage(new_img, 0, 0, hover_img.width, hover_img.height);
				};
				new_img.src = byteArrayToBase64(glitchCopy);
			}
			catch(e) {
				// nothing, we'll just assume that we moused off at the same time.
			}
		}

		function unglitch(this_img) {
			try {
				var new_img = new Image();
				new_img.onload = function() {
					this_img.ctx.drawImage(new_img, 0, 0, this_img.width, this_img.height);
				};
				new_img.src = byteArrayToBase64(this_img.dataArr);
			}
			catch(e) {
				// nothing, we'll just assume that we moused off at the same time.
			}
		}

		function setupGlitchableImage(event) {
			var img = this.page_img;

			console.log("setupGlitchableImage ", img);

			var $img = $(img);
			var $canvas = $('<canvas width="'+$img.width()+'" height="'+$img.height()+'">');

			$img.wrap('<span class="glitchable_container"></span>');
			$img.after($canvas);

			// console.log("created context for "+this.getAttribute("src"));

			try {
				img.ctx = $canvas[0].getContext('2d');
				img.ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, $img.width(), $img.height());
				img.jpgImgData = $canvas[0].toDataURL("image/jpeg");
				img.dataArr = base64ToByteArray(img.jpgImgData);
				img.headerLength = detectJpegHeaderSize(img.dataArr);
			}
			catch(e) {
				console.log("Cannot glitch "+img.getAttribute("src")+", probably due to same-origin restrictions.");
			}
		}

		function onImageMouseOver(event) {
			// console.log("onImageMouseOver: "+event);
			hover_img = $(event.target).prev("img")[0];
		}

		function onImageMouseMove(event) {
			// console.log("onImageMouseMove: "+event);
			requestAnimationFrame(glitchJpeg);
		}

		function onImageMouseOut(event) {
			// console.log("onImageMouseOut: "+event);
			unglitch(hover_img);
			hover_img = false;
		}

		function resize() {
			$(".glitchable_container canvas").each(function() {
				var $img = $(this).siblings("img");
				console.group($.trim($(this).closest("article").find("h2").text()));
				console.log(this);
				console.log("setting width to ", $img.width());
				$(this)
					.attr("width", $img.width())
					.attr("height", $img.height());
				console.log(this);
				console.groupEnd();
			});
		}

		function init() {
			if (!reverseBase64Map) {
				setupReverseBase64Map();
			}
			console.group("GlitchableImages.init: ", elSelector);
			$(elSelector).each(function() {
				if (this.ctx) {
					console.log("Skipping ", this);
					return;
				}
				this.load_img = new Image();
				this.load_img.page_img = this;
				$(this.load_img).load(setupGlitchableImage);
				this.load_img.src = this.getAttribute("src");
			});
			console.groupEnd();
			$("body")
				.on("mouseover", ".glitchable_container", onImageMouseOver)
				.on("mousemove", ".glitchable_container", onImageMouseMove)
				.on("mouseout", ".glitchable_container", onImageMouseOut);
		}

		return {
			'onResize': resize,
			'init': init
		};
	};
})(jQuery);
