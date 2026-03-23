const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// store in memory instead of disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpe?g|png|gif|webp/i.test(file.mimetype);
    if (!allowed) {
      return cb(new Error("Only images (jpg, png, gif, webp) are allowed"));
    }
    cb(null, allowed);
  },
});

exports.uploadSingle = upload.single("image");
