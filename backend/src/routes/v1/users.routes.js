/**
 * src/routes/v1/users.routes.js
 * User resource routes. Validation for POST/PUT via express-validator.
 * Auth middleware (Member 2) will be added later.
 */

const express = require('express');
const { body, param, validationResult } = require('express-validator');
const usersController = require('../../controllers/users.controller');

const router = express.Router();

// --- Validation helpers ---

/** Send 400 with first validation error if any */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0].msg;
    return res.status(400).json({ success: false, error: firstError });
  }
  next();
}

/** Shared body rules for create and update */
const nameEmailValidators = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').trim().isEmail().withMessage('Valid email is required'),
];

/** Param id must be numeric */
const idParamValidator = param('id').isInt({ min: 1 }).withMessage('Invalid user id');

// --- Routes ---

// GET /api/v1/users
router.get('/', usersController.list);

// GET /api/v1/users/:id
router.get('/:id', idParamValidator, handleValidation, usersController.getById);

// POST /api/v1/users
router.post('/', nameEmailValidators, handleValidation, usersController.create);

// PUT /api/v1/users/:id
router.put(
  '/:id',
  idParamValidator,
  nameEmailValidators,
  handleValidation,
  usersController.update
);

// DELETE /api/v1/users/:id
router.delete('/:id', idParamValidator, handleValidation, usersController.remove);

module.exports = router;
