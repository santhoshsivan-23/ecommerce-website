/* eslint-disable no-console */
require('dotenv').config();

const { sequelize, ensureDatabaseExists } = require('../config/db');
const {
  User,
  Category,
  Brand,
  Product,
  ProductImage,
  ProductVariant,
  Cart,
  CartItem,
  WishlistItem,
  Address,
  PaymentMethod,
  Coupon,
  Order,
  OrderItem,
  OrderStatusHistory,
  StockMovement,
} = require('../models');
const { FREE_DELIVERY_THRESHOLD, DELIVERY_CHARGE, round2 } = require('../utils/pricing');

const img = (seed) => `https://picsum.photos/seed/${seed}/700/700`;

const CATEGORY_TREE = [
  {
    name: 'Electronics',
    image: img('electronics'),
    children: ['Smartphones', 'Laptops', 'Headphones', 'Smart Watches'],
  },
  { name: 'Fashion', image: img('fashion'), children: ['T-Shirts', 'Shoes', 'Jackets'] },
  { name: 'Home & Kitchen', image: img('homekitchen'), children: ['Cookware', 'Furniture'] },
  { name: 'Sports & Fitness', image: img('sports'), children: ['Fitness Gear', 'Outdoor'] },
];

const BRANDS = [
  'Aurora', 'NovaTech', 'Zenith', 'UrbanEdge', 'PeakForm', 'CasaLuxe', 'Vertex', 'Lumen',
];

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['Black', 'White', 'Blue', 'Grey', 'Red'];

const PRODUCTS = [
  { name: 'Nova X5 Smartphone', sub: 'Smartphones', brand: 'NovaTech', price: 34999, discount: 29999, stock: 25, featured: true, desc: 'A 6.7" AMOLED display, 50MP triple camera and a 5000mAh battery that comfortably lasts a full day.', specs: [['Display', '6.7" AMOLED 120Hz'], ['Processor', 'Octa-core 3.2GHz'], ['Battery', '5000mAh'], ['Camera', '50MP + 12MP + 8MP']] },
  { name: 'Nova Lite 4G Smartphone', sub: 'Smartphones', brand: 'NovaTech', price: 14999, discount: 12499, stock: 40, desc: 'Everyday performance with a large battery and a clean, ad-free interface.', specs: [['Display', '6.5" IPS'], ['RAM', '6GB'], ['Storage', '128GB']] },
  { name: 'Zenith Pulse Pro', sub: 'Smartphones', brand: 'Zenith', price: 52999, stock: 12, featured: true, desc: 'Flagship performance with a titanium frame and a 100x periscope zoom camera.', specs: [['Display', '6.8" LTPO'], ['Chipset', 'Zenith Z3'], ['Zoom', '100x periscope']] },
  { name: 'Vertex Ultrabook 14', sub: 'Laptops', brand: 'Vertex', price: 74999, discount: 69999, stock: 8, featured: true, desc: 'A 1.2kg magnesium chassis, 14" 2.8K OLED screen and 18 hours of real-world battery life.', specs: [['Screen', '14" 2.8K OLED'], ['RAM', '16GB LPDDR5'], ['SSD', '512GB NVMe'], ['Weight', '1.2kg']] },
  { name: 'Vertex Creator 16', sub: 'Laptops', brand: 'Vertex', price: 129999, stock: 5, desc: 'Built for video editing and 3D work, with a colour-accurate mini-LED panel.', specs: [['Screen', '16" mini-LED'], ['GPU', '12GB dedicated'], ['RAM', '32GB']] },
  { name: 'NovaBook Air 13', sub: 'Laptops', brand: 'NovaTech', price: 48999, discount: 44999, stock: 0, desc: 'A fanless everyday laptop that stays silent and cool under normal use.', specs: [['Screen', '13.3" IPS'], ['RAM', '8GB'], ['SSD', '256GB']] },
  { name: 'Aurora Studio Headphones', sub: 'Headphones', brand: 'Aurora', price: 8999, discount: 6499, stock: 60, featured: true, desc: 'Over-ear headphones with adaptive noise cancellation and 40 hours of playback.', specs: [['Type', 'Over-ear'], ['ANC', 'Adaptive'], ['Battery', '40 hours']] },
  { name: 'Aurora Buds Mini', sub: 'Headphones', brand: 'Aurora', price: 3499, discount: 2499, stock: 120, desc: 'Compact wireless earbuds with a pocketable case and quick pairing.', specs: [['Type', 'In-ear'], ['Battery', '24 hours with case'], ['Water resistance', 'IPX4']] },
  { name: 'Lumen Bass Over-Ear', sub: 'Headphones', brand: 'Lumen', price: 5999, stock: 35, desc: 'Warm, bass-forward tuning with memory foam ear cushions for long sessions.', specs: [['Driver', '45mm'], ['Battery', '30 hours']] },
  { name: 'Zenith Watch Series 6', sub: 'Smart Watches', brand: 'Zenith', price: 21999, discount: 18999, stock: 22, featured: true, desc: 'Health tracking with ECG, blood oxygen and an always-on retina display.', specs: [['Display', '1.9" AMOLED'], ['Sensors', 'ECG, SpO2, HR'], ['Water rating', '5ATM']] },
  { name: 'PeakForm Track Watch', sub: 'Smart Watches', brand: 'PeakForm', price: 9999, discount: 7999, stock: 45, desc: 'Multi-sport GPS watch with 20 workout modes and a 14-day battery.', specs: [['GPS', 'Dual-band'], ['Battery', '14 days'], ['Modes', '20+ sports']] },
  { name: 'UrbanEdge Cotton Tee', sub: 'T-Shirts', brand: 'UrbanEdge', price: 999, discount: 699, stock: 200, desc: '240 GSM combed cotton tee with a relaxed fit that holds its shape after washing.', specs: [['Material', '100% combed cotton'], ['Fit', 'Relaxed'], ['GSM', '240']], variantKind: 'apparel' },
  { name: 'UrbanEdge Graphic Tee', sub: 'T-Shirts', brand: 'UrbanEdge', price: 1299, stock: 150, desc: 'Screen-printed graphic tee with a soft-hand finish that will not crack.', specs: [['Material', 'Cotton blend'], ['Print', 'Water-based ink']], variantKind: 'apparel' },
  { name: 'PeakForm Running Shoes', sub: 'Shoes', brand: 'PeakForm', price: 5499, discount: 3999, stock: 80, featured: true, desc: 'Responsive foam midsole and a breathable knit upper built for daily road running.', specs: [['Drop', '8mm'], ['Weight', '245g'], ['Upper', 'Engineered knit']], variantKind: 'shoes' },
  { name: 'UrbanEdge Street Sneakers', sub: 'Shoes', brand: 'UrbanEdge', price: 4299, stock: 65, desc: 'Low-profile leather sneakers that pair with just about anything.', specs: [['Upper', 'Full-grain leather'], ['Sole', 'Rubber cupsole']], variantKind: 'shoes' },
  { name: 'UrbanEdge Puffer Jacket', sub: 'Jackets', brand: 'UrbanEdge', price: 7999, discount: 5999, stock: 30, desc: 'Lightweight insulated puffer that packs down into its own pocket.', specs: [['Fill', 'Recycled synthetic'], ['Rating', 'Down to 0°C']], variantKind: 'apparel' },
  { name: 'PeakForm Windbreaker', sub: 'Jackets', brand: 'PeakForm', price: 4599, stock: 0, desc: 'Wind and shower resistant shell with taped seams and a packable hood.', specs: [['Waterproofing', '5000mm'], ['Seams', 'Fully taped']], variantKind: 'apparel' },
  { name: 'CasaLuxe Non-Stick Pan Set', sub: 'Cookware', brand: 'CasaLuxe', price: 4999, discount: 3499, stock: 40, desc: 'Three-piece granite-coated pan set that works on induction and gas.', specs: [['Pieces', '3'], ['Coating', 'Granite non-stick'], ['Induction', 'Yes']] },
  { name: 'CasaLuxe Steel Cookware Set', sub: 'Cookware', brand: 'CasaLuxe', price: 8999, stock: 18, desc: 'Tri-ply stainless steel set with even heat distribution and riveted handles.', specs: [['Material', 'Tri-ply stainless steel'], ['Pieces', '5']] },
  { name: 'CasaLuxe Ergonomic Chair', sub: 'Furniture', brand: 'CasaLuxe', price: 15999, discount: 12999, stock: 14, featured: true, desc: 'Mesh-back office chair with adjustable lumbar support and a 4D armrest.', specs: [['Back', 'Breathable mesh'], ['Armrest', '4D adjustable'], ['Max load', '120kg']], variantKind: 'furniture' },
  { name: 'CasaLuxe Study Desk', sub: 'Furniture', brand: 'CasaLuxe', price: 11499, stock: 9, desc: 'Solid engineered-wood desk with a cable channel and a scratch-resistant top.', specs: [['Top', 'Engineered wood'], ['Dimensions', '120 x 60 cm']] },
  { name: 'PeakForm Adjustable Dumbbells', sub: 'Fitness Gear', brand: 'PeakForm', price: 12999, discount: 10499, stock: 20, desc: 'A pair of dumbbells adjustable from 2.5kg to 24kg with a quick-turn dial.', specs: [['Range', '2.5-24kg per hand'], ['Adjustment', 'Dial']] },
  { name: 'PeakForm Yoga Mat Pro', sub: 'Fitness Gear', brand: 'PeakForm', price: 2499, discount: 1799, stock: 90, desc: '6mm TPE mat with an alignment print and a genuinely non-slip surface.', specs: [['Thickness', '6mm'], ['Material', 'TPE'], ['Size', '183 x 61 cm']], variantKind: 'mat' },
  { name: 'Aurora Camping Lantern', sub: 'Outdoor', brand: 'Aurora', price: 1999, stock: 55, desc: 'Rechargeable 800-lumen lantern that doubles as a power bank.', specs: [['Brightness', '800 lumens'], ['Battery', '10000mAh'], ['Rating', 'IPX6']] },
  { name: 'Lumen Trail Backpack 35L', sub: 'Outdoor', brand: 'Lumen', price: 3799, discount: 2999, stock: 33, desc: 'A 35-litre hiking pack with a ventilated back panel and rain cover.', specs: [['Capacity', '35L'], ['Weight', '980g'], ['Rain cover', 'Included']] },
];

/** Extra shoppers, so the customer list and growth chart have something to say. */
const EXTRA_CUSTOMERS = [
  { name: 'Arjun Mehta', email: 'arjun@shop.com', phone: '9000000010', daysAgo: 210 },
  { name: 'Neha Kapoor', email: 'neha@shop.com', phone: '9000000011', daysAgo: 165 },
  { name: 'Vikram Rao', email: 'vikram@shop.com', phone: '9000000012', daysAgo: 120 },
  { name: 'Divya Nair', email: 'divya@shop.com', phone: '9000000013', daysAgo: 88 },
  { name: 'Imran Sheikh', email: 'imran@shop.com', phone: '9000000014', daysAgo: 54 },
  { name: 'Kavya Iyer', email: 'kavya@shop.com', phone: '9000000015', daysAgo: 31 },
  { name: 'Rohit Verma', email: 'rohit@shop.com', phone: '9000000016', daysAgo: 12 },
  { name: 'Sneha Das', email: 'sneha@shop.com', phone: '9000000017', daysAgo: 4, inactive: true },
];

/** How the seeded order history is spread across statuses. */
const STATUS_WEIGHTS = [
  ['delivered', 52],
  ['shipped', 10],
  ['processing', 8],
  ['confirmed', 8],
  ['pending', 12],
  ['cancelled', 10],
];

const SEEDED_ORDER_COUNT = 220;
const HISTORY_DAYS = 150;

/**
 * A tiny seeded PRNG, so re-running the seed produces the same demo history and
 * screenshots of the reports stay comparable between runs.
 */
function makeRandom(seed) {
  let state = seed;
  return function random() {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildVariants(product) {
  switch (product.variantKind) {
    case 'apparel':
      return SIZES.flatMap((size, i) =>
        ['Black', 'White', 'Blue'].map((color, j) => ({
          size,
          color,
          stock: (i + j) % 4 === 0 ? 0 : 10 + i * 3 + j * 2,
        }))
      );
    case 'shoes':
      return ['UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10'].flatMap((size, i) =>
        ['Black', 'Grey'].map((color, j) => ({
          size,
          color,
          stock: i === 4 && j === 1 ? 0 : 6 + i * 2 + j,
        }))
      );
    case 'furniture':
      return COLORS.slice(0, 3).map((color, i) => ({ color, stock: 4 + i * 2 }));
    case 'mat':
      return ['Blue', 'Grey', 'Red'].map((color, i) => ({ color, stock: 15 + i * 5 }));
    default:
      return [];
  }
}

/**
 * Builds a believable trading history: orders spread across the last few months,
 * split between storefront checkouts and seller-raised orders, in every status
 * and against every payment method. Without this the Phase 4 reports and charts
 * would have nothing to plot on a fresh install.
 *
 * Pricing mirrors `utils/pricing`, and every line writes the same stock ledger
 * rows a real order would, so the inventory history is consistent too.
 */
async function seedOrderHistory({ customers, sellers, catalogue }) {
  const random = makeRandom(20260812);
  const pick = (list) => list[Math.floor(random() * list.length)];

  const methods = await PaymentMethod.findAll({ where: { isActive: true } });
  const addressBook = await Address.findAll();

  const statusPool = STATUS_WEIGHTS.flatMap(([status, weight]) => Array(weight).fill(status));

  const stats = { orders: 0, sellerOrders: 0, cancelled: 0 };

  for (let n = 0; n < SEEDED_ORDER_COUNT; n += 1) {
    // Recent weeks are busier than old ones, which gives the trend chart a slope.
    const daysAgo = Math.floor(HISTORY_DAYS * random() ** 1.6);
    const placedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    placedAt.setHours(9 + Math.floor(random() * 12), Math.floor(random() * 60), 0, 0);

    // Nobody can order before they signed up.
    const eligible = customers.filter((person) => new Date(person.createdAt) <= placedAt);
    if (eligible.length === 0) continue;
    const buyer = pick(eligible);

    const lineCount = 1 + Math.floor(random() * 3);
    const chosen = [];
    for (let i = 0; i < lineCount; i += 1) {
      const entry = pick(catalogue);
      if (!chosen.some((c) => c.product.id === entry.product.id)) chosen.push(entry);
    }

    const status = pick(statusPool);
    const method = pick(methods);
    const isSellerOrder = random() < 0.18;

    const lines = chosen.map((entry) => {
      const quantity = 1 + Math.floor(random() * 3);
      const variant = entry.variants.length ? pick(entry.variants) : null;
      const originalPrice = Number(entry.product.price);
      const unitPrice = Number(entry.product.discountPrice || entry.product.price);

      return {
        entry,
        variant,
        quantity,
        originalPrice,
        unitPrice,
        lineTotal: round2(unitPrice * quantity),
      };
    });

    const subtotal = round2(lines.reduce((sum, l) => sum + l.originalPrice * l.quantity, 0));
    const productDiscount = round2(
      lines.reduce((sum, l) => sum + (l.originalPrice - l.unitPrice) * l.quantity, 0)
    );
    const itemsTotal = round2(subtotal - productDiscount);
    const deliveryCharge = itemsTotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_CHARGE;

    // A seller order is credited to whoever owns the first line.
    const raisingSeller = isSellerOrder
      ? sellers.find((s) => s.id === lines[0].entry.product.sellerId) || null
      : null;

    const paymentStatus =
      status === 'cancelled'
        ? method.settlesImmediately
          ? 'refunded'
          : 'pending'
        : method.settlesImmediately || status === 'delivered'
          ? 'paid'
          : 'pending';

    const address = addressBook.find((a) => a.userId === buyer.id) || addressBook[0];

    const order = await Order.create({
      userId: buyer.id,
      subtotal,
      productDiscount,
      couponDiscount: 0,
      discount: productDiscount,
      deliveryCharge,
      total: round2(itemsTotal + deliveryCharge),
      paymentMethodId: method.id,
      paymentMethodCode: method.code,
      paymentMethodName: method.name,
      paymentStatus,
      status,
      orderSource: raisingSeller ? 'seller' : 'customer',
      createdById: raisingSeller ? raisingSeller.id : null,
      addressId: buyer.id === address.userId ? address.id : null,
      shippingFullName: buyer.name,
      shippingPhone: buyer.phone || '9000000000',
      shippingAddressLine1: address.addressLine1,
      shippingAddressLine2: address.addressLine2,
      shippingLandmark: address.landmark,
      shippingCity: address.city,
      shippingState: address.state,
      shippingPostalCode: address.postalCode,
      shippingCountry: address.country,
      placedAt,
      confirmedAt: ['confirmed', 'processing', 'shipped', 'delivered'].includes(status)
        ? new Date(placedAt.getTime() + 6 * 60 * 60 * 1000)
        : null,
      shippedAt: ['shipped', 'delivered'].includes(status)
        ? new Date(placedAt.getTime() + 36 * 60 * 60 * 1000)
        : null,
      deliveredAt:
        status === 'delivered' ? new Date(placedAt.getTime() + 84 * 60 * 60 * 1000) : null,
      cancelledAt:
        status === 'cancelled' ? new Date(placedAt.getTime() + 5 * 60 * 60 * 1000) : null,
      cancelReason: status === 'cancelled' ? 'Changed my mind' : null,
      createdAt: placedAt,
      updatedAt: placedAt,
    });

    order.orderNumber = `ORD-${placedAt.toISOString().slice(0, 10).replace(/-/g, '')}-${String(
      order.id
    ).padStart(5, '0')}`;
    await order.save();

    await OrderItem.bulkCreate(
      lines.map((line) => ({
        orderId: order.id,
        productId: line.entry.product.id,
        variantId: line.variant ? line.variant.id : null,
        sellerId: line.entry.product.sellerId,
        productName: line.entry.product.name,
        productSlug: line.entry.product.slug,
        brandName: line.entry.brandName,
        variantLabel: line.variant
          ? [line.variant.color, line.variant.size].filter(Boolean).join(' / ') || null
          : null,
        sku: line.variant ? line.variant.sku : null,
        image: img(`${line.entry.product.slug.slice(0, 30)}-0`),
        originalPrice: line.originalPrice,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
        createdAt: placedAt,
        updatedAt: placedAt,
      }))
    );

    await OrderStatusHistory.create({
      orderId: order.id,
      status: 'pending',
      note: raisingSeller ? `Order created by ${raisingSeller.name}` : 'Order placed',
      changedById: raisingSeller ? raisingSeller.id : buyer.id,
      createdAt: placedAt,
      updatedAt: placedAt,
    });
    if (status !== 'pending') {
      await OrderStatusHistory.create({
        orderId: order.id,
        status,
        note: null,
        createdAt: new Date(placedAt.getTime() + 12 * 60 * 60 * 1000),
        updatedAt: new Date(placedAt.getTime() + 12 * 60 * 60 * 1000),
      });
    }

    // A cancelled order never consumed stock, so only live orders move the ledger.
    if (status !== 'cancelled') {
      for (const line of lines) {
        const { product } = line.entry;
        product.stock = Math.max(0, product.stock - line.quantity);
        product.soldCount += line.quantity;
        await product.save();

        if (line.variant) {
          line.variant.stock = Math.max(0, line.variant.stock - line.quantity);
          await line.variant.save();
        }

        await StockMovement.create({
          productId: product.id,
          variantId: line.variant ? line.variant.id : null,
          sellerId: product.sellerId,
          type: 'order',
          quantityChange: -line.quantity,
          resultingStock: line.variant ? line.variant.stock : product.stock,
          reason: `Order ${order.orderNumber}`,
          orderId: order.id,
          createdById: raisingSeller ? raisingSeller.id : buyer.id,
          createdAt: placedAt,
          updatedAt: placedAt,
        });
      }
    }

    stats.orders += 1;
    if (raisingSeller) stats.sellerOrders += 1;
    if (status === 'cancelled') stats.cancelled += 1;
  }

  return stats;
}

async function seed() {
  await ensureDatabaseExists();
  await sequelize.authenticate();
  console.log('[seed] connected to the database');

  // A full rebuild keeps the seed idempotent.
  await sequelize.sync({ force: true });
  console.log('[seed] schema rebuilt');

  const users = await User.bulkCreate(
    [
      { name: 'Site Admin', email: 'admin@shop.com', password: 'Admin@123', phone: '9000000001', role: 'admin' },
      { name: 'Sam Seller', email: 'seller@shop.com', password: 'Seller@123', phone: '9000000002', role: 'seller' },
      { name: 'Priya Traders', email: 'seller2@shop.com', password: 'Seller@123', phone: '9000000004', role: 'seller' },
      { name: 'Riya Customer', email: 'customer@shop.com', password: 'Customer@123', phone: '9000000003', role: 'customer' },
    ],
    { individualHooks: true }
  );
  const customer = users.find((u) => u.role === 'customer');
  const sellers = users.filter((u) => u.role === 'seller');

  // Backdated sign-ups so the customer growth chart has a shape to draw.
  const extraCustomers = [];
  for (const person of EXTRA_CUSTOMERS) {
    const joinedAt = new Date(Date.now() - person.daysAgo * 24 * 60 * 60 * 1000);
    extraCustomers.push(
      await User.create({
        name: person.name,
        email: person.email,
        password: 'Customer@123',
        phone: person.phone,
        role: 'customer',
        isActive: !person.inactive,
        createdAt: joinedAt,
        updatedAt: joinedAt,
      })
    );
  }
  const customers = [customer, ...extraCustomers];

  // Brands are split between the two sellers so ownership rules are easy to see:
  // neither seller can touch the other's listings. The split deliberately gives
  // each seller some products with variants and some without.
  const SELLER_BY_BRAND = {
    Aurora: sellers[0].id,
    NovaTech: sellers[0].id,
    Vertex: sellers[0].id,
    UrbanEdge: sellers[0].id,
    Zenith: sellers[1].id,
    PeakForm: sellers[1].id,
    CasaLuxe: sellers[1].id,
    Lumen: sellers[1].id,
  };
  console.log(`[seed] created ${users.length + extraCustomers.length} users`);

  const brandsByName = {};
  for (const name of BRANDS) {
    brandsByName[name] = await Brand.create({ name, logo: img(`brand-${name}`) });
  }
  console.log(`[seed] created ${BRANDS.length} brands`);

  const subcategoriesByName = {};
  let categoryCount = 0;
  for (const [index, node] of CATEGORY_TREE.entries()) {
    const parent = await Category.create({ name: node.name, image: node.image, sortOrder: index });
    categoryCount += 1;
    for (const [childIndex, childName] of node.children.entries()) {
      const child = await Category.create({
        name: childName,
        parentId: parent.id,
        image: img(`cat-${childName}`),
        sortOrder: childIndex,
      });
      subcategoriesByName[childName] = child;
      categoryCount += 1;
    }
  }
  console.log(`[seed] created ${categoryCount} categories`);

  let variantCount = 0;
  // Kept in memory so the order history below can pick from them without re-querying.
  const catalogue = [];
  for (const [index, item] of PRODUCTS.entries()) {
    const category = subcategoriesByName[item.sub];
    const product = await Product.create({
      name: item.name,
      description: item.desc,
      price: item.price,
      discountPrice: item.discount || null,
      stock: item.stock,
      categoryId: category.id,
      brandId: brandsByName[item.brand].id,
      sellerId: SELLER_BY_BRAND[item.brand] ?? null,
      isActive: true,
      isFeatured: Boolean(item.featured),
      rating: Math.round((3.6 + ((index * 7) % 14) / 10) * 100) / 100,
      numReviews: 12 + ((index * 13) % 180),
      soldCount: 5 + ((index * 29) % 400),
      specifications: (item.specs || []).map(([key, value]) => ({ key, value })),
    });

    const slugSeed = product.slug.slice(0, 30);
    await ProductImage.bulkCreate(
      [0, 1, 2].map((n) => ({
        productId: product.id,
        url: img(`${slugSeed}-${n}`),
        alt: `${product.name} image ${n + 1}`,
        isPrimary: n === 0,
        sortOrder: n,
      }))
    );

    const variants = buildVariants(item);
    let variantRows = [];
    if (variants.length) {
      variantRows = await ProductVariant.bulkCreate(
        variants.map((v, i) => ({
          productId: product.id,
          sku: `${product.slug.slice(0, 20).toUpperCase()}-${i + 1}`,
          size: v.size || null,
          color: v.color || null,
          stock: v.stock,
          isActive: true,
        }))
      );
      variantCount += variants.length;

      // For variant products the parent stock mirrors the sum of its variants.
      product.stock = variants.reduce((sum, v) => sum + v.stock, 0);
      await product.save();
    }

    catalogue.push({ product, variants: variantRows, brandName: item.brand });

    // Opening balance, so the seller's stock history starts from a known point.
    await StockMovement.create({
      productId: product.id,
      sellerId: product.sellerId,
      type: 'initial',
      quantityChange: product.stock,
      resultingStock: product.stock,
      reason: 'Opening stock',
    });
  }
  console.log(`[seed] created ${PRODUCTS.length} products and ${variantCount} variants`);

  await Address.bulkCreate([
    {
      userId: customer.id,
      label: 'home',
      fullName: 'Riya Customer',
      phone: '9000000003',
      addressLine1: '42 Lakeview Residency',
      addressLine2: 'Anna Nagar',
      landmark: 'Opposite the city library',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600040',
      country: 'India',
      isDefault: true,
    },
    {
      userId: customer.id,
      label: 'work',
      fullName: 'Riya Customer',
      phone: '9000000003',
      addressLine1: 'Tech Park, Tower B, 7th Floor',
      city: 'Chennai',
      state: 'Tamil Nadu',
      postalCode: '600113',
      country: 'India',
      isDefault: false,
    },
  ]);

  const cart = await Cart.create({ userId: customer.id });
  const firstProduct = await Product.findOne({ where: { name: 'Aurora Studio Headphones' } });
  await CartItem.create({ cartId: cart.id, productId: firstProduct.id, quantity: 1 });

  const wishlistProduct = await Product.findOne({ where: { name: 'Zenith Watch Series 6' } });
  await WishlistItem.create({ userId: customer.id, productId: wishlistProduct.id });

  console.log('[seed] created demo addresses, cart and wishlist');

  // Cash is permanent: it can never be disabled or deleted from the admin panel.
  await PaymentMethod.bulkCreate([
    {
      name: 'Cash on Delivery',
      code: 'cash',
      description: 'Pay in cash when your order arrives',
      instructions: 'Please keep the exact amount ready for the delivery partner.',
      isActive: true,
      isPermanent: true,
      settlesImmediately: false,
      sortOrder: 0,
    },
    {
      name: 'Google Pay',
      code: 'gpay',
      description: 'Pay instantly with Google Pay',
      instructions: 'You will be marked as paid once the order is placed.',
      isActive: true,
      isPermanent: false,
      settlesImmediately: true,
      sortOrder: 1,
    },
    {
      name: 'PhonePe',
      code: 'phonepe',
      description: 'Pay instantly with PhonePe',
      instructions: 'You will be marked as paid once the order is placed.',
      isActive: true,
      isPermanent: false,
      settlesImmediately: true,
      sortOrder: 2,
    },
    {
      name: 'UPI',
      code: 'upi',
      description: 'Pay using any UPI app',
      instructions: 'You will be marked as paid once the order is placed.',
      isActive: false,
      isPermanent: false,
      settlesImmediately: true,
      sortOrder: 3,
    },
  ]);
  console.log('[seed] created 4 payment methods (cash is permanent, UPI starts disabled)');

  await Coupon.bulkCreate([
    {
      code: 'WELCOME10',
      description: '10% off your order, up to ₹500',
      discountType: 'percent',
      discountValue: 10,
      minOrderValue: 1000,
      maxDiscount: 500,
      isActive: true,
    },
    {
      code: 'FLAT200',
      description: '₹200 off orders above ₹2,000',
      discountType: 'fixed',
      discountValue: 200,
      minOrderValue: 2000,
      isActive: true,
    },
    {
      code: 'EXPIRED5',
      description: 'An expired coupon, kept for testing',
      discountType: 'percent',
      discountValue: 5,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      isActive: true,
    },
  ]);
  console.log('[seed] created 3 coupons');

  const orderStats = await seedOrderHistory({ customers, sellers, catalogue });
  console.log(
    `[seed] created ${orderStats.orders} orders over the last ${HISTORY_DAYS} days ` +
      `(${orderStats.sellerOrders} raised by sellers, ${orderStats.cancelled} cancelled)`
  );

  console.log('\nDemo accounts');
  console.log('  admin     admin@shop.com     Admin@123');
  console.log('  seller    seller@shop.com    Seller@123   (Aurora, NovaTech, Vertex, UrbanEdge)');
  console.log('  seller    seller2@shop.com   Seller@123   (Zenith, PeakForm, CasaLuxe, Lumen)');
  console.log('  customer  customer@shop.com  Customer@123');
  console.log('  customer  arjun@shop.com     Customer@123   (+7 more demo shoppers)');
  console.log('\nDemo coupons');
  console.log('  WELCOME10  10% off, min order ₹1,000, capped at ₹500');
  console.log('  FLAT200    ₹200 off, min order ₹2,000\n');
}

seed()
  .then(async () => {
    await sequelize.close();
    console.log('[seed] done');
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[seed] failed:', error);
    await sequelize.close().catch(() => {});
    process.exit(1);
  });
