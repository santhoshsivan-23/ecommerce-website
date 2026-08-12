const { Op } = require('sequelize');
const slugify = require('slugify');

/**
 * Builds a URL slug from `name` that no other row of `model` is using.
 * Collisions get a numeric suffix (`blue-shirt`, `blue-shirt-2`, …) so URLs stay
 * readable instead of carrying a random id.
 */
async function uniqueSlug(model, name, currentId = null) {
  const base = slugify(String(name), { lower: true, strict: true }) || 'item';

  let candidate = base;
  let suffix = 1;

  // Bounded so a pathological data set cannot spin here forever.
  while (suffix < 500) {
    const where = { slug: candidate };
    if (currentId) where.id = { [Op.ne]: currentId };

    const clash = await model.findOne({ where, attributes: ['id'] });
    if (!clash) return candidate;

    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/** Shared beforeValidate hook: keeps `slug` in step with `name`. */
function slugHook(getModel) {
  return async function beforeValidate(instance) {
    if (!instance.name) return;
    if (instance.slug && !instance.changed('name')) return;

    instance.slug = await uniqueSlug(getModel(), instance.name, instance.id ?? null);
  };
}

module.exports = { uniqueSlug, slugHook };
