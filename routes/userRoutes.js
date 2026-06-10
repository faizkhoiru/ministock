const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth');

// Route spesifik harus didaftarkan SEBELUM route dengan parameter (:id)
router.put('/me/password', auth(['admin', 'moderator', 'user']), userController.changePassword);

// Hanya admin yang bisa melihat, menambah, mengedit, dan menghapus user
router.get('/', auth(['admin']), userController.getAllUsers);
router.post('/', auth(['admin']), userController.createUser);
router.put('/:id', auth(['admin']), userController.updateUser);
router.delete('/:id', auth(['admin']), userController.deleteUser);

module.exports = router;