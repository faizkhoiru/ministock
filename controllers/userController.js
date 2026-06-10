const User = require('../models/User');
const bcrypt = require('bcryptjs');

const normalizeRole = (role) => {
    const value = String(role || '').toLowerCase().trim();
    if (value === 'moderator' || value === 'kepala gudang') return 'moderator';
    if (value === 'user' || value === 'admin gudang') return 'user';
    return 'admin';
};

const isHashedPassword = (value) => typeof value === 'string' && value.startsWith('$2');

// Mengambil semua data user untuk ditampilkan di tabel
exports.getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'username', 'role', 'status']
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: "Gagal mengambil data pengguna." });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { role, status } = req.body;

        const targetUser = await User.findByPk(id);
        if (!targetUser) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        await targetUser.update({
            role: normalizeRole(role || targetUser.role),
            status: status || targetUser.status
        });

        res.json({ message: 'Role pengguna berhasil diperbarui.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal memperbarui pengguna.' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const targetUser = await User.findByPk(id);

        if (!targetUser) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        await targetUser.destroy();
        res.json({ message: 'Pengguna berhasil dihapus.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal menghapus pengguna.' });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        if (!newPassword || newPassword.length < 4) {
            return res.status(400).json({ message: 'Password baru minimal 4 karakter.' });
        }

        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'Pengguna tidak ditemukan.' });
        }

        const currentMatches = isHashedPassword(user.password)
            ? await bcrypt.compare(currentPassword || '', user.password)
            : user.password === currentPassword;

        if (!currentMatches) {
            return res.status(400).json({ message: 'Password saat ini salah.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await user.update({ password: hashedPassword });

        res.json({ message: 'Password berhasil diubah.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Gagal mengubah password.' });
    }
};

// Menambah user baru dari dashboard
exports.createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;

        if (!username || !password) {
            return res.status(400).json({ message: 'Username dan password wajib diisi.' });
        }

        const safeRole = normalizeRole(role);
        const hashedPassword = await bcrypt.hash(password, 10);

        await User.create({
            username,
            password: hashedPassword,
            role: safeRole
        });
        
        res.status(201).json({ message: "Pengguna berhasil ditambahkan!" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Gagal membuat pengguna baru." });
    }
};