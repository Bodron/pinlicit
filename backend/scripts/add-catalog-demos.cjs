/* Additive demo catalogue. Stable IDs; existing listings are never updated. */
require('reflect-metadata');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const mongoose = require('mongoose');
const sharp = require('sharp');
const { ProductSchema } = require('../dist/products/schemas/product.schema');
const values = require('dotenv').parse(fs.readFileSync(process.env.ENV_FILE || '.env'));
const rows = require('./catalog-demo-products.json');
const batch = 'pinbind-catalog-demo-2026-10-v1';
const apply = process.argv.includes('--apply');
const enableStripe = process.argv.includes('--enable-stripe');
const idFor = (slug) => new mongoose.Types.ObjectId(createHash('sha256').update(`${batch}:${slug}`).digest('hex').slice(0, 24));

async function main() {
  if (!values.STRIPE_SECRET_KEY?.startsWith('sk_test_')) throw Error('Sandbox required');
  if (enableStripe) {
    const { StripeClientService } = require('../dist/commerce/stripe-client.service');
    const config = new StripeClientService({ get: (key) => values[key] }).mobileConfig();
    if (!config.ready || config.deferredSellerOnboarding !== true) throw Error('Deferred onboarding sandbox build required');
  }
  if (rows.length !== 12 || new Set(rows.map(r => r.slug)).size !== rows.length) throw Error('Unexpected catalogue scope');
  await mongoose.connect(values.MONGODB_URI, { autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;
  // Reuse the seller of the previous demo batch; never create or modify users.
  const source = await db.collection('products').findOne({ 'demoFixture.batch': 'pinbind-display-demo-2026-10-v1' });
  const seller = source && await db.collection('users').findOne({ _id: source.seller, role: 'seller', blocked: false });
  if (!seller) throw Error('Existing demo seller is not eligible');
  const Product = mongoose.model('Product', ProductSchema);
  const prepared = [];
  for (const [index, row] of rows.entries()) {
    const id = idFor(row.slug);
    const existing = await db.collection('products').findOne({ _id: id });
    if (existing) {
      if (existing.demoFixture?.batch !== batch) throw Error('Fixture ID collision');
      console.log('Already present, unchanged:', row.title);
      continue;
    }
    if (![row.price, row.buy, row.increment].every(Number.isSafeInteger) || row.price < 3000 || row.buy <= row.price || row.increment < 1) throw Error('Invalid prices in bani');
    const category = await db.collection('categories').findOne({ slug: row.category });
    if (!category) throw Error('Category missing');
    const variants = [];
    for (const width of [320, 960, 1280]) {
      const url = `https://images.pexels.com/photos/${row.photo}/pexels-photo-${row.photo}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) throw Error(`Image unavailable: ${row.slug}`);
      const data = Buffer.from(await response.arrayBuffer());
      if (data.length > 10 * 1024 * 1024) throw Error('Image too large');
      const meta = await sharp(data).metadata();
      if (!meta.width || !meta.height || meta.width * meta.height > 40000000) throw Error('Invalid image dimensions');
      variants.push({ key: `demo/pexels/${row.photo}/${width}`, url, width: meta.width, height: meta.height, bytes: data.length, contentType: `image/${meta.format}` });
    }
    const now = new Date();
    const product = new Product({
      _id: id, seller: seller._id, category: category._id,
      title: `${row.title} — DEMO`,
      description: `${row.description}\n\nAnunț demonstrativ pentru testarea Pinbind. Fotografie ilustrativă, nu reprezintă un produs oferit efectiv spre vânzare. Prețuri de test. ${enableStripe ? 'Plata și garanția de licitare sunt simulate în sandboxul Stripe; nu folosi un card real.' : 'Activarea plăților necesită înscrierea explicită în checkout sandbox.'}\nSursa fotografiei: https://www.pexels.com/photo/${row.photo}/ (Pexels License).`,
      imageUrl: variants.at(-1).url, imageVariants: variants,
      status: 'active', startingPrice: row.price, currentPrice: row.price,
      minBidIncrement: row.increment, buyNowPrice: row.buy, favoriteCount: 0,
      startsAt: new Date(now.getTime() - 60000),
      endsAt: new Date(now.getTime() + (3 + index) * 86400000),
      ...(enableStripe ? { commerceVersion: 1 } : {}),
      createdAt: now, updatedAt: now,
    });
    await product.validate();
    prepared.push({ ...product.toObject(), demoFixture: { batch, slug: row.slug, purpose: enableStripe ? 'sandbox-catalogue' : 'display-only' }, demoImage: { illustrative: true, sourcePage: `https://www.pexels.com/photo/${row.photo}/`, license: 'Pexels License', licenseUrl: 'https://www.pexels.com/license/', delivery: 'public-source' } });
    console.log('Prepared:', row.title, String(id), `${row.price / 100} → ${row.buy / 100} RON`);
  }
  if (apply && prepared.length) {
    // All images and documents are validated before the first insert.
    const result = await db.collection('products').bulkWrite(prepared.map(p => ({ updateOne: { filter: { _id: p._id, 'demoFixture.batch': batch }, update: { $setOnInsert: p }, upsert: true } })), { ordered: true });
    console.log('Inserted:', result.upsertedCount);
  }
  const count = await db.collection('products').countDocuments({ 'demoFixture.batch': batch, status: 'active', endsAt: { $gt: new Date() } });
  console.log(apply ? 'Active catalogue demos:' : 'Dry run; active catalogue demos currently:', count);
}
main().catch(error => { console.error('Catalogue operation failed:', error.name, error.message?.includes('mongodb') ? 'Database connection failed' : error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
