const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('./auth.controller');
const { loginSchema, changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema, updateProfileSchema } = require('./auth.validator');

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

router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);

router.put('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

module.exports = router;