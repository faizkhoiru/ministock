const AuditLog = require("../models/AuditLog");
const { Op, fn, col } = require("sequelize");

// Utility untuk log aksi
exports.logAction = async (req, logData) => {
  try {
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("user-agent") || "Unknown";
    const userId = req.user?.id || null;
    const username =
      req.user?.username || req.user?.name || req.body?.username || "System";

    await AuditLog.create({
      user_id: userId,
      username: username,
      action: logData.action,
      entity_type: logData.entityType,
      entity_id: logData.entityId || null,
      entity_name: logData.entityName || null,
      old_values: logData.oldValues || null,
      new_values: logData.newValues || null,
      details: logData.details || null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: logData.status || "SUCCESS",
      error_message: logData.errorMessage || null,
    });
  } catch (err) {
    console.error("Error logging action:", err);
  }
};

// GET: Semua audit logs
exports.getAll = async (req, res) => {
  try {
    const { limit = 10, page = 1, action, entity_type, user_id } = req.query;
    const offset = (page - 1) * limit;

    let where = {};
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;
    if (user_id) where.user_id = user_id;

    const logs = await AuditLog.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: logs.count,
      page: parseInt(page),
      limit: parseInt(limit),
      pages: Math.ceil(logs.count / limit),
      logs: logs.rows,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil audit logs", error: err.message });
  }
};

// GET: Audit log by ID
exports.getById = async (req, res) => {
  try {
    const log = await AuditLog.findByPk(req.params.id);
    if (!log) {
      return res.status(404).json({ message: "Audit log tidak ditemukan" });
    }
    res.json(log);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil audit log", error: err.message });
  }
};

// GET: Logs untuk user tertentu
exports.getUserLogs = async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const logs = await AuditLog.findAndCountAll({
      where: { user_id: userId },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: logs.count,
      data: logs.rows,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil user logs", error: err.message });
  }
};

// GET: Logs untuk entity tertentu
exports.getEntityLogs = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100 } = req.query;

    const logs = await AuditLog.findAll({
      where: {
        entity_type: entityType,
        entity_id: entityId,
      },
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    res.json(logs);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil entity logs", error: err.message });
  }
};

// GET: Summary statistik audit
exports.getSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    const todayLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: today },
      },
    });

    const yesterdayLogs = await AuditLog.count({
      where: {
        createdAt: {
          [Op.gte]: yesterday,
          [Op.lt]: today,
        },
      },
    });

    const weekLogs = await AuditLog.count({
      where: {
        createdAt: { [Op.gte]: lastWeek },
      },
    });

    const totalLogs = await AuditLog.count();

    const uniqueUsers = await AuditLog.findAll({
      attributes: [
        [fn("COUNT", fn("DISTINCT", col("username"))), "unique_count"],
      ],
      raw: true,
    });

    const actionCounts = await AuditLog.findAll({
      attributes: ["action", [fn("COUNT", col("id")), "count"]],
      group: ["action"],
      raw: true,
    });

    const entityCounts = await AuditLog.findAll({
      attributes: ["entity_type", [fn("COUNT", col("id")), "count"]],
      group: ["entity_type"],
      raw: true,
    });

    const userCounts = await AuditLog.findAll({
      attributes: ["username", [fn("COUNT", col("id")), "count"]],
      group: ["username"],
      order: [[fn("COUNT", col("id")), "DESC"]],
      limit: 10,
      raw: true,
    });

    res.json({
      total_logs: totalLogs,
      today_count: todayLogs,
      yesterday_count: yesterdayLogs,
      week_count: weekLogs,
      unique_users: uniqueUsers[0]?.unique_count || 0,
      by_action: actionCounts.reduce((acc, cur) => {
        acc[cur.action] = cur.count;
        return acc;
      }, {}),
      by_entity: entityCounts.reduce((acc, cur) => {
        acc[cur.entity_type] = cur.count;
        return acc;
      }, {}),
      top_users: userCounts,
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil summary audit",
      error: err.message,
    });
  }
};

// DELETE: Clear old logs (admin only)
exports.clearOldLogs = async (req, res) => {
  try {
    const { daysOld = 0 } = req.body || {};

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await AuditLog.destroy({
      where: {
        createdAt: { [Op.lt]: cutoffDate },
      },
    });

    res.json({
      success: true,
      message:
        daysOld === 0
          ? "Semua data audit log berhasil dibersihkan!"
          : `${result} audit logs lebih dari ${daysOld} hari berhasil dihapus`,
      deletedCount: result,
    });
  } catch (err) {
    res
      .status(500)
      .json({
        success: false,
        message: "Gagal menghapus audit logs",
        error: err.message,
      });
  }
};

// GET: Export audit logs
exports.export = async (req, res) => {
  try {
    const { format = "json", action, entity_type, limit = 1000 } = req.query;

    let where = {};
    if (action) where.action = action;
    if (entity_type) where.entity_type = entity_type;

    const logs = await AuditLog.findAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
    });

    if (format === "csv") {
      // Convert to CSV
      const headers = [
        "ID",
        "User",
        "Action",
        "Entity Type",
        "Entity ID",
        "Details",
        "Status",
        "IP Address",
        "Created At",
      ];
      const csvData = logs.map((log) => [
        log.id,
        log.username,
        log.action,
        log.entity_type,
        log.entity_id,
        log.details || "-",
        log.status,
        log.ip_address,
        new Date(log.createdAt).toLocaleString("id-ID"),
      ]);

      const csv = [headers, ...csvData]
        .map((row) =>
          row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
        )
        .join("\n");

      res.header("Content-Type", "text/csv; charset=utf-8");
      res.header(
        "Content-Disposition",
        `attachment; filename="audit-logs-${new Date().toISOString().split("T")[0]}.csv"`,
      );
      res.send(csv);
    } else {
      // JSON response
      res.json({
        format: "json",
        exportedAt: new Date().toISOString(),
        count: logs.length,
        data: logs,
      });
    }
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal export audit logs", error: err.message });
  }
};
