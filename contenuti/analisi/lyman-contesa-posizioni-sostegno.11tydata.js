module.exports = {
  eleventyComputed: {
    immagine: (data) => ({
      ...(data.immagine || {}),
      file: "/immagini/strategia/STR2-lyman.png"
    })
  }
};
