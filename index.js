const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors"); // Add this line

const app = express();
const port = process.env.PORT || 4000;

const sendNextQueue = [];

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

    let selectedImage;

    // Serve from queue first
    while (sendNextQueue.length > 0) {
      const nextFromQueue = sendNextQueue.shift();
      if (files.includes(nextFromQueue)) {
        selectedImage = nextFromQueue;
        console.log("Serving queued image:", selectedImage);
        break;
      } else {
        console.log(Queued file not found anymore: ${nextFromQueue});
        // continue looping in case of invalid/removed file
      }
    }

    // Fall back to random
    if (!selectedImage) {
      selectedImage = files[Math.floor(Math.random() * files.length)];
      console.log("Serving random image:", selectedImage);
    }

    res.json({
      filename: selectedImage,
      url: https://51.12.220.246:4000/images/${selectedImage},
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
  console.log(API running on https://51.12.220.246:${port});
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
      console.error(Error deleting image "${filename}":, err);
      return res.status(404).json({ message: "Image not found." });
    }

    console.log(Image "${filename}" deleted.);
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

app.post("/SendNext", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, "images", filename);

  if (!fs.existsSync(filePath)) {
    console.log(File not found: ${filename});
    return res.status(404).send("File not found.");
  }

  sendNextQueue.push(filename);
  console.log(Queued for next send: ${filename});
  res.send("Image added to send-next queue.");
});

app.get("/GetSendNextQueue", (req, res) => {
  res.json(sendNextQueue);
});
app.post("/ClearSendNextQueue", (req, res) => {
  sendNextQueue.length = 0;
  res.send("Queue cleared.");
});