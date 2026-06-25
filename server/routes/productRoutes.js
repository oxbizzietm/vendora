const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const {
  createProduct,
  createReview,
  deleteProduct,
  getCategories,
  getProduct,
  getRecentlyViewed,
  getRecommendations,
  listMyProducts,
  listProducts,
  updateProduct,
} = require("../controllers/productController");
const { authenticate, optionalAuthenticate } = require("../middleware/authMiddleware");

const router = express.Router();
const uploadDir = path.join(__dirname, "..", "uploads");

fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },
  filename(req, file, cb) {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const safeBase = path
      .basename(file.originalname || "product", extension)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);

    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase || "product"}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 10,
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter(req, file, cb) {
    if (!file.mimetype || !file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed."));
    }

    return cb(null, true);
  },
});

function handleUpload(req, res, next) {
  upload.array("images", 10)(req, res, (error) => {
    if (!error) {
      return next();
    }

    error.status = 400;
    error.message = error.message || "Image upload failed.";
    return next(error);
  });
}

router.get("/", optionalAuthenticate, listProducts);
router.get("/categories", getCategories);
router.get("/recommendations", getRecommendations);
router.get("/recently-viewed", authenticate, getRecentlyViewed);
router.get("/mine", authenticate, listMyProducts);
router.get("/:id", optionalAuthenticate, getProduct);
router.post("/:id/reviews", authenticate, createReview);
router.post("/", authenticate, handleUpload, createProduct);
router.put("/:id", authenticate, handleUpload, updateProduct);
router.delete("/:id", authenticate, deleteProduct);

module.exports = router;
