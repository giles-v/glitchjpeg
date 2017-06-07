# glitchjpeg

A javascript library for applying JPEG corruption glitch effects to images on the front-end. It does this by overlaying a canvas on applicable images.

## Usage

A `glitchjpeg.browser.js` file is included which exports a top-level object named `glitchjpeg`. The main entry point is written in ES6 and is intended for direct consumption by bundlers etc.

In a browser:

```html
<script src="js/glitchjpeg.browser.js"></script>
```

In a bundled environment:

```javascript
import glitchjpeg from 'glitchjpeg';
```

Then to invoke:

```javascript
// attachTo sets up glitching on images. It returns an array of elements.
var glitchables = glitchjpeg.attachTo('.glitch-this');
for (var i = 0; i < glitchables.length; i++) {
  // apply a random glitch level
  glitchables.applyRandom(img);
}
```

## Compatibility

The library uses `document.querySelectorAll` and `canvas.context2d`. Without those, it will fail silently.
