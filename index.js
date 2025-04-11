const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

const loopingQueue = [];
const loopindex = 0;
const sendNextQueue = [];

const storage = multer.diskStorage({
  destination: "images/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });
let fun = false;
app.use(cors());

app.use("/images", express.static("images"));
app.use("/removed_images", express.static("removed_images"));

app.use(express.json());

app.get("/GetNextImage", (req, res) => {
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

    while (sendNextQueue.length > 0) {
      const nextFromQueue = sendNextQueue.shift();
      if (files.includes(nextFromQueue)) {
        selectedImage = nextFromQueue;
        console.log("Serving queued image:", selectedImage);
        break;
      } else {
        console.log(`Queued file not found anymore: ${nextFromQueue}`);
      }
    }

    while (!selectedImage && loopingQueue.length > 0) {
      const nextFromQueue = sendNextQueue[loopindex];
      loopindex++;
      if (files.includes(nextFromQueue)) {
        selectedImage = nextFromQueue;
        console.log("Serving queued image:", selectedImage);
        break;
      } else {
        console.log(`Queued file not found anymore: ${nextFromQueue}`);
      }
    }

    if (!selectedImage) {
      selectedImage = files[Math.floor(Math.random() * files.length)];
      console.log("Serving random image:", selectedImage);
    }

    res.json({
      filename: selectedImage,
      url: `https://51.12.220.246:4000/images/${selectedImage}`,
      fun: fun,
    });
    fun = false;
  });
});

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

const server = https.createServer(
  {
    key: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/fullchain.pem"),
  },
  app
);

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

app.delete("/RemoveImage/:filename", (req, res) => {
  const filename = req.params.filename;
  const remove = req.query.remove === "true"; // Whether to permanently delete
  const fromRemoved = req.query.fromRemoved === "true"; // Source folder

  const sourceDir = path.join(
    __dirname,
    fromRemoved ? "removed_images" : "images"
  );
  const sourcePath = path.join(sourceDir, filename);

  if (remove) {
    // Permanently delete
    fs.unlink(sourcePath, (err) => {
      if (err) {
        console.error(`Error deleting image "${filename}":`, err);
        return res.status(404).json({ message: "Image not found." });
      }

      console.log(`Image "${filename}" permanently deleted.`);
      res.json({ message: "Image deleted." });
    });
  } else {
    // Move to removed_images
    const targetDir = path.join(__dirname, "removed_images");

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetPath = path.join(targetDir, filename);

    fs.rename(sourcePath, targetPath, (err) => {
      if (err) {
        console.error(`Error moving image "${filename}":`, err);
        return res
          .status(404)
          .json({ message: "Image not found or couldn't be moved." });
      }

      console.log(`Image "${filename}" moved to 'removed_images'.`);
      res.json({ message: "Image moved to 'removed_images'." });
    });
  }
});

app.get("/GetAllImages", (req, res) => {
  console.log("GetAllImages Request");

  const removed = req.query.removed === "true";
  const targetDir = path.join(__dirname, removed ? "removed_images" : "images");

  fs.readdir(targetDir, (err, files) => {
    if (err) {
      console.error(
        `Failed to read ${removed ? "removed_images" : "images"} folder:`,
        err
      );
      return res.status(500).send("Server error");
    }

    const imageFiles = files.filter((file) =>
      /\.(jpg|jpeg|png|gif|bmp|webp|jfif)$/i.test(file)
    );

    res.json(imageFiles);
  });
});

app.post("/Fun", (req, res) => {
  fun = true;
  console.log(`FUN!!`);
  res.send("fun yeah.");
});

app.post("/SendNext", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, "images", filename);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return res.status(404).send("File not found.");
  }

  sendNextQueue.push(filename);
  console.log(`Queued for next send: ${filename}`);
  res.send("Image added to send-next queue.");
});

app.post("/AddLoop", (req, res) => {
  const { filename } = req.body;
  const filePath = path.join(__dirname, "images", filename);

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filename}`);
    return res.status(404).send("File not found.");
  }

  loopingQueue.push(filename);
  console.log(`Added to Loop: ${filename}`);
  res.send("Image added to looping queue.");
});

app.get("/GetSendNextQueue", (req, res) => {
  res.json(sendNextQueue);
});
app.post("/ClearSendNextQueue", (req, res) => {
  sendNextQueue.length = 0;
  res.send("Queue cleared.");
});

app.post("/ClearLoop", (req, res) => {
  loopingQueue.length = 0;
  res.send("Queue cleared.");
});
app.get("/GetLoop", (req, res) => {
  res.json(loopingQueue);
});
