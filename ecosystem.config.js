module.exports = {
  apps: [
    {
      name: "MemeSlideshowAPI",
      script: "./index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
