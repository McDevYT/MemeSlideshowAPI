const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const https = require("https");
const cors = require("cors");

const app = express();
const port = process.env.PORT || 4000;

let loopingQueue = [];
const sendNextQueue = [];
let fun = false;

const storage = multer.diskStorage({
  destination: "images/",
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });
app.use(cors());
app.use(express.json());
app.use("/images", express.static("images"));
app.use("/removed_images", express.static("removed_images"));

app.get("/GetNextImage", (req, res) => {
  fs.readdir("images/", (err, files) => {
    if (err) return res.status(500).send("Server error.");
    if (files.length === 0) return res.status(404).send("No images found.");

    let selectedImage;

    for (let i = 0; i < sendNextQueue.length; i++) {
      if (files.includes(sendNextQueue[i])) {
        selectedImage = sendNextQueue[i];
        sendNextQueue.splice(i, 1);
        break;
      }
    }

    if (!selectedImage) {
      for (let i = 0; i < loopingQueue.length; i++) {
        if (files.includes(loopingQueue[i])) {
          selectedImage = loopingQueue[i];
          const [moved] = loopingQueue.splice(i, 1);
          loopingQueue.push(moved);
          break;
        }
      }
    }

    if (!selectedImage) {
      selectedImage = files[Math.floor(Math.random() * files.length)];
    }

    console.log(`Serving image: ${selectedImage}`);

    const response = {
      filename: selectedImage,
      url: `https://51.12.220.246:4000/images/${selectedImage}`,
    };

    if (fun) response.fun = true;
    fun = false;

    res.json(response);
  });
});

app.post("/SaveImage", upload.single("image"), (req, res) => {
  if (!req.file) return res.status(400).send("No image uploaded.");
  res.json({
    message: "Image saved.",
    filename: req.file.filename + generateRandomDigits(),
  });
});

app.delete("/RemoveImage/:filename", (req, res) => {
  const { filename } = req.params;
  const { remove = false, fromRemoved = false } = req.query;
  const sourceDir = path.join(
    __dirname,
    fromRemoved ? "removed_images" : "images"
  );
  const sourcePath = path.join(sourceDir, filename);

  const handleDelete = (err) =>
    err
      ? res.status(404).json({ message: "Image not found." })
      : res.json({
          message: remove
            ? "Image deleted."
            : "Image moved to 'removed_images'.",
        });

  if (remove) {
    fs.unlink(sourcePath, handleDelete);
  } else {
    const targetDir = path.join(__dirname, "removed_images");
    fs.mkdirSync(targetDir, { recursive: true });
    fs.rename(sourcePath, path.join(targetDir, filename), handleDelete);
  }
});

app.get("/GetAllImages", (req, res) => {
  const targetDir = path.join(
    __dirname,
    req.query.removed === "true" ? "removed_images" : "images"
  );
  fs.readdir(targetDir, (err, files) => {
    if (err) return res.status(500).send("Server error");
    res.json(
      files.filter((file) => /\.(jpg|jpeg|png|gif|bmp|webp|jfif)$/i.test(file))
    );
  });
});

app.post("/Fun", (req, res) => {
  fun = true;
  res.send("Fun enabled.");
});

app.post("/SendNext", (req, res) => {
  const { filename } = req.body;
  if (!fs.existsSync(path.join(__dirname, "images", filename)))
    return res.status(404).send("File not found.");
  sendNextQueue.push(filename);
  res.send("Image added to send-next queue.");
});

app.post("/AddLoop", (req, res) => {
  const { filename } = req.body;
  if (!fs.existsSync(path.join(__dirname, "images", filename)))
    return res.status(404).send("File not found.");
  loopingQueue.push(filename);
  res.send("Image added to looping queue.");
});

app.get("/GetSendNextQueue", (req, res) => res.json(sendNextQueue));

app.post("/ClearSendNextQueue", (req, res) => {
  sendNextQueue.length = 0;
  res.send("Queue cleared.");
});

app.post("/ClearLoop", (req, res) => {
  loopingQueue.length = 0;
  res.send("Loop cleared.");
});

app.get("/GetLoop", (req, res) => res.json(loopingQueue));

const server = https.createServer(
  {
    key: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/privkey.pem"),
    cert: fs.readFileSync("/etc/letsencrypt/live/mcdevyt.com/fullchain.pem"),
  },
  app
);

server.listen(port, () =>
  console.log(`API running on https://51.12.220.246:${port}`)
);

function generateRandomDigits() {
  return Array.from({ length: 10 }, () => Math.floor(Math.random() * 10)).join(
    ""
  );
}

app.delete("/RemoveFromLoop", (req, res) => {
  const { filename } = req.body;
  if (loopingQueue.find(filename)) delete loopingQueue.find(filename);
  else res.json("Removed from Loop");
});
