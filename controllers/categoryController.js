const Category = require("../models/Category");
const Product = require("../models/Product");
const auditController = require("./auditController");

// ====================================================
// 1. GET: Ambil Kategori Beserta Jumlah Produk Aktif
// ====================================================
exports.getCategoriesWithCount = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["id", "ASC"]],
    });

    // Menghitung jumlah produk terikat secara real-time lewat async map
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const productCount = await Product.count({
          where: { category_id: category.id },
        });
        return {
          ...category.toJSON(),
          productCount, // Properti utama yang dibutuhkan oleh dashboard.html
        };
      })
    );

    res.json(categoriesWithCount);
  } catch (err) {
    res.status(500).json({ 
      message: "Gagal mengambil statistik hitung kategori", 
      error: err.message 
    });
  }
};

// ====================================================
// 2. GET: Ambil Semua Kategori (Standar)
// ====================================================
exports.getAll = async (req, res) => {
  try {
    const categories = await Category.findAll({
      order: [["name", "ASC"]],
    });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil kategori", error: err.message });
  }
};

// ====================================================
// 3. GET: Ambil Kategori Berdasarkan ID
// ====================================================
exports.getById = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil kategori", error: err.message });
  }
};

// ====================================================
// 4. CREATE: Tambah Kategori Baru
// ====================================================
exports.create = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Nama kategori wajib diisi" });
    }

    const existingCategory = await Category.findOne({ where: { name } });
    if (existingCategory) {
      return res.status(400).json({ message: "Kategori dengan nama ini sudah ada" });
    }

    const category = await Category.create({
      name,
      description: description || null,
    });

    // Log action audit trail
    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "Category",
      entityId: category.id,
      entityName: category.name,
      newValues: category.toJSON(),
      details: `Kategori baru ditambahkan: ${name}`,
    });

    res.status(201).json({
      message: "Kategori berhasil ditambahkan",
      data: category,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "Category",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ message: "Gagal menambahkan kategori", error: err.message });
  }
};

// ====================================================
// 5. UPDATE: Edit Nama & Catatan Kategori
// ====================================================
exports.update = async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    if (name) {
      const existingCategory = await Category.findOne({
        where: {
          name,
          id: { [require("sequelize").Op.ne]: req.params.id },
        },
      });
      if (existingCategory) {
        return res.status(400).json({ message: "Nama kategori sudah digunakan" });
      }
    }

    if (name) category.name = name;
    if (description !== undefined) category.description = description;

    const oldValues = category.toJSON();
    await category.save();

    // Log action audit trail
    await auditController.logAction(req, {
      action: "UPDATE",
      entityType: "Category",
      entityId: category.id,
      entityName: category.name,
      oldValues: oldValues,
      newValues: category.toJSON(),
      details: `Kategori diperbarui: ${category.name}`,
    });

    res.json({
      message: "Kategori berhasil diperbarui",
      data: category,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "UPDATE",
      entityType: "Category",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ message: "Gagal memperbarui kategori", error: err.message });
  }
};

// ====================================================
// 6. DELETE: Hapus Kategori Permanen
// ====================================================
exports.delete = async (req, res) => {
  try {
    const category = await Category.findByPk(req.params.id);

    if (!category) {
      return res.status(404).json({ message: "Kategori tidak ditemukan" });
    }

    // Validasi pencegahan hapus folder jika masih ada barang di dalamnya
    const productCount = await Product.count({
      where: { category_id: category.id },
    });

    if (productCount > 0) {
      return res.status(400).json({
        message: `Tidak bisa menghapus kategori. ${productCount} produk masih menggunakan kategori ini.`,
      });
    }

    const categoryData = category.toJSON();
    const categoryName = category.name;
    await category.destroy();

    // Log action audit trail
    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "Category",
      entityId: category.id,
      entityName: categoryName,
      oldValues: categoryData,
      details: `Kategori dihapus: ${categoryName}`,
    });

    res.json({ message: "Kategori berhasil dihapus" });
  } catch (err) {
    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "Category",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ message: "Gagal menghapus kategori", error: err.message });
  }
};