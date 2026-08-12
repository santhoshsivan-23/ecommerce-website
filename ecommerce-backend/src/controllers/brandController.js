const { Brand, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/brands
exports.listBrands = asyncHandler(async (req, res) => {
  const isAdmin = req.user && req.user.role === 'admin';
  const where = isAdmin && req.query.includeInactive === 'true' ? {} : { isActive: true };

  const brands = await Brand.findAll({ where, order: [['name', 'ASC']] });
  res.json({ success: true, data: { brands } });
});

// GET /api/brands/:id
exports.getBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByPk(req.params.id);
  if (!brand) throw ApiError.notFound('Brand not found');
  res.json({ success: true, data: { brand } });
});

// POST /api/brands (admin)
exports.createBrand = asyncHandler(async (req, res) => {
  const { name, logo, description, isActive } = req.body;
  const brand = await Brand.create({
    name,
    logo,
    description,
    isActive: isActive === undefined ? true : Boolean(isActive),
  });
  res.status(201).json({ success: true, message: 'Brand created', data: { brand } });
});

// PATCH /api/brands/:id (admin)
exports.updateBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByPk(req.params.id);
  if (!brand) throw ApiError.notFound('Brand not found');

  const { name, logo, description, isActive } = req.body;
  if (name !== undefined) brand.name = name;
  if (logo !== undefined) brand.logo = logo;
  if (description !== undefined) brand.description = description;
  if (isActive !== undefined) brand.isActive = Boolean(isActive);

  await brand.save();
  res.json({ success: true, message: 'Brand updated', data: { brand } });
});

// DELETE /api/brands/:id (admin)
exports.deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByPk(req.params.id);
  if (!brand) throw ApiError.notFound('Brand not found');

  const productCount = await Product.count({ where: { brandId: brand.id } });
  if (productCount > 0) {
    throw ApiError.badRequest(
      `${productCount} product(s) still use this brand. Reassign them first, or disable the brand instead.`
    );
  }

  await brand.destroy();
  res.json({ success: true, message: 'Brand deleted' });
});
