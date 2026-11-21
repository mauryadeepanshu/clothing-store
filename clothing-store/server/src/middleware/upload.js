const fs = require('fs');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/ApiError');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

// The browser-supplied type and file name can be faked, so files are saved under a random temporary
// name and only kept if their first bytes really are a JPEG, PNG, WebP or AVIF image.
const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, _file, cb) => cb(null, `tmp-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`),
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) return cb(null, true);
    cb(ApiError.badRequest('Only JPG, PNG, WEBP or AVIF images are allowed'));
  },
});

function sniff(buf) {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 12 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'webp';
  if (buf.length >= 12 && buf.slice(4, 8).toString('ascii') === 'ftyp' && ['avif', 'avis'].includes(buf.slice(8, 12).toString('ascii'))) return 'avif';
  return null;
}

/** After multer: check each file's real type, rename with the right extension, or delete everything and reject. */
async function verifyImages(req, _res, next) {
  const files = req.files || [];
  try {
    for (const f of files) {
      const fd = await fs.promises.open(f.path, 'r');
      const { buffer } = await fd.read(Buffer.alloc(16), 0, 16, 0);
      await fd.close();
      const ext = sniff(buffer);
      if (!ext) throw ApiError.badRequest(`${f.originalname} is not a valid image file`);
      const finalName = `${f.filename.replace(/^tmp-/, '')}.${ext}`;
      await fs.promises.rename(f.path, path.join(UPLOAD_DIR, finalName));
      f.filename = finalName;
      f.path = path.join(UPLOAD_DIR, finalName);
    }
    next();
  } catch (err) {
    await Promise.all(files.map((f) => fs.promises.unlink(f.path).catch(() => {})));
    next(err);
  }
}

module.exports = upload;
module.exports.verifyImages = verifyImages;
