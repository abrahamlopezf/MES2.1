const express = require('express');
const rateLimit = require('express-rate-limit');

const authController = require('./auth.controller');
const { loginSchema, authorizeExtrusionMixSchema, changePasswordSchema, requestPasswordResetSchema, resetPasswordSchema, updateProfileSchema } = require('./auth.validator');

const validate = require('../../middlewares/validation.middleware');
const authMiddleware = require('../../middlewares/auth.middleware');

const router = express.Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 30 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en unos minutos.',
    errors: [],
  },
});

const passwordResetRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes. Intenta de nuevo más tarde.', errors: [] },
});

const passwordResetAttemptRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos. Intenta de nuevo más tarde.', errors: [] },
});

const mixApprovalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiados intentos de autorización. Intenta más tarde.', errors: [] },
});

router.post('/login', loginRateLimit, validate(loginSchema), authController.login);
router.post('/authorize-extrusion-mix', authMiddleware, mixApprovalRateLimit, validate(authorizeExtrusionMixSchema), authController.authorizeExtrusionMix);
router.get('/me', authMiddleware, authController.me);
router.post('/logout', authMiddleware, authController.logout);

router.post('/change-password', authMiddleware, validate(changePasswordSchema), authController.changePassword);
router.post('/forgot-password', passwordResetRateLimit, validate(requestPasswordResetSchema), authController.requestPasswordReset);
router.post('/reset-password', passwordResetAttemptRateLimit, validate(resetPasswordSchema), authController.resetPassword);

router.put('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);

module.exports = router;
