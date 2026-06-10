const express = require("express");
const router = express.Router();
const exportController = require("../controllers/exportController");
const auth = require("../middleware/auth");

// EXPORT: JSON dengan semua data
router.get("/json", auth(), exportController.exportJSON);

// EXPORT: Produk ke CSV
router.get("/products/csv", auth(), exportController.exportProductsCSV);

// EXPORT: History ke CSV
router.get("/history/csv", auth(), exportController.exportHistoryCSV);

// EXPORT: Kategori ke CSV
router.get("/categories/csv", auth(), exportController.exportCategoriesCSV);

// EXPORT: Laporan lengkap
router.get("/report/full", auth(), exportController.exportFullReport);

module.exports = router;
