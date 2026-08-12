const { Address, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const EDITABLE_FIELDS = [
  'label',
  'fullName',
  'phone',
  'addressLine1',
  'addressLine2',
  'landmark',
  'city',
  'state',
  'postalCode',
  'country',
];

/** Keeps exactly one default address per customer. */
async function makeDefault(userId, addressId, transaction) {
  await Address.update({ isDefault: false }, { where: { userId }, transaction });
  await Address.update({ isDefault: true }, { where: { id: addressId, userId }, transaction });
}

// GET /api/addresses
exports.listAddresses = asyncHandler(async (req, res) => {
  const addresses = await Address.findAll({
    where: { userId: req.user.id },
    order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json({ success: true, data: { addresses } });
});

// GET /api/addresses/:id
exports.getAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw ApiError.notFound('Address not found');
  res.json({ success: true, data: { address } });
});

// POST /api/addresses
exports.createAddress = asyncHandler(async (req, res) => {
  const payload = { userId: req.user.id };
  EDITABLE_FIELDS.forEach((field) => {
    if (req.body[field] !== undefined) payload[field] = req.body[field];
  });

  const existingCount = await Address.count({ where: { userId: req.user.id } });
  // The first address a customer saves becomes their default automatically.
  const shouldBeDefault = existingCount === 0 || Boolean(req.body.isDefault);

  const address = await sequelize.transaction(async (transaction) => {
    const created = await Address.create({ ...payload, isDefault: false }, { transaction });
    if (shouldBeDefault) await makeDefault(req.user.id, created.id, transaction);
    return created;
  });

  await address.reload();
  res.status(201).json({ success: true, message: 'Address added', data: { address } });
});

// PATCH /api/addresses/:id
exports.updateAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw ApiError.notFound('Address not found');

  await sequelize.transaction(async (transaction) => {
    EDITABLE_FIELDS.forEach((field) => {
      if (req.body[field] !== undefined) address[field] = req.body[field];
    });
    await address.save({ transaction });

    if (req.body.isDefault === true) await makeDefault(req.user.id, address.id, transaction);
  });

  await address.reload();
  res.json({ success: true, message: 'Address updated', data: { address } });
});

// PATCH /api/addresses/:id/default
exports.setDefaultAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw ApiError.notFound('Address not found');

  await sequelize.transaction((transaction) => makeDefault(req.user.id, address.id, transaction));

  const addresses = await Address.findAll({
    where: { userId: req.user.id },
    order: [['isDefault', 'DESC'], ['createdAt', 'DESC']],
  });
  res.json({ success: true, message: 'Default address updated', data: { addresses } });
});

// DELETE /api/addresses/:id
exports.deleteAddress = asyncHandler(async (req, res) => {
  const address = await Address.findOne({ where: { id: req.params.id, userId: req.user.id } });
  if (!address) throw ApiError.notFound('Address not found');

  const wasDefault = address.isDefault;
  await address.destroy();

  // Promote another address so the customer is never left without a default.
  if (wasDefault) {
    const next = await Address.findOne({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }

  res.json({ success: true, message: 'Address deleted' });
});
