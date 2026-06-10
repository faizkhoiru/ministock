const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const auth = require("../middleware/auth");

// GET: Semua audit logs
router.get("/", auth(), auditController.getAll);

// GET: Summary statistik
router.get("/summary", auth(), auditController.getSummary);

// GET: Export logs
router.get("/export", auth(), auditController.export);

// GET: Logs untuk user tertentu
router.get("/user/:userId", auth(), auditController.getUserLogs);

// GET: Logs untuk entity tertentu
router.get(
  "/entity/:entityType/:entityId",
  auth(),
  auditController.getEntityLogs,
);

// GET: Single audit log
router.get("/:id", auth(), auditController.getById);

// DELETE: Menghapus log (sekarang menerima request dari base URL /api/audit)
router.delete("/", auth(["admin"]), auditController.clearOldLogs);
module.exports = router;
