const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors"); // Add this line

const app = express();
const port = process.env.PORT || 4000;

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
      url: `https://51.12.220.246:4000/images/${randomImage}`, // Use HTTPS here
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
  res.json({
    message: "Image saved.",
    filename: req.file.filename + generateRandomDigits(),
  });
});

// HTTPS server configuration
const server = https.createServer(
  {
    key: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/privkey.pem"), // Replace with the path to your private key
    cert: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/fullchain.pem"), // Replace with the path to your full certificate chain
  },
  app
);

// Start the HTTPS server
server.listen(port, () => {
  console.log(`API running on https://51.12.220.246:${port}`);
});

function generateRandomDigits() {
  let randomDigits = "";
  for (let i = 0; i < 10; i++) {
    randomDigits += Math.floor(Math.random() * 10); // Generates a random digit between 0 and 9
  }
  return randomDigits;
}

app.delete("/DeleteImage/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "images", filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting image "${filename}":`, err);
      return res.status(404).json({ message: "Image not found." });
    }

    console.log(`Image "${filename}" deleted.`);
    res.json({ message: "Image deleted." });
  });
});

app.get("/GetAllImages", (req, res) => {
  console.log("GetAllImages Request");
  fs.readdir(path.join(__dirname, "images"), (err, files) => {
    if (err) {
      console.error("Failed to read images folder:", err);
      return res.status(500).send("Server error");
    }

    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|bmp|webp|png|jfif|PNG)$/i.test(file)
    );
    res.json(imageFiles);
  });
});
