const fs = require('fs');
const path = require('path');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Ensure uploads directory exists
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// POST /api/upload
exports.uploadImage = asyncHandler(async (req, res) => {
  const { image, filename: originalFilename } = req.body;

  if (!image || typeof image !== 'string') {
    throw ApiError.badRequest('No image data provided. Please select an image from your device.');
  }

  // Expecting data URL format: "data:image/png;base64,iVBORw0KGgo..." or raw base64
  let base64Data = image;
  let ext = 'png';

  const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
  if (matches && matches.length === 3) {
    const mimeType = matches[1];
    base64Data = matches[2];

    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) ext = 'jpg';
    else if (mimeType.includes('png')) ext = 'png';
    else if (mimeType.includes('webp')) ext = 'webp';
    else if (mimeType.includes('gif')) ext = 'gif';
    else if (mimeType.includes('svg')) ext = 'svg';
  } else if (originalFilename) {
    const parsedExt = path.extname(originalFilename).replace('.', '').toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(parsedExt)) {
      ext = parsedExt === 'jpeg' ? 'jpg' : parsedExt;
    }
  }

  const uniqueName = `img-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
  const filePath = path.join(UPLOADS_DIR, uniqueName);

  const buffer = Buffer.from(base64Data, 'base64');
  await fs.promises.writeFile(filePath, buffer);

  const fileUrl = `/uploads/${uniqueName}`;

  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    data: {
      url: fileUrl,
      filename: uniqueName,
    },
  });
});
