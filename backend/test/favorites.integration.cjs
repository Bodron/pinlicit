// Run only against a disposable replica set, never the application database.
require('reflect-metadata');
const path=require('node:path');
const testUri=process.env.MONGO_TEST_URI;
if (!testUri) throw new Error('MONGO_TEST_URI must point to a disposable replica set.');
const assert=require('node:assert/strict');
const mongoose=require('mongoose');
const {FavoritesService}=require(path.join(process.cwd(),'dist/favorites/favorites.service.js'));
const {ProductSchema}=require(path.join(process.cwd(),'dist/products/schemas/product.schema.js'));
const {FavoriteSchema}=require(path.join(process.cwd(),'dist/favorites/schemas/favorite.schema.js'));
(async()=>{
 try {
  await mongoose.connect(testUri,{serverSelectionTimeoutMS:10000});
  const Product=mongoose.model('Product',ProductSchema);
  const Favorite=mongoose.model('Favorite',FavoriteSchema);
  mongoose.model('User',new mongoose.Schema({name:String}));
  mongoose.model('Category',new mongoose.Schema({name:String}));
  await Promise.all([Product.init(),Favorite.init()]);
  const seller=new mongoose.Types.ObjectId();
  const product=await Product.create({seller,category:new mongoose.Types.ObjectId(),title:'Isolated test',description:'Test only',videoKey:'test',videoUrl:'https://example.com/test.mp4',startingPrice:100,currentPrice:100,minBidIncrement:10,buyNowPrice:500,startsAt:new Date(),endsAt:new Date(Date.now()+86400000)});
  const service=new FavoritesService(Favorite,{getModel:()=>Product});
  const id=product._id.toString();
  const check=async(expected)=>{
    assert.equal(await Favorite.countDocuments({product:product._id}),expected);
    assert.equal((await Product.findById(id)).favoriteCount,expected);
  };
  await assert.rejects(()=>service.add(seller.toString(),id),/own product/);
  await check(0);
  console.log('PASS self-favorite rejected without counter changes');
  const users=Array.from({length:12},()=>new mongoose.Types.ObjectId().toString());
  await Promise.all(users.map(user=>service.add(user,id)));
  await check(12);
  console.log('PASS 12 concurrent distinct-user adds');
  await Promise.all(Array.from({length:8},()=>service.add(users[0],id)));
  await check(12);
  console.log('PASS repeated add is idempotent');
  await Promise.all(users.flatMap(user=>[service.remove(user,id),service.remove(user,id)]));
  await check(0);
  console.log('PASS 24 concurrent/repeated removals never underflow');
  const raceUser=new mongoose.Types.ObjectId().toString();
  await Promise.all(Array.from({length:8},()=>service.add(raceUser,id)));
  await check(1);
  console.log('PASS concurrent first add from the same user');
  await service.remove(raceUser,id);
  const original=Product.updateOne;
  Product.updateOne=()=>{throw new Error('simulated counter write failure');};
  await assert.rejects(()=>service.add(raceUser,id),/simulated/);
  Product.updateOne=original;
  await check(0);
  console.log('PASS failed counter write rolls back favorite insertion');
 }catch(error){console.error(error);process.exitCode=1;}
 finally{await mongoose.disconnect();}
})();
