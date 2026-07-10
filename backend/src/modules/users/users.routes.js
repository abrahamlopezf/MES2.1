const express = require('express');

const usersController = require('./users.controller');
const { createUserSchema, updateUserSchema } = require('./users.validator');

const authMiddleware = require('../../middlewares/auth.middleware');
const permissionMiddleware = require('../../middlewares/permission.middleware');
const validate = require('../../middlewares/validation.middleware');

const router = express.Router();

router.use(authMiddleware);

router.get(
  '/',
  permissionMiddleware('users.read'),
  usersController.getUsers
);

router.get(
  '/:id',
  permissionMiddleware('users.read'),
  usersController.getUserById
);

router.post(
  '/',
  permissionMiddleware('users.create'),
  validate(createUserSchema),
  usersController.createUser
);

router.put(
  '/:id',
  permissionMiddleware('users.update'),
  validate(updateUserSchema),
  usersController.updateUser
);

router.delete(
  '/:id',
  permissionMiddleware('users.delete'),
  usersController.deleteUser
);

module.exports = router;