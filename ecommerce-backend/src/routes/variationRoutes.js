const express = require('express');
const { protect, restrictTo } = require('../middleware/auth');
const controller = require('../controllers/variationController');

const router = express.Router();

// GET /api/variations (public/authenticated so both admin and seller and customers can fetch)
router.get('/', controller.getVariations);
router.get('/:id', controller.getVariation);

// Management routes for creating, updating, deleting variations (both admin and seller)
router.use(protect, restrictTo('admin', 'seller'));

router.post('/', controller.createVariation);
router.put('/:id', controller.updateVariation);
router.patch('/:id', controller.updateVariation);
router.delete('/:id', controller.deleteVariation);

module.exports = router;
