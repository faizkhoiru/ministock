const Product = require("../models/Product");
const StockHistory = require("../models/StockHistory");
const auditController = require("./auditController");
let PDFDocument;

// Load PDFKit dengan error handling
try {
  PDFDocument = require("pdfkit");
} catch (err) {
  console.warn("⚠️ PDFKit not installed. Run: npm install pdfkit");
}

// GET: Ambil semua riwayat stok (exclude soft-deleted)
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 50, product_id, transaction_type } = req.query;
    const offset = (page - 1) * limit;

    let where = {
      deleted_at: null, // Exclude soft-deleted records
    };
    if (product_id) where.product_id = product_id;
    if (transaction_type) where.transaction_type = transaction_type;

    const { count, rows } = await StockHistory.findAndCountAll({
      where,
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      total: count,
      page: parseInt(page),
      limit: parseInt(limit),
      data: rows,
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil data riwayat", error: err.message });
  }
};

// CREATE: Tambah transaksi barang masuk/keluar
exports.create = async (req, res) => {
  try {
    const {
      product_id,
      transaction_type,
      quantity,
      reference_number,
      notes,
      skip_update,
    } = req.body;

    // Validasi
    if (!product_id || !transaction_type || !quantity) {
      return res.status(400).json({
        message: "Field wajib: product_id, transaction_type, quantity",
      });
    }

    if (!["in", "out"].includes(transaction_type)) {
      return res
        .status(400)
        .json({ message: "transaction_type harus 'in' atau 'out'" });
    }

    // Validasi quantity tidak boleh minus atau 0
    if (quantity <= 0) {
      return res.status(400).json({
        message: "Quantity harus lebih dari 0 dan tidak boleh minus!",
      });
    }

    // Cek produk
    const product = await Product.findByPk(product_id);
    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    // Store stock before transaction
    const stock_awal = product.stock;
    let stock_akhir = stock_awal;

    // If skip_update is true (from dashboard), don't update stock
    // If skip_update is false/undefined (from transaction form), update stock
    if (!skip_update) {
      // Cek stok untuk transaksi keluar
      if (transaction_type === "out" && product.stock < quantity) {
        return res.status(400).json({
          message: `Stok tidak cukup. Stok tersedia: ${product.stock}`,
        });
      }

      // Update stok produk
      if (transaction_type === "in") {
        product.stock += parseInt(quantity);
      } else {
        product.stock -= parseInt(quantity);
      }
      await product.save();
      stock_akhir = product.stock;
    }

    // Simpan riwayat dengan stock_awal, stock_akhir, dan nilai uang
    const unit_price = parseFloat(product.price) || 0;
    const total_value = unit_price * parseInt(quantity);

    const history = await StockHistory.create({
      product_id,
      sku: product.sku,
      product_name: product.name,
      transaction_type,
      quantity: parseInt(quantity),
      unit_price: unit_price,
      total_value: total_value,
      stock_awal: stock_awal,
      stock_akhir: stock_akhir,
      reference_number,
      notes,
    });

    res.status(201).json({
      message: "Transaksi berhasil dicatat",
      data: history,
      updated_stock: product.stock,
    });

    // Log action
    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "StockHistory",
      entityId: history.id,
      entityName: product.name,
      newValues: history.toJSON(),
      details: `Transaksi ${transaction_type} untuk ${product.name}: ${quantity} unit (Rp ${total_value.toLocaleString("id-ID")})`,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "StockHistory",
      status: "FAILED",
      errorMessage: err.message,
    });
    res
      .status(500)
      .json({ message: "Gagal membuat riwayat", error: err.message });
  }
};

// GET: Ambil ringkasan statistik (include value totals)
exports.getStats = async (req, res) => {
  try {
    const { product_id } = req.query;
    let where = { deleted_at: null };
    if (product_id) where.product_id = product_id;

    const totalIn =
      (await StockHistory.sum("quantity", {
        where: { ...where, transaction_type: "in" },
      })) || 0;
    const totalOut =
      (await StockHistory.sum("quantity", {
        where: { ...where, transaction_type: "out" },
      })) || 0;

    const totalValueIn =
      (await StockHistory.sum("total_value", {
        where: { ...where, transaction_type: "in" },
      })) || 0;
    const totalValueOut =
      (await StockHistory.sum("total_value", {
        where: { ...where, transaction_type: "out" },
      })) || 0;

    const totalTransactions = await StockHistory.count({ where });

    res.json({
      total_in: totalIn,
      total_out: totalOut,
      net_movement: totalIn - totalOut,
      total_transactions: totalTransactions,
      total_value_in: parseFloat(totalValueIn),
      total_value_out: parseFloat(totalValueOut),
      net_value: parseFloat(totalValueIn) - parseFloat(totalValueOut),
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal mengambil statistik", error: err.message });
  }
};

// EXPORT: Generate dan download PDF riwayat
exports.exportPDF = async (req, res) => {
  try {
    if (!PDFDocument) {
      return res.status(500).json({
        message: "PDF library not available. Please run: npm install pdfkit",
      });
    }

    const { transaction_type, product_id, start_date, end_date } = req.query;
    const { Op } = require("sequelize");

    const where = {};
    if (product_id) where.product_id = product_id;
    if (transaction_type) where.transaction_type = transaction_type;

    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) {
        const endDate = new Date(end_date);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt[Op.lte] = endDate;
      }
    }

    const histories = await StockHistory.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    const stats = await StockHistory.findAll({
      attributes: [
        ["transaction_type", "type"],
        ["quantity", "qty"],
        ["total_value", "total_value"],
      ],
      where,
    });

    const totalInQty = stats
      .filter((s) => s.dataValues.type === "in")
      .reduce((sum, item) => sum + Number(item.dataValues.qty || 0), 0);
    const totalOutQty = stats
      .filter((s) => s.dataValues.type === "out")
      .reduce((sum, item) => sum + Number(item.dataValues.qty || 0), 0);
    const totalInValue = stats
      .filter((s) => s.dataValues.type === "in")
      .reduce((sum, item) => sum + Number(item.dataValues.total_value || 0), 0);
    const totalOutValue = stats
      .filter((s) => s.dataValues.type === "out")
      .reduce((sum, item) => sum + Number(item.dataValues.total_value || 0), 0);
    const netValue = totalInValue - totalOutValue;
    const netQty = totalInQty - totalOutQty;

    const fmtRp = (value) =>
      `Rp ${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(Number(value || 0))}`;

    const doc = new PDFDocument({
      margin: 28,
      size: "A4",
      layout: "landscape",
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Laporan_Riwayat_Barang_' +
        new Date().toISOString().split("T")[0] +
        '.pdf"',
    );
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const marginX = 28;
    const contentWidth = pageWidth - marginX * 2;

    const today = new Date();
    const dateStr = today.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const timeStr = today.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

    const drawCard = (
      x,
      y,
      width,
      height,
      title,
      value,
      note,
      fill,
      border,
      accent,
    ) => {
      doc.roundedRect(x, y, width, height, 12).fillAndStroke(fill, border);
      doc.roundedRect(x + width - 42, y + 14, 28, 28, 8).fill(accent);
      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(10)
        .text(title, x + 16, y + 16, {
          width: width - 56,
          align: "left",
        });
      doc
        .fillColor(border)
        .font("Helvetica-Bold")
        .fontSize(14)
        .text(value, x + 16, y + 38, {
          width: width - 56,
          align: "left",
        });
      doc
        .fillColor("#64748b")
        .font("Helvetica")
        .fontSize(8.5)
        .text(note, x + 16, y + 60, {
          width: width - 56,
          align: "left",
        });
    };

    const drawMiniChart = (x, y, width, height, inValue, outValue) => {
      doc
        .roundedRect(x, y, width, height, 12)
        .fillAndStroke("#ffffff", "#e2e8f0");
      doc
        .fillColor("#0f172a")
        .font("Helvetica-Bold")
        .fontSize(13)
        .text("Visualisasi Arus Kas (Uang Masuk vs Keluar)", x + 16, y + 16);

      const plotX = x + 52;
      const plotY = y + 54;
      const plotWidth = width - 70;
      const plotHeight = height - 90;
      const maxValue = Math.max(inValue, outValue, 1);
      const scale = plotHeight / maxValue;
      const bars = [
        {
          label: "Total Pembelian (In)",
          value: inValue,
          color: "#10b981",
          x: plotX + 90,
        },
        {
          label: "Total Penjualan (Out)",
          value: outValue,
          color: "#3b82f6",
          x: plotX + 260,
        },
      ];

      doc.save();
      doc.lineWidth(0.5).strokeColor("#dbe3ee");
      for (let i = 0; i <= 5; i += 1) {
        const lineY = plotY + (plotHeight / 5) * i;
        doc
          .moveTo(plotX, lineY)
          .lineTo(plotX + plotWidth, lineY)
          .stroke();
      }
      doc.restore();

      doc.fillColor("#64748b").font("Helvetica").fontSize(8);
      for (let i = 0; i <= 5; i += 1) {
        const axisValue = Math.round((maxValue / 5) * (5 - i));
        const labelY = plotY + (plotHeight / 5) * i - 4;
        doc.text(String(axisValue), x + 4, labelY, {
          width: 36,
          align: "right",
        });
      }

      bars.forEach((bar) => {
        const barHeight = Math.max(0, bar.value * scale);
        const barX = bar.x;
        const barY = plotY + plotHeight - barHeight;
        doc.roundedRect(barX, barY, 72, barHeight, 8).fill(bar.color);
        doc
          .fillColor(bar.color)
          .font("Helvetica-Bold")
          .fontSize(11)
          .text(fmtRp(bar.value), barX - 28, barY - 18, {
            width: 128,
            align: "center",
          });
        doc
          .fillColor("#64748b")
          .font("Helvetica")
          .fontSize(8.5)
          .text(bar.label, barX - 32, plotY + plotHeight + 8, {
            width: 136,
            align: "center",
          });
      });
    };

    // Page 1
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(24)
      .text("Laporan Riwayat Barang", marginX, 26, {
        width: contentWidth,
        align: "center",
      });
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text("MINISTOCK - Inventory Management System", marginX, 54, {
        width: contentWidth,
        align: "center",
      });
    doc
      .moveTo(marginX, 72)
      .lineTo(pageWidth - marginX, 72)
      .strokeColor("#94a3b8")
      .stroke();

    doc.fillColor("#0f172a").font("Helvetica").fontSize(9);
    doc.text(`Tanggal: ${dateStr}`, marginX, 84);
    doc.text(`Waktu: ${timeStr}`, marginX, 98);
    doc.text(`Total Transaksi: ${histories.length}`, marginX, 112);

    const cardY = 138;
    const cardW = 118;
    const gap = 12;
    drawCard(
      marginX,
      cardY,
      cardW,
      76,
      "Total Pembelian (Barang Masuk)",
      fmtRp(totalInValue),
      "Akumulasi nilai barang masuk",
      "#ecfdf5",
      "#10b981",
      "#d1fae5",
    );
    drawCard(
      marginX + cardW + gap,
      cardY,
      cardW,
      76,
      "Total Penjualan (Barang Keluar)",
      fmtRp(totalOutValue),
      "Akumulasi nilai barang keluar",
      "#eff6ff",
      "#3b82f6",
      "#dbeafe",
    );
    drawCard(
      marginX + (cardW + gap) * 2,
      cardY,
      cardW,
      76,
      "Net Profit (Selisih)",
      fmtRp(netValue),
      "Total Masuk dikurangi Total Keluar",
      "#f5f3ff",
      "#8b5cf6",
      "#ede9fe",
    );

    drawMiniChart(marginX, 226, 460, 250, totalInValue, totalOutValue);

    doc.roundedRect(500, 226, 250, 250, 12).fillAndStroke("#ffffff", "#e2e8f0");
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(13)
      .text("Catatan Performa", 518, 242);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10.5)
      .text(
        "Pastikan log transaksi dicatat secara berkala untuk menjaga akurasi data riwayat.",
        518,
        270,
        { width: 214, lineGap: 4 },
      );
    doc.roundedRect(518, 338, 214, 116, 10).fillAndStroke("#faf5ff", "#ddd6fe");
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(11)
      .text("Tips Analisis:", 530, 354);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(10)
      .text(
        "Jika nilai Net Profit minus, artinya pengeluaran melebihi pemasukan. Periksa pola transaksi dan stok keluar.",
        530,
        376,
        { width: 190, lineGap: 4 },
      );

    doc.addPage();

    // Page 2
    doc
      .fillColor("#0f172a")
      .font("Helvetica-Bold")
      .fontSize(20)
      .text("Tabel Riwayat", marginX, 22);
    doc
      .fillColor("#64748b")
      .font("Helvetica")
      .fontSize(9)
      .text(
        `Periode: ${start_date || end_date ? "Terfilter" : "Semua Data"}`,
        marginX,
        46,
      );

    const tableLeft = marginX;
    const tableTop = 74;
    const tableWidth = contentWidth;
    const rowHeight = 20;
    const headerHeight = 24;
    const colWidths = {
      no: 22,
      sku: 68,
      name: 120,
      stockAwal: 48,
      masuk: 44,
      keluar: 44,
      stockAkhir: 48,
      keterangan: tableWidth - (22 + 68 + 120 + 48 + 44 + 44 + 48),
    };

    const headers = [
      { label: "No", width: colWidths.no },
      { label: "SKU", width: colWidths.sku },
      { label: "Nama Barang", width: colWidths.name },
      { label: "Awal", width: colWidths.stockAwal },
      { label: "Masuk", width: colWidths.masuk },
      { label: "Keluar", width: colWidths.keluar },
      { label: "Akhir", width: colWidths.stockAkhir },
      { label: "Keterangan", width: colWidths.keterangan },
    ];

    const drawTableHeader = (y) => {
      doc
        .roundedRect(tableLeft, y, tableWidth, headerHeight, 8)
        .fillAndStroke("#0b84f3", "#0f172a");
      doc.fillColor("white").font("Helvetica-Bold").fontSize(8);
      let x = tableLeft + 2;
      headers.forEach((header) => {
        doc.text(header.label, x, y + 7, {
          width: header.width,
          align: "center",
        });
        x += header.width;
      });
    };

    let currentY = tableTop;
    let rowNum = 1;
    let totalInRows = 0;
    let totalOutRows = 0;
    let totalValueRows = 0;

    drawTableHeader(currentY);
    currentY += headerHeight;

    doc.font("Helvetica").fontSize(8).fillColor("#0f172a");

    histories.forEach((history) => {
      if (currentY + rowHeight > pageHeight - 42) {
        doc.addPage();
        currentY = 30;
        drawTableHeader(currentY);
        currentY += headerHeight;
      }

      if (rowNum % 2 === 0) {
        doc.rect(tableLeft, currentY, tableWidth, rowHeight).fill("#f8fafc");
      }
      doc
        .rect(tableLeft, currentY, tableWidth, rowHeight)
        .strokeColor("#1f2937")
        .stroke();

      let x = tableLeft + 2;
      const masukQty =
        history.transaction_type === "in" ? Number(history.quantity || 0) : 0;
      const keluarQty =
        history.transaction_type === "out" ? Number(history.quantity || 0) : 0;
      totalInRows += masukQty;
      totalOutRows += keluarQty;
      totalValueRows += Number(history.total_value || 0);

      const values = [
        { text: String(rowNum), width: colWidths.no, align: "center" },
        {
          text: (history.sku || "-").substring(0, 10),
          width: colWidths.sku,
          align: "center",
        },
        {
          text: (history.product_name || "-").substring(0, 22),
          width: colWidths.name,
          align: "left",
        },
        {
          text: String(history.stock_awal || 0),
          width: colWidths.stockAwal,
          align: "center",
        },
        {
          text: String(masukQty),
          width: colWidths.masuk,
          align: "center",
          color: masukQty > 0 ? "#16a34a" : "#94a3b8",
        },
        {
          text: String(keluarQty),
          width: colWidths.keluar,
          align: "center",
          color: keluarQty > 0 ? "#dc2626" : "#94a3b8",
        },
        {
          text: String(history.stock_akhir || 0),
          width: colWidths.stockAkhir,
          align: "center",
        },
        {
          text: (history.notes || history.reference_number || "-").substring(
            0,
            26,
          ),
          width: colWidths.keterangan,
          align: "left",
        },
      ];

      values.forEach((cell) => {
        doc
          .fillColor(cell.color || "#0f172a")
          .text(cell.text, x, currentY + 5, {
            width: cell.width,
            align: cell.align,
          });
        x += cell.width;
      });

      currentY += rowHeight;
      rowNum += 1;
    });

    doc
      .rect(tableLeft, currentY, tableWidth, rowHeight)
      .fillAndStroke("#e2e8f0", "#1f2937");
    doc.fillColor("#0f172a").font("Helvetica-Bold").fontSize(8);
    let totalX = tableLeft + 2;
    doc.text("TOTAL", totalX, currentY + 5, {
      width:
        colWidths.no + colWidths.sku + colWidths.name + colWidths.stockAwal,
      align: "right",
    });
    totalX +=
      colWidths.no + colWidths.sku + colWidths.name + colWidths.stockAwal;
    doc
      .fillColor("#16a34a")
      .text(String(totalInRows), totalX, currentY + 5, {
        width: colWidths.masuk,
        align: "center",
      });
    totalX += colWidths.masuk;
    doc
      .fillColor("#dc2626")
      .text(String(totalOutRows), totalX, currentY + 5, {
        width: colWidths.keluar,
        align: "center",
      });
    totalX += colWidths.keluar;
    doc
      .fillColor("#7c3aed")
      .text(fmtRp(totalValueRows), totalX, currentY + 5, {
        width: colWidths.stockAkhir + colWidths.keterangan,
        align: "center",
      });

    doc.font("Helvetica").fontSize(9).fillColor("#0f172a").moveDown(2);
    doc.text(
      "Catatan: Laporan ini dibuat secara otomatis oleh sistem MINISTOCK",
      {
        align: "center",
        fontSize: 8,
      },
    );

    doc.moveDown(2);
    doc.text("Mengetahui,", { align: "left", fontSize: 9 });
    doc.moveDown(3);
    doc.text("_______________________", { align: "left", fontSize: 9 });
    doc.text("Kepala Gudang", { align: "left", fontSize: 9 });
    doc.text("(_____________________)", { align: "left" });

    doc.end();
  } catch (err) {
    console.error("PDF Export Error:", err);
    res.status(500).json({ message: "Gagal membuat PDF", error: err.message });
  }
};

// DELETE: Soft delete riwayat (mark as deleted, jangan benar2 hapus)
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await StockHistory.findByPk(id);
    if (!history) {
      return res.status(404).json({ message: "Riwayat tidak ditemukan" });
    }

    const historyData = history.toJSON();
    // Soft delete: set deleted_at timestamp
    await history.update({ deleted_at: new Date() });

    // Log action
    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "StockHistory",
      entityId: id,
      entityName: history.product_name,
      oldValues: historyData,
      details: `Transaksi dihapus: ${history.product_name} (${history.transaction_type})`,
    });

    res.json({
      message: "Riwayat berhasil dihapus",
      data: history,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "StockHistory",
      status: "FAILED",
      errorMessage: err.message,
    });
    res
      .status(500)
      .json({ message: "Gagal menghapus riwayat", error: err.message });
  }
};

// GET: Ambil riwayat per tanggal (grouped by date)
exports.getByDate = async (req, res) => {
  try {
    const { product_id } = req.query;
    let where = { deleted_at: null };
    if (product_id) where.product_id = product_id;

    const histories = await StockHistory.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });

    // Group by date
    const grouped = {};
    histories.forEach((h) => {
      const date = new Date(h.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(h);
    });

    res.json({ data: grouped });
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil riwayat per tanggal",
      error: err.message,
    });
  }
};
