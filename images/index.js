const express = require("express");
const multer = require("multer");
const path = require("path");
const pool = require("./db");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Setup Multer to store files in /images
const storage = multer.diskStorage({
  destination: "images/", // Images will be stored here
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename with timestamp
  },
});
const upload = multer({ storage });

app.use("/images", express.static("images")); // serve images statically from /images

// GET /GetNextImage - Fetch the most recently uploaded image
app.get("/GetNextImage", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT filename FROM images ORDER BY uploaded_at DESC LIMIT 1"
    );
    if (rows.length === 0) return res.status(404).send("No image found.");

    const image = rows[0];
    res.json({
      filename: image.filename,
      url: `/images/${image.filename}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

// POST /SaveImage - Save an uploaded image to disk and database
app.post("/SaveImage", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No image uploaded.");

  try {
    const filename = req.file.filename;

    // Insert the filename into the MySQL database
    await pool.query("INSERT INTO images (filename) VALUES (?)", [filename]);

    res.json({ message: "Image saved.", filename });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});
