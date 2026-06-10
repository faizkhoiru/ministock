const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const productController = require("../controllers/productController");

// 1. READ: User, Moderator, dan Admin bisa melihat daftar barang
router.get("/", auth(["admin", "moderator", "user"]), productController.getAll);

// 2. CREATE: Hanya Admin yang diizinkan menambah barang baru
router.post("/", auth(["admin"]), productController.create);

// 3. UPDATE: Admin dan Moderator diizinkan mengubah data/stok barang
router.put("/:id", auth(["admin", "moderator"]), productController.update);

// 4. DELETE: Hanya Admin yang diizinkan menghapus barang secara permanen
router.delete("/:id", auth(["admin"]), productController.delete);

module.exports = router;