const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
function load(relative,overrides={}) {
 const filename=path.join(__dirname,'../src',relative);
 const output=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 const requireFromSite=require('node:module').createRequire(path.join(__dirname,'../package.json'));
 vm.runInNewContext(output,{exports:module.exports,module,require:(name)=>Object.hasOwn(overrides,name)?overrides[name]:requireFromSite(name),URL,Request,Response,AbortSignal,Buffer,process,Date,Map},{filename});
 return module.exports;
}
const aggregation=load('lib/account-positions.ts');
const product={_id:'p1',title:'Produs',status:'active',currentPrice:200,startingPrice:100,minBidIncrement:10,highestBid:'b1',seller:{name:'Vânzător',email:'private@example.invalid'},reservedBy:{email:'buyer@example.invalid'},videoKey:'private-key'};
test('multiple bids produce one position with greatest maximum; leadership uses highestBid, not the latest bid',()=> {
 const positions=aggregation.positionsFromBids([{_id:'b1',product,amount:150,maxAmount:500,createdAt:'2026-01-01'},{_id:'b2',product,amount:200,maxAmount:400,createdAt:'2026-01-02'}]);
 assert.equal(positions.length,1);assert.equal(positions[0].maxAmount,500);assert.equal(positions[0].leading,true);assert.equal(positions[0].lastBidAt,'2026-01-02');
});
test('deleted and hidden products do not become account positions; outbid remains outbid',()=> {
 const positions=aggregation.positionsFromBids([{_id:'b2',product:{...product,highestBid:'other'},amount:120,createdAt:'2026-01-01'},{_id:'b3',product:null,amount:500},{_id:'b4',product:{...product,status:'hidden'},amount:500}]);
 assert.equal(positions.length,1);assert.equal(positions[0].leading,false);assert.equal(positions[0].maxAmount,120);
});
test('product projection excludes other users contacts, reservation identity and storage keys',()=> {
 const p=aggregation.accountProduct(product);assert.equal(p.seller.name,'Vânzător');assert.equal(p.seller.email,undefined);assert.equal(p.reservedBy,undefined);assert.equal(p.videoKey,undefined);assert.equal(p.highestBid,undefined);
});
const {sameOrigin}=load('lib/session-server.ts',{'server-only':{},'next/headers':{}});
const privateHeaders={'Cache-Control':'private, no-store',Vary:'Cookie'};
function route(upstream) {return load('app/api/session/route.ts',{'@/lib/session-server':{backendRequest:upstream,sameOrigin,privateHeaders,sessionCookie:'pinbind_session'}});}
function request(body,origin='http://localhost:3002',method='POST') {return new Request('http://localhost:3002/api/session',{method,headers:{host:'localhost:3002',origin,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});}
test('login and logout reject foreign origins before reaching the API',async()=> {
 let called=false;const r=route(async()=>{called=true;});assert.equal((await r.POST(request({},'https://foreign.example'))).status,403);assert.equal((await r.DELETE(request(null,'https://foreign.example','DELETE'))).status,403);assert.equal(called,false);
});
test('invalid login body never reaches the API',async()=> {
 let called=false;const r=route(async()=>{called=true;});for(const body of [null,{}, {email:'x',password:'12345678'}])assert.equal((await r.POST(request(body))).status,400);assert.equal(called,false);
});
test('successful login issues HttpOnly same-site cookie and does not return bearer token',async()=> {
 const r=route(async()=>Response.json({accessToken:'fixture-token',user:{name:'Fixture'}}));const response=await r.POST(request({email:'test@example.invalid',password:'fixture-password'}));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'private, no-store');const cookie=response.headers.get('set-cookie');assert.match(cookie,/HttpOnly/i);assert.match(cookie,/SameSite=lax/i);assert.match(cookie,/Path=\//i);assert.equal((await response.json()).accessToken,undefined);
});
test('invalid credentials do not create a session; logout expires the session cookie',async()=> {
 const r=route(async()=>Response.json({}, {status:401}));const denied=await r.POST(request({email:'test@example.invalid',password:'fixture-password'}));assert.equal(denied.status,401);assert.equal(denied.headers.get('set-cookie'),null);const logout=await r.DELETE(request(null,undefined,'DELETE'));assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/i);
});
test('account API partial failure remains unavailable instead of appearing as zero',async()=> {
 const {getAccount}=load('lib/account-server.ts',{'server-only':{},'./account-positions':aggregation,'./session-server':{sessionToken:async()=>'fixture-token',backendRequest:async(path)=>path==='me'?Response.json({id:'u1',name:'Fixture',email:'test@example.invalid',role:'user'}):path==='me/bids'?Response.json([]):path==='me/favorites'?Response.json({}, {status:503}):Response.json([])}});
 const result=await getAccount();assert.equal(result.status,200);assert.equal(result.data.favorites,null);assert.equal(result.data.positions.length,0);assert.equal(result.data.warnings.length,1);
});
test('expired session discards all account data',async()=> {
 const {getAccount}=load('lib/account-server.ts',{'server-only':{},'./account-positions':aggregation,'./session-server':{sessionToken:async()=>'expired',backendRequest:async()=>Response.json({}, {status:401})}});const result=await getAccount();assert.equal(result.status,401);assert.equal(result.data,null);
});
