const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// --- REGISTRO ---
router.post(
  '/register',
  body('username')
    .isLength({ min: 3 })
    .withMessage('O nome de usuário precisa ter no mínimo 3 caracteres.')
    .trim()
    .escape(),
  body('password')
    .isLength({ min: 5 })
    .withMessage('A senha precisa ter no mínimo 5 caracteres.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { username, password } = req.body;

      let user = await User.findOne({ username });
      if (user) {
        return res.status(400).json({ message: 'Usuário já existe.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user = new User({
        username,
        password: hashedPassword,
      });

      await user.save();
      res.status(201).json({ message: 'Usuário registrado com sucesso!' });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// --- LOGIN ---
router.post(
  '/login',
  body('username').notEmpty().withMessage('O nome de usuário é obrigatório.').escape(),
  body('password').notEmpty().withMessage('A senha é obrigatória.'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    try {
      const { username, password } = req.body;

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ message: 'Credenciais inválidas.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Credenciais inválidas.' });
      }

   const payload = {
  user: {
    id: user.id,
    username: user.username  // ESSENCIAL PARA O CHAT FUNCIONAR!
  }
};
      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({ token });
    } catch (err) {
      console.error(err.message);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

module.exports = router;

