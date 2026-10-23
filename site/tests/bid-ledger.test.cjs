const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const moduleValue={exports:{}};
const source=ts.transpileModule(fs.readFileSync(require('node:path').join(__dirname,'../src/lib/bid-ledger.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
vm.runInNewContext(source,{module:moduleValue,exports:moduleValue.exports,Date});
const {isLivePosition,positionStatus,selectPositions,ledgerCsv}=moduleValue.exports;
const now=Date.parse('2026-10-21T12:00:00Z');
function position(id,leading,endsAt,status='active',price=10000,lastBidAt='2026-10-20T00:00:00Z'){return {leading,maxAmount:15000,lastBidAt,product:{_id:id,title:'Produs '+id,description:'Descriere',endsAt,status,currentPrice:price}};}
const live=position('one',true,'2026-10-22T00:00:00Z');
const outbid=position('two',false,'2026-10-21T14:00:00Z','active',20000,'2026-10-21T10:00:00Z');
const closed=position('three',true,'2026-10-20T00:00:00Z');
const reserved=position('four',false,'2026-10-24T00:00:00Z','reserved');
const rows=[live,outbid,closed,reserved];
test('filters distinguish active, outbid, closed-leading and unavailable listings',()=>{assert.equal(selectPositions(rows,'active','','ending',now).length,2);assert.equal(selectPositions(rows,'outbid','','ending',now)[0].product._id,'two');assert.equal(selectPositions(rows,'leading-closed','','ending',now)[0].product._id,'three');assert.equal(isLivePosition(reserved,now),false);assert.equal(positionStatus(reserved,now),'Anunț rezervat');assert.equal(positionStatus(closed,now),'Încheiată în frunte');});
test('search includes IDs and sort respects price and recent own activity',()=>{assert.equal(selectPositions(rows,'all','two','ending',now).length,1);assert.equal(selectPositions(rows,'all','','price',now)[0].product._id,'two');assert.equal(selectPositions(rows,'all','','recent',now)[0].product._id,'two');});
test('CSV exports the selected records, converts bani and neutralizes spreadsheet formulas',()=>{const unsafe={...live,product:{...live.product,title:'  =HYPERLINK("bad")'}};const csv=ledgerCsv([unsafe],now);assert.equal(csv[0],'\uFEFF');assert.equal(csv.split('\r\n').length,2);assert.ok(csv.includes('"100.00"'));assert.ok(csv.includes('"150.00"'));assert.ok(csv.includes('"\'  =HYPERLINK(""bad"")"'));assert.ok(!csv.includes('Produs two'));});
