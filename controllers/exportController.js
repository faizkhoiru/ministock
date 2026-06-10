const Product = require("../models/Product");
const StockHistory = require("../models/StockHistory");
const Category = require("../models/Category");

// Utility function to convert data to CSV
function convertToCSV(data, headers) {
  const csvHeaders = headers.join(",");
  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header];
        // Escape quotes and wrap in quotes if contains comma
        if (value === null || value === undefined) return '""';
        const stringValue = String(value).replace(/"/g, '""');
        return stringValue.includes(",") ? `"${stringValue}"` : stringValue;
      })
      .join(","),
  );
  return [csvHeaders, ...csvRows].join("\n");
}

// EXPORT: Export semua data ke JSON
exports.exportJSON = async (req, res) => {
  try {
    const products = await Product.findAll();
    const history = await StockHistory.findAll();
    const categories = await Category.findAll();

    const allData = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProducts: products.length,
        totalTransactions: history.length,
        totalCategories: categories.length,
      },
      data: {
        products,
        stockHistory: history,
        categories,
      },
    };

    res.json(allData);
  } catch (err) {
    res.status(500).json({ message: "Gagal export JSON", error: err.message });
  }
};

// EXPORT: Export produk ke CSV
exports.exportProductsCSV = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Category, as: "Category", attributes: ["name"] }],
    });

    const data = products.map((p) => {
      const json = p.toJSON();
      return {
        SKU: json.sku,
        "Nama Produk": json.name,
        Kategori: json.Category ? json.Category.name : "-",
        Harga: json.price,
        Stok: json.stock,
        "Min Stok": json.min_stock,
        Dibuat: new Date(json.createdAt).toLocaleDateString("id-ID"),
      };
    });

    const csv = convertToCSV(data, [
      "SKU",
      "Nama Produk",
      "Kategori",
      "Harga",
      "Stok",
      "Min Stok",
      "Dibuat",
    ]);

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="produk-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Gagal export CSV", error: err.message });
  }
};

// EXPORT: Export history ke CSV
exports.exportHistoryCSV = async (req, res) => {
  try {
    const history = await StockHistory.findAll({
      where: { deleted_at: null },
      order: [["createdAt", "DESC"]],
    });

    const data = history.map((h) => ({
      Tanggal: new Date(h.createdAt).toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
      Waktu: new Date(h.createdAt).toLocaleTimeString("id-ID"),
      SKU: h.sku,
      "Nama Barang": h.product_name,
      Jenis: h.transaction_type === "in" ? "Masuk" : "Keluar",
      Jumlah: h.quantity,
      "Harga Unit": h.unit_price,
      "Total Nilai": h.total_value,
      "Stok Awal": h.stock_awal,
      "Stok Akhir": h.stock_akhir,
      "No. Referensi": h.reference_number || "-",
      Catatan: h.notes || "-",
    }));

    const csv = convertToCSV(data, [
      "Tanggal",
      "Waktu",
      "SKU",
      "Nama Barang",
      "Jenis",
      "Jumlah",
      "Harga Unit",
      "Total Nilai",
      "Stok Awal",
      "Stok Akhir",
      "No. Referensi",
      "Catatan",
    ]);

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="riwayat-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Gagal export CSV", error: err.message });
  }
};

// EXPORT: Export kategori ke CSV
exports.exportCategoriesCSV = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });

    const data = await Promise.all(
      categories.map(async (c) => {
        const productCount = await Product.count({
          where: { category_id: c.id },
        });
        return {
          Kategori: c.name,
          Deskripsi: c.description || "-",
          "Jumlah Produk": productCount,
          Dibuat: new Date(c.createdAt).toLocaleDateString("id-ID"),
        };
      }),
    );

    const csv = convertToCSV(data, [
      "Kategori",
      "Deskripsi",
      "Jumlah Produk",
      "Dibuat",
    ]);

    res.header("Content-Type", "text/csv; charset=utf-8");
    res.header(
      "Content-Disposition",
      `attachment; filename="kategori-${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.send(csv);
  } catch (err) {
    res.status(500).json({ message: "Gagal export CSV", error: err.message });
  }
};

// EXPORT: Export combined report
exports.exportFullReport = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [{ model: Category, as: "Category", attributes: ["name"] }],
    });
    const history = await StockHistory.findAll({
      where: { deleted_at: null },
    });
    const categories = await Category.findAll();

    const report = {
      title: "Laporan Lengkap Inventory MiniStock",
      generatedAt: new Date().toLocaleString("id-ID"),
      summary: {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + p.stock, 0),
        totalValue: products.reduce((sum, p) => sum + p.price * p.stock, 0),
        totalTransactions: history.length,
        totalCategories: categories.length,
      },
      products: products.map((p) => {
        const json = p.toJSON();
        return {
          sku: json.sku,
          name: json.name,
          category: json.Category ? json.Category.name : "-",
          price: json.price,
          stock: json.stock,
          totalValue: json.price * json.stock,
        };
      }),
      categories: categories.map((c) => ({
        name: c.name,
        description: c.description,
      })),
      statistics: {
        totalIn: history.filter((h) => h.transaction_type === "in").length,
        totalOut: history.filter((h) => h.transaction_type === "out").length,
        totalValueIn: history
          .filter((h) => h.transaction_type === "in")
          .reduce((sum, h) => sum + (h.total_value || 0), 0),
        totalValueOut: history
          .filter((h) => h.transaction_type === "out")
          .reduce((sum, h) => sum + (h.total_value || 0), 0),
      },
    };

    res.json(report);
  } catch (err) {
    res.status(500).json({
      message: "Gagal membuat laporan lengkap",
      error: err.message,
    });
  }
};
