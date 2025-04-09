module.exports = {
  apps: [
    {
      name: "image-api",
      script: "./index.js",
      watch: true,
      env: {
        NODE_ENV: "production",
        PORT: 4000,
      },
    },
  ],
};
