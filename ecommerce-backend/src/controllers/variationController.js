const { Variation } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/variations
exports.getVariations = asyncHandler(async (req, res) => {
  const variations = await Variation.findAll({
    order: [['name', 'ASC']],
  });

  res.json({
    success: true,
    data: {
      variations: variations.map((v) => ({
        id: v.id,
        name: v.name,
        title: v.name,
        values: v.values,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
    },
  });
});

// GET /api/variations/:id
exports.getVariation = asyncHandler(async (req, res) => {
  const variation = await Variation.findByPk(req.params.id);
  if (!variation) {
    throw ApiError.notFound('Variation not found');
  }

  res.json({
    success: true,
    data: {
      variation: {
        id: variation.id,
        name: variation.name,
        title: variation.name,
        values: variation.values,
        createdAt: variation.createdAt,
        updatedAt: variation.updatedAt,
      },
    },
  });
});

// POST /api/variations
exports.createVariation = asyncHandler(async (req, res) => {
  const title = (req.body.title || req.body.name || '').trim();
  let values = req.body.values;

  if (!title) {
    throw ApiError.badRequest('Variation title is required');
  }

  if (typeof values === 'string') {
    values = values.split(',').map((v) => v.trim()).filter(Boolean);
  } else if (!Array.isArray(values)) {
    values = [];
  } else {
    values = values.map((v) => String(v).trim()).filter(Boolean);
  }

  if (values.length === 0) {
    throw ApiError.badRequest('At least one variation value is required');
  }

  // Deduplicate values while preserving order
  values = Array.from(new Set(values));

  const existing = await Variation.findOne({ where: { name: title } });
  if (existing) {
    throw ApiError.badRequest(`A variation with title "${title}" already exists`);
  }

  const variation = await Variation.create({
    name: title,
    values,
  });

  res.status(201).json({
    success: true,
    message: 'Variation created successfully',
    data: {
      variation: {
        id: variation.id,
        name: variation.name,
        title: variation.name,
        values: variation.values,
      },
    },
  });
});

// PUT /api/variations/:id
exports.updateVariation = asyncHandler(async (req, res) => {
  const variation = await Variation.findByPk(req.params.id);
  if (!variation) {
    throw ApiError.notFound('Variation not found');
  }

  const title = req.body.title !== undefined ? req.body.title.trim() : req.body.name !== undefined ? req.body.name.trim() : undefined;
  let values = req.body.values;

  if (title !== undefined) {
    if (!title) throw ApiError.badRequest('Variation title cannot be empty');
    const duplicate = await Variation.findOne({ where: { name: title } });
    if (duplicate && duplicate.id !== variation.id) {
      throw ApiError.badRequest(`A variation with title "${title}" already exists`);
    }
    variation.name = title;
  }

  if (values !== undefined) {
    if (typeof values === 'string') {
      values = values.split(',').map((v) => v.trim()).filter(Boolean);
    } else if (!Array.isArray(values)) {
      values = [];
    } else {
      values = values.map((v) => String(v).trim()).filter(Boolean);
    }

    if (values.length === 0) {
      throw ApiError.badRequest('At least one variation value is required');
    }
    variation.values = Array.from(new Set(values));
  }

  await variation.save();

  res.json({
    success: true,
    message: 'Variation updated successfully',
    data: {
      variation: {
        id: variation.id,
        name: variation.name,
        title: variation.name,
        values: variation.values,
      },
    },
  });
});

// DELETE /api/variations/:id
exports.deleteVariation = asyncHandler(async (req, res) => {
  const variation = await Variation.findByPk(req.params.id);
  if (!variation) {
    throw ApiError.notFound('Variation not found');
  }

  await variation.destroy();

  res.json({
    success: true,
    message: 'Variation deleted successfully',
  });
});
