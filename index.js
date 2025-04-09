const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();
const port = process.env.PORT || 4000;
const cors = require("cors"); // Add this line

// Setup Multer to store files in /images
const storage = multer.diskStorage({
  destination: "images/", // Images will be stored here
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  },
});
const upload = multer({ storage });
app.use(cors()); // Add this line to allow CORS for all origins

// Serve static files from the /images folder
app.use("/images", express.static("images"));

app.use(express.json());

// GET /GetNextImage - Fetch a random image from the /images folder
app.get("/GetNextImage", (req, res) => {
  console.log("GetNextImage Request");

  fs.readdir("images/", (err, files) => {
    if (err) {
      console.error("Error reading images folder:", err);
      return res.status(500).send("Server error.");
    }

    if (files.length === 0) {
      console.log("No images found.");
      return res.status(404).send("No images found.");
    }

    // Select a random image from the folder
    const randomImage = files[Math.floor(Math.random() * files.length)];
    console.log("Random image selected:", randomImage);

    res.json({
      filename: randomImage,
      url: `http://51.12.220.246:4000/images/${randomImage}`,
    });
  });
});

// POST /SaveImage - Save an uploaded image to the /images folder
app.post("/SaveImage", upload.single("image"), (req, res) => {
  console.log("SaveImage Request");

  if (!req.file) {
    console.log("No image uploaded.");
    return res.status(400).send("No image uploaded.");
  }

  console.log("Image uploaded:", req.file.filename);
  res.json({ message: "Image saved.", filename: req.file.filename });
});

// Start the server
app.listen(port, () => {
  console.log(`API running on http://51.12.220.246:${port}`);
});
