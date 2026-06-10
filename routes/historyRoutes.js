const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const historyController = require("../controllers/historyController");

// GET: Export riwayat ke PDF (Semua user bisa export) - HARUS SEBELUM GET "/"
router.get(
  "/export/pdf",
  auth(["admin", "moderator", "user"]),
  historyController.exportPDF,
);

// GET: Statistik riwayat (Semua user bisa lihat) - HARUS SEBELUM GET "/"
router.get(
  "/stats",
  auth(["admin", "moderator", "user"]),
  historyController.getStats,
);

// GET: Riwayat grouped by date - HARUS SEBELUM GET "/"
router.get(
  "/by-date",
  auth(["admin", "moderator", "user"]),
  historyController.getByDate,
);

// POST: Tambah transaksi barang masuk/keluar (Hanya Admin dan Moderator)
router.post("/", auth(["admin", "moderator"]), historyController.create);

// DELETE: Soft delete riwayat (Hanya Admin)
router.delete("/:id", auth(["admin"]), historyController.delete);

// GET: Ambil semua riwayat (User, Moderator, Admin bisa lihat) - PALING AKHIR
router.get("/", auth(["admin", "moderator", "user"]), historyController.getAll);

module.exports = router;
