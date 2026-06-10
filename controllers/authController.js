const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const isHashedPassword = (value) =>
  typeof value === "string" && value.startsWith("$2");

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Cari user di database PostgreSQL
    const user = await User.findOne({ where: { username: username } });

    // 2. Cek apakah user ada dan password cocok
    const passwordMatches = user
      ? isHashedPassword(user.password)
        ? await bcrypt.compare(password, user.password)
        : user.password === password
      : false;

    if (!user || !passwordMatches) {
      return res.status(400).json({ message: "User atau Password salah" });
    }

    // 3. Generate Token
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || "rahasia_default",
      { expiresIn: "1h" },
    );

    // 4. Kirim respon sukses
    res.json({
      token: token,
      role: user.role,
      username: user.username,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Terjadi kesalahan server", error: error.message });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Cek apakah user sudah ada
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "Username sudah terdaftar!" });
    }

    // Simpan ke database dengan password yang sudah di-hash
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      username,
      password: hashedPassword,
      role,
    });

    res
      .status(201)
      .json({ message: "User berhasil didaftarkan", data: newUser });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
