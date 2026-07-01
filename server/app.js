const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const adminRoutes = require("./routes/adminRoutes");
const authRoutes = require("./routes/authRoutes");
const healthRoutes = require("./routes/healthRoutes");
const productRoutes = require("./routes/productRoutes");
const cartRoutes = require("./routes/cartRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const sellerRoutes = require("./routes/sellerRoutes");

const app = express();
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/", (req, res) => {
  res.json({
    name: "Vendora API",
    status: "running",
    health: "/api/health",
  });
});

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/seller", sellerRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  if (!err.status || err.status >= 500) {
    console.error(err);
  }

  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
  });
});

module.exports = app;
