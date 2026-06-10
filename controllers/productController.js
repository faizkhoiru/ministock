const Product = require("../models/Product");
const Category = require("../models/Category");
const auditController = require("./auditController");

// ====================================================
// 1. GET: Ambil Semua Produk (Join dengan Tabel Kategori)
// ====================================================
exports.getAll = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        {
          model: Category,
          as: "Category",
          attributes: ["name"],
        },
      ],
      order: [["id", "DESC"]],
    });

    const formattedProducts = products.map((p) => {
      const jsonProduct = p.toJSON();
      return {
        ...jsonProduct,
        category_name: jsonProduct.Category ? jsonProduct.Category.name : "-",
      };
    });

    res.json(formattedProducts);
  } catch (err) {
    res.status(500).json({ 
      message: "Gagal mengambil data produk", 
      error: err.message 
    });
  }
};

// ====================================================
// 2. GET: Ambil Produk Berdasarkan ID
// ====================================================
exports.getById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [{ model: Category, as: "Category", attributes: ["name"] }],
    });

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const jsonProduct = product.toJSON();
    res.json({
      ...jsonProduct,
      category_name: jsonProduct.Category ? jsonProduct.Category.name : "-",
    });
  } catch (err) {
    res.status(500).json({ 
      message: "Gagal mengambil rincian produk", 
      error: err.message 
    });
  }
};

// ====================================================
// 3. CREATE: Tambah Produk Baru
// ====================================================
exports.create = async (req, res) => {
  try {
    const { sku, name, price, stock, min_stock, category_id } = req.body;

    if (!sku || !name || !price || stock === undefined) {
      return res.status(400).json({ message: "Isi semua kolom wajib produk!" });
    }

    const existingProduct = await Product.findOne({ where: { sku } });
    if (existingProduct) {
      return res.status(400).json({ message: "SKU / Kode barang sudah terdaftar" });
    }

    const product = await Product.create({
      sku,
      name,
      price: parseFloat(price),
      stock: parseInt(stock) || 0,
      min_stock: parseInt(min_stock) || 5,
      category_id: category_id || null,
    });

    const createdProduct = await Product.findByPk(product.id, {
      include: [{ model: Category, as: "Category", attributes: ["name"] }]
    });

    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "Product",
      entityId: product.id,
      entityName: product.name,
      newValues: createdProduct.toJSON(),
      details: `Produk baru dibuat: ${name} (${sku}) dengan stok awal ${stock}`,
    });

    res.status(201).json({
      message: "Produk berhasil disimpan ke database",
      data: createdProduct,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "CREATE",
      entityType: "Product",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ 
      message: "Gagal menyimpan produk", 
      error: err.message 
    });
  }
};

// ====================================================
// 4. UPDATE: Perbarui Data Produk
// ====================================================
exports.update = async (req, res) => {
  try {
    const { sku, name, price, stock, min_stock, category_id } = req.body;
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    if (sku && sku !== product.sku) {
      const checkSku = await Product.findOne({ where: { sku } });
      if (checkSku) {
        return res.status(400).json({ message: "SKU tersebut sudah digunakan barang lain" });
      }
    }

    const oldStock = product.stock;
    const oldValues = product.toJSON();

    if (sku) product.sku = sku;
    if (name) product.name = name;
    if (price !== undefined) product.price = parseFloat(price);
    if (stock !== undefined) product.stock = parseInt(stock);
    if (min_stock !== undefined) product.min_stock = parseInt(min_stock);
    if (category_id !== undefined) product.category_id = category_id || null;

    await product.save();

    const updatedProduct = await Product.findByPk(product.id, {
      include: [{ model: Category, as: "Category", attributes: ["name"] }]
    });

    await auditController.logAction(req, {
      action: "UPDATE",
      entityType: "Product",
      entityId: product.id,
      entityName: product.name,
      oldValues: oldValues,
      newValues: updatedProduct.toJSON(),
      details: `Produk ${product.sku} diperbarui. Stok diubah dari ${oldStock} menjadi ${product.stock}`,
    });

    res.json({
      message: "Data produk berhasil diperbarui",
      oldStock: oldStock,
      data: updatedProduct,
    });
  } catch (err) {
    await auditController.logAction(req, {
      action: "UPDATE",
      entityType: "Product",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ 
      message: "Gagal memperbarui data produk", 
      error: err.message 
    });
  }
};

// ====================================================
// 5. DELETE: Hapus Produk Permanen
// ====================================================
exports.delete = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    }

    const oldValues = product.toJSON();
    const productName = product.name;
    const productSku = product.sku;

    await product.destroy();

    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "Product",
      entityId: req.params.id,
      entityName: productName,
      oldValues: oldValues,
      details: `Produk dihapus permanen: ${productName} (${productSku})`,
    });

    res.json({ message: "Produk berhasil dihapus secara permanen dari sistem" });
  } catch (err) {
    await auditController.logAction(req, {
      action: "DELETE",
      entityType: "Product",
      status: "FAILED",
      errorMessage: err.message,
    });
    res.status(500).json({ 
      message: "Gagal menghapus produk", 
      error: err.message 
    });
  }
};