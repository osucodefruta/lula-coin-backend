const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');

router.post('/save', auth, async (req, res) => {
    req.user.gameState = req.body.gameState;
    await req.user.save();
    res.json({ success: true });
});

router.get('/load', auth, async (req, res) => {
    res.json({ gameState: req.user.gameState });
});

module.exports = router;