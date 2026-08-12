const { WishlistItem, Product } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { PRODUCT_INCLUDES } = require('./productController');

// GET /api/wishlist
exports.getWishlist = asyncHandler(async (req, res) => {
  const items = await WishlistItem.findAll({
    where: { userId: req.user.id },
    include: [{ model: Product, as: 'product', include: PRODUCT_INCLUDES }],
    order: [['createdAt', 'DESC']],
  });

  res.json({
    success: true,
    data: {
      items: items.map((item) => ({
        id: item.id,
        addedAt: item.createdAt,
        product: item.product,
      })),
      productIds: items.map((item) => item.productId),
    },
  });
});

// POST /api/wishlist
exports.addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;

  const product = await Product.findByPk(productId);
  if (!product) throw ApiError.notFound('Product not found');
  if (!product.isActive) throw ApiError.badRequest('This product is not available right now');

  // The unique index also guards this, but a clear message beats a 409 from MySQL.
  const existing = await WishlistItem.findOne({ where: { userId: req.user.id, productId } });
  if (existing) throw ApiError.conflict('This product is already in your wishlist');

  await WishlistItem.create({ userId: req.user.id, productId });

  const productIds = (
    await WishlistItem.findAll({ where: { userId: req.user.id }, attributes: ['productId'] })
  ).map((i) => i.productId);

  res.status(201).json({ success: true, message: 'Added to wishlist', data: { productIds } });
});

// DELETE /api/wishlist/:productId
exports.removeFromWishlist = asyncHandler(async (req, res) => {
  const deleted = await WishlistItem.destroy({
    where: { userId: req.user.id, productId: req.params.productId },
  });
  if (!deleted) throw ApiError.notFound('This product is not in your wishlist');

  const productIds = (
    await WishlistItem.findAll({ where: { userId: req.user.id }, attributes: ['productId'] })
  ).map((i) => i.productId);

  res.json({ success: true, message: 'Removed from wishlist', data: { productIds } });
});

// DELETE /api/wishlist
exports.clearWishlist = asyncHandler(async (req, res) => {
  await WishlistItem.destroy({ where: { userId: req.user.id } });
  res.json({ success: true, message: 'Wishlist cleared', data: { productIds: [] } });
});
