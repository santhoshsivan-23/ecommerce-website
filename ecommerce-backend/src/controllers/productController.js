const { Op, fn, col, literal, where: sqlWhere } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductVariant,
  Category,
  Brand,
  User,
} = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { resolveCategoryFilter } = require('./categoryController');

/** Price customers actually pay, used for both filtering and sorting. */
const EFFECTIVE_PRICE = literal('COALESCE(NULLIF(`Product`.`discountPrice`, 0), `Product`.`price`)');

const SORT_OPTIONS = {
  newest: [['createdAt', 'DESC']],
  oldest: [['createdAt', 'ASC']],
  price_asc: [[EFFECTIVE_PRICE, 'ASC']],
  price_desc: [[EFFECTIVE_PRICE, 'DESC']],
  popular: [['soldCount', 'DESC'], ['rating', 'DESC']],
  rating: [['rating', 'DESC'], ['numReviews', 'DESC']],
  name_asc: [['name', 'ASC']],
};

const PRODUCT_INCLUDES = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug', 'parentId'] },
  { model: Brand, as: 'brand', attributes: ['id', 'name', 'slug'] },
  // "Sold by" on the storefront, and the owning seller in the admin console.
  { model: User, as: 'seller', attributes: ['id', 'name'] },
  {
    model: ProductImage,
    as: 'images',
    separate: true,
    order: [['isPrimary', 'DESC'], ['sortOrder', 'ASC'], ['id', 'ASC']],
  },
  {
    model: ProductVariant,
    as: 'variants',
    separate: true,
    order: [['id', 'ASC']],
  },
];

/**
 * Resolves the owner an admin asked to assign. Anything that is not an actual
 * seller account is rejected rather than silently stored.
 */
async function resolveSellerId(value) {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;

  const seller = await User.findOne({ where: { id: Number(value), role: 'seller' } });
  if (!seller) throw ApiError.badRequest('Selected seller does not exist');
  return seller.id;
}

/** Splits `?brand=1,2` or repeated params into a clean array. */
function toArray(value) {
  if (value === undefined || value === null || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((v) => String(v).trim()).filter(Boolean);
}

// GET /api/products
exports.listProducts = asyncHandler(async (req, res) => {
  const {
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    inStock,
    size,
    color,
    rating,
    featured,
    sort = 'newest',
    page = 1,
    limit = 12,
  } = req.query;

  const isAdmin = req.user && req.user.role === 'admin';
  const isSeller = req.user && req.user.role === 'seller';

  // `?mine=true` scopes the catalogue to the signed-in seller's own products.
  const ownProductsOnly = isSeller && req.query.mine === 'true';

  // Disabled products are only visible in a management view, never the storefront.
  // A seller may see their own; another seller's unpublished catalogue is private,
  // so asking for it just returns the public (active) listing.
  const includeInactive =
    req.query.includeInactive === 'true' &&
    (isAdmin || (isSeller && (ownProductsOnly || Number(req.query.sellerId) === req.user.id)));

  const where = {};
  const andConditions = [];

  if (!includeInactive) where.isActive = true;

  if (ownProductsOnly) where.sellerId = req.user.id;
  else if (req.query.sellerId) where.sellerId = Number(req.query.sellerId);

  if (q && String(q).trim()) {
    const term = `%${String(q).trim()}%`;
    andConditions.push({
      [Op.or]: [
        { name: { [Op.like]: term } },
        { description: { [Op.like]: term } },
        literal(
          `EXISTS (SELECT 1 FROM brands b WHERE b.id = \`Product\`.\`brandId\` AND b.name LIKE ${sequelize.escape(term)})`
        ),
        literal(
          `EXISTS (SELECT 1 FROM categories c WHERE c.id = \`Product\`.\`categoryId\` AND c.name LIKE ${sequelize.escape(term)})`
        ),
      ],
    });
  }

  if (category) {
    const categoryFilter = await resolveCategoryFilter(category);
    // An unknown category should return nothing rather than everything.
    if (!categoryFilter) {
      return res.json({
        success: true,
        data: { products: [], pagination: { total: 0, page: 1, limit: Number(limit), totalPages: 0 } },
      });
    }
    where.categoryId = categoryFilter;
  }

  const brandValues = toArray(brand);
  if (brandValues.length) {
    const numericIds = brandValues.filter((v) => /^\d+$/.test(v)).map(Number);
    const slugs = brandValues.filter((v) => !/^\d+$/.test(v));
    const brandRows = await Brand.findAll({
      where: { [Op.or]: [{ id: numericIds.length ? numericIds : [-1] }, { slug: slugs.length ? slugs : [''] }] },
      attributes: ['id'],
    });
    where.brandId = { [Op.in]: brandRows.length ? brandRows.map((b) => b.id) : [-1] };
  }

  if (minPrice !== undefined && minPrice !== '') {
    andConditions.push(sqlWhere(EFFECTIVE_PRICE, { [Op.gte]: Number(minPrice) }));
  }
  if (maxPrice !== undefined && maxPrice !== '') {
    andConditions.push(sqlWhere(EFFECTIVE_PRICE, { [Op.lte]: Number(maxPrice) }));
  }

  if (rating) {
    where.rating = { [Op.gte]: Number(rating) };
  }

  if (featured === 'true') where.isFeatured = true;

  // A product counts as in stock if its own stock is positive or any active
  // variant still has units left.
  if (inStock === 'true') {
    andConditions.push({
      [Op.or]: [
        { stock: { [Op.gt]: 0 } },
        literal(
          'EXISTS (SELECT 1 FROM product_variants v WHERE v.productId = `Product`.`id` AND v.isActive = true AND v.stock > 0)'
        ),
      ],
    });
  }

  const sizes = toArray(size);
  if (sizes.length) {
    const list = sizes.map((s) => sequelize.escape(s)).join(', ');
    andConditions.push(
      literal(
        `EXISTS (SELECT 1 FROM product_variants v WHERE v.productId = \`Product\`.\`id\` AND v.isActive = true AND v.size IN (${list}))`
      )
    );
  }

  const colors = toArray(color);
  if (colors.length) {
    const list = colors.map((c) => sequelize.escape(c)).join(', ');
    andConditions.push(
      literal(
        `EXISTS (SELECT 1 FROM product_variants v WHERE v.productId = \`Product\`.\`id\` AND v.isActive = true AND v.color IN (${list}))`
      )
    );
  }

  if (andConditions.length) where[Op.and] = andConditions;

  const pageNum = Math.max(1, Number(page) || 1);
  const perPage = Math.min(60, Math.max(1, Number(limit) || 12));
  const order = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

  const { rows, count } = await Product.findAndCountAll({
    where,
    include: PRODUCT_INCLUDES,
    order,
    limit: perPage,
    offset: (pageNum - 1) * perPage,
    distinct: true,
  });

  res.json({
    success: true,
    data: {
      products: rows,
      pagination: {
        total: count,
        page: pageNum,
        limit: perPage,
        totalPages: Math.ceil(count / perPage),
      },
    },
  });
});

// GET /api/products/filters -> the option lists the filter sidebar renders
exports.getFilterOptions = asyncHandler(async (req, res) => {
  const categoryFilter = req.query.category ? await resolveCategoryFilter(req.query.category) : null;
  const productWhere = { isActive: true, ...(categoryFilter ? { categoryId: categoryFilter } : {}) };

  const [brands, priceRow, sizes, colors] = await Promise.all([
    Brand.findAll({
      where: { isActive: true },
      attributes: [
        'id',
        'name',
        'slug',
        [fn('COUNT', col('products.id')), 'productCount'],
      ],
      include: [{ model: Product, as: 'products', attributes: [], where: productWhere, required: true }],
      group: ['Brand.id'],
      order: [['name', 'ASC']],
    }),
    Product.findOne({
      where: productWhere,
      attributes: [
        [fn('MIN', literal('COALESCE(NULLIF(`Product`.`discountPrice`, 0), `Product`.`price`)')), 'minPrice'],
        [fn('MAX', literal('COALESCE(NULLIF(`Product`.`discountPrice`, 0), `Product`.`price`)')), 'maxPrice'],
      ],
      raw: true,
    }),
    ProductVariant.findAll({
      attributes: [[fn('DISTINCT', col('size')), 'size']],
      where: { isActive: true, size: { [Op.ne]: null } },
      include: [{ model: Product, as: 'product', attributes: [], where: productWhere, required: true }],
      raw: true,
    }),
    ProductVariant.findAll({
      attributes: [[fn('DISTINCT', col('color')), 'color']],
      where: { isActive: true, color: { [Op.ne]: null } },
      include: [{ model: Product, as: 'product', attributes: [], where: productWhere, required: true }],
      raw: true,
    }),
  ]);

  res.json({
    success: true,
    data: {
      brands: brands.map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        productCount: Number(b.get('productCount')),
      })),
      priceRange: {
        min: Math.floor(Number(priceRow?.minPrice ?? 0)),
        max: Math.ceil(Number(priceRow?.maxPrice ?? 0)),
      },
      sizes: sizes.map((s) => s.size).filter(Boolean).sort(),
      colors: colors.map((c) => c.color).filter(Boolean).sort(),
    },
  });
});

// GET /api/products/:idOrSlug
exports.getProduct = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const where = /^\d+$/.test(idOrSlug) ? { id: Number(idOrSlug) } : { slug: idOrSlug };

  const product = await Product.findOne({ where, include: PRODUCT_INCLUDES });
  if (!product) throw ApiError.notFound('Product not found');

  // A disabled product stays reachable for the admin and for the seller who owns it.
  const canSeeDisabled =
    req.user && (req.user.role === 'admin' || product.sellerId === req.user.id);
  if (!product.isActive && !canSeeDisabled) throw ApiError.notFound('Product not found');

  const related = await Product.findAll({
    where: { categoryId: product.categoryId, isActive: true, id: { [Op.ne]: product.id } },
    include: PRODUCT_INCLUDES,
    limit: 4,
    order: [['soldCount', 'DESC']],
  });

  res.json({ success: true, data: { product, related } });
});

/* ------------------------------- Admin actions ------------------------------ */

async function replaceImages(productId, images, transaction) {
  await ProductImage.destroy({ where: { productId }, transaction });
  if (!Array.isArray(images) || images.length === 0) return;

  const rows = images
    .filter((img) => img && (typeof img === 'string' ? img.trim() : img.url))
    .map((img, index) => ({
      productId,
      url: typeof img === 'string' ? img.trim() : img.url,
      alt: typeof img === 'string' ? null : img.alt || null,
      isPrimary: typeof img === 'string' ? index === 0 : Boolean(img.isPrimary) || index === 0,
      sortOrder: index,
    }));

  // Exactly one primary image, so the card and listing always agree.
  if (rows.length && !rows.some((r) => r.isPrimary)) rows[0].isPrimary = true;
  let seenPrimary = false;
  rows.forEach((r) => {
    if (r.isPrimary && seenPrimary) r.isPrimary = false;
    if (r.isPrimary) seenPrimary = true;
  });

  await ProductImage.bulkCreate(rows, { transaction });
}

async function replaceVariants(productId, variants, transaction) {
  await ProductVariant.destroy({ where: { productId }, transaction });
  if (!Array.isArray(variants) || variants.length === 0) return;

  const rows = variants
    .filter((v) => v && (v.size || v.color || v.sku))
    .map((v) => ({
      productId,
      sku: v.sku ? String(v.sku).trim() : null,
      size: v.size || null,
      color: v.color || null,
      price: v.price === '' || v.price === undefined || v.price === null ? null : Number(v.price),
      discountPrice:
        v.discountPrice === '' || v.discountPrice === undefined || v.discountPrice === null
          ? null
          : Number(v.discountPrice),
      stock: Number(v.stock) || 0,
      image: v.image || null,
      isActive: v.isActive === undefined ? true : Boolean(v.isActive),
    }));

  await ProductVariant.bulkCreate(rows, { transaction });
}

// POST /api/products (admin)
exports.createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    price,
    discountPrice,
    stock,
    categoryId,
    brandId,
    isActive,
    isFeatured,
    specifications,
    images,
    variants,
  } = req.body;

  const category = await Category.findByPk(categoryId);
  if (!category) throw ApiError.badRequest('Selected category does not exist');
  if (brandId) {
    const brandExists = await Brand.findByPk(brandId);
    if (!brandExists) throw ApiError.badRequest('Selected brand does not exist');
  }
  if (discountPrice && Number(discountPrice) >= Number(price)) {
    throw ApiError.badRequest('Discount price must be lower than the original price');
  }

  // Sellers always own what they create; an admin may assign an owner.
  const assignedSellerId =
    req.user.role === 'seller' ? req.user.id : (await resolveSellerId(req.body.sellerId)) ?? null;

  const product = await sequelize.transaction(async (transaction) => {
    const created = await Product.create(
      {
        name,
        description,
        price: Number(price),
        discountPrice: discountPrice ? Number(discountPrice) : null,
        stock: Number(stock) || 0,
        categoryId,
        brandId: brandId || null,
        sellerId: assignedSellerId,
        isActive: isActive === undefined ? true : Boolean(isActive),
        isFeatured: Boolean(isFeatured),
        specifications: specifications || [],
      },
      { transaction }
    );

    await replaceImages(created.id, images, transaction);
    await replaceVariants(created.id, variants, transaction);
    return created;
  });

  const full = await Product.findByPk(product.id, { include: PRODUCT_INCLUDES });
  res.status(201).json({ success: true, message: 'Product created', data: { product: full } });
});

/**
 * Sellers may only touch their own listings; admins may touch anything.
 * Called by every write path so one seller can never edit another's catalogue.
 */
function assertCanManage(product, user) {
  if (user.role === 'admin') return;
  if (product.sellerId !== user.id) {
    throw ApiError.forbidden('This product belongs to another seller');
  }
}

// PATCH /api/products/:id (admin, or the owning seller)
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  assertCanManage(product, req.user);

  const {
    name,
    description,
    price,
    discountPrice,
    stock,
    categoryId,
    brandId,
    isActive,
    isFeatured,
    specifications,
    images,
    variants,
  } = req.body;

  if (categoryId !== undefined) {
    const category = await Category.findByPk(categoryId);
    if (!category) throw ApiError.badRequest('Selected category does not exist');
  }
  if (brandId) {
    const brandExists = await Brand.findByPk(brandId);
    if (!brandExists) throw ApiError.badRequest('Selected brand does not exist');
  }

  const nextPrice = price !== undefined ? Number(price) : product.price;
  const nextDiscount =
    discountPrice === undefined ? product.discountPrice : discountPrice ? Number(discountPrice) : null;
  if (nextDiscount && nextDiscount >= nextPrice) {
    throw ApiError.badRequest('Discount price must be lower than the original price');
  }

  // Only the admin may move a listing to a different seller; a seller sending
  // sellerId is ignored rather than allowed to hand their product to someone else.
  const nextSellerId =
    req.user.role === 'admin' ? await resolveSellerId(req.body.sellerId) : undefined;

  await sequelize.transaction(async (transaction) => {
    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = nextPrice;
    if (discountPrice !== undefined) product.discountPrice = nextDiscount;
    if (stock !== undefined) product.stock = Number(stock) || 0;
    if (categoryId !== undefined) product.categoryId = categoryId;
    if (brandId !== undefined) product.brandId = brandId || null;
    if (nextSellerId !== undefined) product.sellerId = nextSellerId;
    if (isActive !== undefined) product.isActive = Boolean(isActive);
    if (isFeatured !== undefined) product.isFeatured = Boolean(isFeatured);
    if (specifications !== undefined) product.specifications = specifications || [];

    await product.save({ transaction });

    if (images !== undefined) await replaceImages(product.id, images, transaction);
    if (variants !== undefined) await replaceVariants(product.id, variants, transaction);
  });

  const full = await Product.findByPk(product.id, { include: PRODUCT_INCLUDES });
  res.json({ success: true, message: 'Product updated', data: { product: full } });
});

// PATCH /api/products/:id/status (admin, or the owning seller) -> enable / disable
exports.toggleProductStatus = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  assertCanManage(product, req.user);

  product.isActive = req.body.isActive === undefined ? !product.isActive : Boolean(req.body.isActive);
  await product.save();

  res.json({
    success: true,
    message: product.isActive ? 'Product enabled' : 'Product disabled',
    data: { product },
  });
});

// DELETE /api/products/:id (admin, or the owning seller)
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) throw ApiError.notFound('Product not found');
  assertCanManage(product, req.user);

  await product.destroy();
  res.json({ success: true, message: 'Product deleted' });
});

exports.PRODUCT_INCLUDES = PRODUCT_INCLUDES;
exports.assertCanManage = assertCanManage;
