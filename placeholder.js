const imageSize = require('image-size');
const DataUri = require('datauri');
const sharp = require('sharp');
const getPixels = require('get-pixels');

function resizeImage(buffer, width) {
  return sharp(buffer)
    .resize(width)
    .toBuffer();
}

function bufferToDataUri(type, buffer) {
  return new DataUri().format(type, buffer).content;
}

function getColor(buffer, size) {
  return new Promise((resolve, reject) => {
    sharp(buffer).resize(2, 2).toBuffer().then((shrinkedImageBuffer) => {
      const type = `image/${size.type}`;
      getPixels(shrinkedImageBuffer, type, (err, pixels) => {
        if (err) {
          return reject(err);
        }
        return resolve([pixels.data[0], pixels.data[1], pixels.data[2], pixels.data[3]]);
      });
    });
  });
}

function createPlaceholder(content, width = 8) {
  return resizeImage(content, width).then((resizedBuffer) => {
    const size = imageSize(resizedBuffer);
    const ratio = (size.height / size.width);
    return {
      url: bufferToDataUri(`.${size.type}`, resizedBuffer),
      ratio,
      size,
    };
  }).then((placeholder) => {
    return getColor(content, placeholder.size).then((color) => {
      return {
        color,
        url: placeholder.url,
        ratio: placeholder.ratio,
      };
    });
  });
}

module.exports = function placeholderLoader(content) {
  if (this.cacheable) {
    this.cacheable();
  }
  const callback = this.async();

  createPlaceholder(content)
    .then((placeholder) => {
      callback(null, `module.exports = ${JSON.stringify(placeholder)}`);
    }, callback);
};

module.exports.raw = true;
