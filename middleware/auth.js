const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "rahasia_default";

const auth = (roles = []) => {
  return async (req, res, next) => {
    // Ambil header Authorization
    const authHeader = req.header("Authorization");

    if (!authHeader) {
      return res
        .status(401)
        .json({ message: "Akses ditolak, token tidak ditemukan!" });
    }

    const parts = authHeader.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res
        .status(401)
        .json({ message: "Format token salah (Harus Bearer Token)!" });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      // Jika token lama belum menyertakan username, ambil dari database berdasarkan id user
      if (!req.user.username && req.user.id) {
        const user = await User.findByPk(req.user.id);
        if (user) {
          req.user.username = user.username;
        }
      }

      if (roles.length && !roles.includes(req.user.role)) {
        return res
          .status(403)
          .json({ message: "Anda tidak punya akses untuk aksi ini!" });
      }

      next();
    } catch (err) {
      return res
        .status(400)
        .json({ message: "Token tidak valid atau kadaluwarsa!" });
    }
  };
};

module.exports = auth;
