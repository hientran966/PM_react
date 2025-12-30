const multer = require("multer");
const path = require("path");
const fs = require("fs");

const tempDir = path.join(__dirname, "../temp");

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, tempDir);
  },
  filename: (req, file, cb) => {
    const decodedName = Buffer.from(file.originalname, "latin1").toString("utf8");

    const ext = path.extname(decodedName);
    const base = path.basename(decodedName, ext);
    const uniqueName = `${base}_${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});


const upload = multer({ storage });

module.exports = upload;
