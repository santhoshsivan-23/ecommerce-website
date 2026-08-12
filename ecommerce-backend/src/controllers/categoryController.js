const { Op } = require('sequelize');
const { Category, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/categories  -> top-level categories with their subcategories
exports.listCategories = asyncHandler(async (req, res) => {
  // Customers only ever see active categories; admins can ask for everything.
  const isAdmin = req.user && req.user.role === 'admin';
  const includeInactive = isAdmin && req.query.includeInactive === 'true';
  const activeWhere = includeInactive ? {} : { isActive: true };

  const categories = await Category.findAll({
    where: { parentId: null, ...activeWhere },
    include: [
      {
        model: Category,
        as: 'children',
        where: activeWhere,
        required: false,
        separate: true,
        order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      },
    ],
    order: [['sortOrder', 'ASC'], ['name', 'ASC']],
  });

  res.json({ success: true, data: { categories } });
});

// GET /api/categories/flat -> every category as a single list (admin dropdowns)
exports.listCategoriesFlat = asyncHandler(async (req, res) => {
  const categories = await Category.findAll({
    include: [{ model: Category, as: 'parent', attributes: ['id', 'name', 'slug'] }],
    order: [['name', 'ASC']],
  });
  res.json({ success: true, data: { categories } });
});

// GET /api/categories/:idOrSlug
exports.getCategory = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const where = /^\d+$/.test(idOrSlug) ? { id: Number(idOrSlug) } : { slug: idOrSlug };

  const category = await Category.findOne({
    where,
    include: [
      { model: Category, as: 'children', required: false },
      { model: Category, as: 'parent', attributes: ['id', 'name', 'slug'], required: false },
    ],
  });
  if (!category) throw ApiError.notFound('Category not found');

  res.json({ success: true, data: { category } });
});

// POST /api/categories (admin)
exports.createCategory = asyncHandler(async (req, res) => {
  const { name, description, image, parentId, isActive, sortOrder } = req.body;

  if (parentId) {
    const parent = await Category.findByPk(parentId);
    if (!parent) throw ApiError.badRequest('Parent category does not exist');
    if (parent.parentId) throw ApiError.badRequest('Categories can only be nested one level deep');
  }

  const category = await Category.create({
    name,
    description,
    image,
    parentId: parentId || null,
    isActive: isActive === undefined ? true : Boolean(isActive),
    sortOrder: sortOrder || 0,
  });

  res.status(201).json({ success: true, message: 'Category created', data: { category } });
});

// PATCH /api/categories/:id (admin)
exports.updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const { name, description, image, parentId, isActive, sortOrder } = req.body;

  if (parentId !== undefined && parentId !== null && Number(parentId) !== category.parentId) {
    if (Number(parentId) === category.id) throw ApiError.badRequest('A category cannot be its own parent');
    const parent = await Category.findByPk(parentId);
    if (!parent) throw ApiError.badRequest('Parent category does not exist');
    if (parent.parentId) throw ApiError.badRequest('Categories can only be nested one level deep');
  }

  if (name !== undefined) category.name = name;
  if (description !== undefined) category.description = description;
  if (image !== undefined) category.image = image;
  if (parentId !== undefined) category.parentId = parentId || null;
  if (isActive !== undefined) category.isActive = Boolean(isActive);
  if (sortOrder !== undefined) category.sortOrder = sortOrder;

  await category.save();
  res.json({ success: true, message: 'Category updated', data: { category } });
});

// DELETE /api/categories/:id (admin)
exports.deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByPk(req.params.id);
  if (!category) throw ApiError.notFound('Category not found');

  const childCount = await Category.count({ where: { parentId: category.id } });
  if (childCount > 0) {
    throw ApiError.badRequest('Remove or reassign the subcategories before deleting this category');
  }

  const productCount = await Product.count({ where: { categoryId: category.id } });
  if (productCount > 0) {
    throw ApiError.badRequest(
      `${productCount} product(s) still use this category. Move them first, or disable the category instead.`
    );
  }

  await category.destroy();
  res.json({ success: true, message: 'Category deleted' });
});

// GET /api/categories/:id/descendant-ids -> id + all subcategory ids
exports.getDescendantIds = async function getDescendantIds(categoryId) {
  const children = await Category.findAll({ where: { parentId: categoryId }, attributes: ['id'] });
  return [Number(categoryId), ...children.map((c) => c.id)];
};

// Resolves a slug or id from a query string into the ids a product filter should match.
exports.resolveCategoryFilter = async function resolveCategoryFilter(value) {
  if (!value) return null;
  const where = /^\d+$/.test(String(value)) ? { id: Number(value) } : { slug: String(value) };
  const category = await Category.findOne({ where, attributes: ['id'] });
  if (!category) return null;

  const children = await Category.findAll({ where: { parentId: category.id }, attributes: ['id'] });
  return { [Op.in]: [category.id, ...children.map((c) => c.id)] };
};
