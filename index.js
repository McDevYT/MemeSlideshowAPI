const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors"); // Add this line

const app = express();
const port = process.env.PORT || 4000;

const sendNextImageQueue = [];
const sendNextSoundQueue = []; // New queue for sounds

// Setup Multer to store files in /images for images and /sounds for sounds
const storageImage = multer.diskStorage({
  destination: "images/", // Images will be stored here
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  },
});

const storageSound = multer.diskStorage({
  destination: "sounds/", // Sounds will be stored here
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  },
});

const uploadImage = multer({ storage: storageImage });
const uploadSound = multer({ storage: storageSound });

app.use(cors()); // Add this line to allow CORS for all origins

// Serve static files from the /images and /sounds folders
app.use("/images", express.static("images"));
app.use("/sounds", express.static("sounds"));

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

    // Serve from image queue first
    while (sendNextImageQueue.length > 0) {
      const nextFromQueue = sendNextImageQueue.shift();
      if (files.includes(nextFromQueue)) {
        selectedImage = nextFromQueue;
        console.log("Serving queued image:", selectedImage);
        break;
      } else {
        console.log(`Queued file not found anymore: ${nextFromQueue}`);
      }
    }

    // Fall back to random
    if (!selectedImage) {
      selectedImage = files[Math.floor(Math.random() * files.length)];
      console.log("Serving random image:", selectedImage);
    }

    res.json({
      filename: selectedImage,
      url: `https://51.12.220.246:4000/images/${selectedImage}`,
    });
  });
});

// GET /GetNextSound - Fetch a sound from the /sounds folder
app.get("/GetNextSound", (req, res) => {
  console.log("GetNextSound Request");

  if (sendNextSoundQueue.length === 0) {
    return res.send("No sounds in queue.");
  }

  const soundFile = sendNextSoundQueue.shift(); // Get the next sound in the queue
  res.json({
    filename: soundFile,
    url: `https://51.12.220.246:4000/sounds/${soundFile}`,
  });
});

// POST /SaveImage - Save an uploaded image to the /images folder
app.post("/SaveImage", uploadImage.single("image"), (req, res) => {
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

// POST /SaveSound - Save an uploaded sound to the /sounds folder
app.post("/SaveSound", uploadSound.single("sound"), (req, res) => {
  console.log("SaveSound Request");

  if (!req.file) {
    console.log("No sound uploaded.");
    return res.status(400).send("No sound uploaded.");
  }

  console.log("Sound uploaded:", req.file.filename);
  res.json({
    message: "Sound saved.",
    filename: req.file.filename + generateRandomDigits(),
  });
});

// POST /SendNextImage - Add an image to the send-next queue
app.post("/SendNextImage", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, "images", filename);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return res.status(404).send("File not found.");
  }

  sendNextImageQueue.push(filename);
  console.log(`Queued for next image send: ${filename}`);
  res.send("Image added to send-next queue.");
});

// POST /SendNextSound - Add a sound to the send-next queue
app.post("/SendNextSound", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, "sounds", filename);

  if (!fs.existsSync(filePath)) {
    console.log(`Sound file not found: ${filename}`);
    return res.status(404).send("Sound file not found.");
  }

  sendNextSoundQueue.push(filename);
  console.log(`Queued for next sound send: ${filename}`);
  res.send("Sound added to send-next queue.");
});

// DELETE /DeleteImage - Delete an image
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

// DELETE /DeleteSound - Delete a sound
app.delete("/DeleteSound/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, "sounds", filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting sound "${filename}":`, err);
      return res.status(404).json({ message: "Sound not found." });
    }

    console.log(`Sound "${filename}" deleted.`);
    res.json({ message: "Sound deleted." });
  });
});

// GET /GetAllImages - Get all images
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

// GET /GetAllSounds - Get all sounds
app.get("/GetAllSounds", (req, res) => {
  console.log("GetAllSounds Request");
  fs.readdir(path.join(__dirname, "sounds"), (err, files) => {
    if (err) {
      console.error("Failed to read sounds folder:", err);
      return res.status(500).send("Server error");
    }

    const soundFiles = files.filter((file) => /\.(mp3|wav|ogg)$/i.test(file));
    res.json(soundFiles);
  });
});

// GET /GetSendNextImageQueue - Get the image send-next queue
app.get("/GetSendNextImageQueue", (req, res) => {
  res.json(sendNextImageQueue);
});

// GET /GetSendNextSoundQueue - Get the sound send-next queue
app.get("/GetSendNextSoundQueue", (req, res) => {
  res.json(sendNextSoundQueue);
});

// POST /ClearSendNextImageQueue - Clear the image send-next queue
app.post("/ClearSendNextImageQueue", (req, res) => {
  sendNextImageQueue.length = 0;
  res.send("Image queue cleared.");
});

// POST /ClearSendNextSoundQueue - Clear the sound send-next queue
app.post("/ClearSendNextSoundQueue", (req, res) => {
  sendNextSoundQueue.length = 0;
  res.send("Sound queue cleared.");
});

// HTTPS server configuration
const server = https.createServer(
  {
    key: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/fullchain.pem"),
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
    randomDigits += Math.floor(Math.random() * 10);
  }
  return randomDigits;
}
