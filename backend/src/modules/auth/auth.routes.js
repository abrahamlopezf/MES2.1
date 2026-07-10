const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('./auth.controller');
const { loginSchema } = require('./auth.validator');

const validate = require('../../middlewares/validation.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
    errors: [],
  },
});

router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;