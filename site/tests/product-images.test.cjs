const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const code=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/lib/product-images.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const value={exports:{}};vm.runInNewContext(code,{module:value,exports:value.exports});const {productImageUrl}=value.exports;
test('responsive selection downloads the smallest adequate variant without mutating the manifest',()=>{
 const product={imageUrl:'large.webp',imageVariants:[{width:1920,url:'large.webp'},{width:320,url:'thumb.webp'},{width:960,url:'card.webp'}]};
 assert.equal(productImageUrl(product,240),'thumb.webp');assert.equal(productImageUrl(product,600),'card.webp');assert.equal(productImageUrl(product,1080),'large.webp');assert.equal(productImageUrl(product,3000),'large.webp');assert.equal(product.imageVariants[0].width,1920);
});
test('legacy listings retain their original photo URL',()=>assert.equal(productImageUrl({imageUrl:'legacy.jpg'},320),'legacy.jpg'));
