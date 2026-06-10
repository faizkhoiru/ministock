const express = require("express");
const router = express.Router();
const categoryController = require("../controllers/categoryController");
const auth = require("../middleware/auth");

// GET: Ambil semua kategori
router.get("/", auth(), categoryController.getAll);

// GET: Ambil kategori dengan jumlah produk
router.get("/with-count", auth(), categoryController.getCategoriesWithCount);

// GET: Ambil kategori by ID
router.get("/:id", auth(), categoryController.getById);

// CREATE: Tambah kategori baru (admin only)
router.post("/", auth(["admin"]), categoryController.create);

// UPDATE: Edit kategori (admin only)
router.put("/:id", auth(["admin"]), categoryController.update);

// DELETE: Hapus kategori (admin only)
router.delete("/:id", auth(["admin"]), categoryController.delete);

module.exports = router;
