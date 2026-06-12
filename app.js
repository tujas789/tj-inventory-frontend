/* app.js — UI logic: login/เบิก/รับเข้า/พิมพ์ฉลาก/สต๊อก/หมดอายุ + init (แตกจาก index.html — T-030) */

/* ===== Session ===== */
// [T-014] token อายุ 30 วัน → ใช้ localStorage (รอดข้ามการปิดเบราว์เซอร์ ไม่ต้อง login ทุกวัน)
function saveSession(o){ try{ localStorage.setItem('tj_user', JSON.stringify(o)); }catch(e){} }
function clearSession(){ try{ localStorage.removeItem('tj_user'); sessionStorage.removeItem('tj_user'); }catch(e){} }
function loadSession(){ try{ const r=localStorage.getItem('tj_user'); return r?JSON.parse(r):null; }catch(e){ return null; } }
// [T-014] token หมดอายุ/ถูกลบฝั่ง server → เคลียร์ session กลับหน้า login (เรียกจาก apiPost จุดเดียว)
function forceRelogin(){
  if(!CURRENT) return;
  stopCam(); CURRENT=null; clearSession();
  $('app').classList.add('hidden'); $('login').classList.remove('hidden');
  $('pinInput').value='';
  toast(APP_TEXT.login.sessionExpired, false);
}

/* ===== Toast ===== */
function toast(msg, ok=true){
  const el=$('toast'); el.textContent=msg;
  el.className='toast show '+(ok?'ok':'err');
  clearTimeout(el._t); el._t=setTimeout(()=>el.className='toast', 2500);
  if(navigator.vibrate) navigator.vibrate(ok?60:[60,40,60]);
}

/* ===== Login ===== */
function loadUsers(){
  const sel=$('userSel');
  apiGet('getUsers')
    .then(res=>{
      if(!res||!res.ok){ sel.innerHTML=`<option value="">⚠️ ${esc((res&&res.error)||APP_TEXT.login.noUsers)}</option>`; return; }
      if(!res.users.length){ sel.innerHTML=`<option value="">${APP_TEXT.login.noUsers}</option>`; return; }
      sel.innerHTML=res.users.map(u=>`<option value="${esc(u.user_id)}">${esc(u.display_name)}</option>`).join('');
    })
    .catch(e=>{
      sel.innerHTML=`<option value="">⚠️ โหลดรายชื่อไม่ได้</option>`;
      toast(tf(APP_TEXT.login.loadUsersFailTpl,{msg:e.message}),false);
    });
}
function doLogin(){
  const user_id=$('userSel').value; const pin=$('pinInput').value.trim();
  if(!user_id){ toast(APP_TEXT.login.pickUser,false); return; }
  if(!pin){ toast(APP_TEXT.login.enterPin,false); $('pinInput').focus(); return; }
  $('loginBtn').disabled=true;
  apiPost({action:'verifyPin', user_id, pin})
    .then(res=>{
      $('loginBtn').disabled=false;
      if(!res||!res.ok){ toast((res&&res.error)||APP_TEXT.login.failed,false); $('pinInput').select(); return; }
      CURRENT=res; saveSession(res); enterApp();
    })
    .catch(e=>{ $('loginBtn').disabled=false; toast(tf(APP_TEXT.common.errorTpl,{msg:e.message}),false); });
}
function doLogout(){
  // [T-014] แจ้ง server ลบ token (best-effort — เน็ตล่มก็ออกจากหน้าจอได้)
  if(CURRENT && CURRENT.token){ try{ apiPost({action:'logout'}).catch(()=>{}); }catch(e){} }
  stopCam(); CURRENT=null; clearSession();
  $('app').classList.add('hidden'); $('login').classList.remove('hidden');
  $('pinInput').value=''; $('pinInput').focus();
}
function enterApp(){
  $('whoName').textContent=CURRENT.display_name;
  $('login').classList.add('hidden'); $('app').classList.remove('hidden');
  showTab('issue');
}

/* ===== Tabs ===== */
let receiveTabInited=false;
let expiryTabInited=false;
let stockTabInited=false;
function showTab(name){
  ['issue','receive','stock','expiry'].forEach(n=>{
    $('tab-'+n).classList.toggle('hidden', n!==name);
    const btn=$('tab-btn-'+n);
    btn.classList.toggle('active', n===name);
    btn.setAttribute('aria-selected', n===name ? 'true' : 'false');  // [T-025]
  });
  if(name==='issue'){ stopCam(); $('issueInput').focus(); }
  if(name==='receive'){
    if(!receiveTabInited){ receiveTabInited=true; initReceiveTab(); }
    renderLabelSample();   // [T-033] ตัวอย่างฉลากสด
  }
  if(name==='stock' && !stockTabInited){ stockTabInited=true; initStockTab(); }
  if(name==='expiry' && !expiryTabInited){ expiryTabInited=true; initExpiryTab(); }
}

/* ===== เบิกจ่าย ===== */
// [T-015] unit_barcode = เลขล้วน (ADR-0003) → ดึงเฉพาะตัวเลข ตัดขยะ/prefix/suffix/Enter ที่เครื่องยิงหรือกล้องแถมมา
// คุมทุกทางเข้า (กล้อง/เครื่องยิง/พิมพ์มือ) เพราะทุกทางวิ่งผ่าน doIssue
function normalizeBarcode(raw){
  const s=String(raw==null?'':raw).trim();
  const digits=s.replace(/\D/g,'');   // เก็บเฉพาะ 0-9
  return digits || s;                 // ถ้าไม่มีเลขเลย คืนค่าเดิม (กันพัง)
}
function doIssue(code){
  const input=$('issueInput');
  const bc=normalizeBarcode(code||input.value);
  if(!bc||busy) return;
  busy=true; $('issueBtn').disabled=true;
  apiPost({action:'issueForUI', unit_barcode:bc, user:CURRENT.user_id})
    .then(res=>{
      busy=false; $('issueBtn').disabled=false;
      if(!res||!res.ok){ toast(tf(APP_TEXT.issue.failTpl,{msg:(res&&res.error)||APP_TEXT.issue.failed}),false); input.select(); return; }
      toast(tf(APP_TEXT.issue.okTpl,{name:res.product_name||res.unit_barcode}));
      recent.unshift(res); renderRecent(); input.value=''; input.focus();
    })
    .catch(e=>{ busy=false; $('issueBtn').disabled=false; toast(tf(APP_TEXT.issue.failTpl,{msg:tf(APP_TEXT.common.errorTpl,{msg:e.message})}),false); input.select(); });
}
function renderRecent(){
  if(!recent.length){ $('recent').innerHTML=`<div class="empty">${APP_TEXT.recent.empty}</div>`; return; }
  $('recent').innerHTML=recent.slice(0,10).map(r=>{
    const tm=new Date().toLocaleTimeString('th-TH',{hour:'2-digit',minute:'2-digit'});
    return `<div class="item"><div class="top"><div><div class="name">${esc(r.product_name||r.unit_barcode)}</div><div class="meta">${esc(r.unit_barcode)} • ${APP_TEXT.recent.lotPrefix} ${esc(r.lot_no||'-')}</div></div><div class="muted">${tm}</div></div></div>`;
  }).join('');
}

/* ===== กล้องสแกน (tab เบิกจ่าย) ===== */
let cam=null;
function toggleCam(){
  if(cam){ stopCam(); return; }
  $('reader').classList.remove('hidden');
  // [T-015] อ่าน Code128 จากกล้องให้ติด:
  //   (1) จำกัด format = CODE_128 → ตัวอ่านโฟกัส ไม่ไล่ทุก type (เดิมอ่านไม่ติด)
  //   (2) เปิด BarcodeDetector native ของเครื่อง (Android Chrome เร็ว/แม่นกว่า ZXing มาก ; iOS ไม่มี → fallback เอง)
  const camCfg={verbose:false, experimentalFeatures:{useBarCodeDetectorIfSupported:true}};
  if(window.Html5QrcodeSupportedFormats){
    // [T-015] QR ก่อน (iOS+Android กล้องอ่านชัวร์) + Code128 (เผื่อยิงฉลากเก่า/Android)
    camCfg.formatsToSupport=[Html5QrcodeSupportedFormats.QR_CODE, Html5QrcodeSupportedFormats.CODE_128];
  }
  cam=new Html5Qrcode('reader', camCfg);
  // [T-015] iPhone (iOS Safari ไม่มี BarcodeDetector → ตก ZXing) อ่าน QR ติด:
  //   (1) ขอวิดีโอความละเอียดสูง (1920) + โฟกัสต่อเนื่อง → ภาพคม โฟกัส QR ระยะใกล้ได้
  //   (2) qrbox เป็น "จัตุรัส" ตามรูปทรง QR (เดิมเป็นผืนผ้า 280×140 ไม่พอดี) + ปรับตามขนาดจอ
  // ⚠️ arg แรกของ cam.start() ต้องมี key เดียว (html5-qrcode บังคับ) — constraints ละเอียดวางใน config.videoConstraints
  const videoConstraints={ width:{ideal:1920}, height:{ideal:1080},
                           facingMode:{ideal:'environment'}, advanced:[{focusMode:'continuous'}] };
  const qrboxFn=(vw,vh)=>{ const m=Math.floor(Math.min(vw,vh)*0.72); return {width:m,height:m}; };
  cam.start({facingMode:'environment'},{fps:12,qrbox:qrboxFn,videoConstraints:videoConstraints},
    txt=>{
      // [T-013] สแกน→ใส่กล่อง→กดยืนยัน (ไม่ตัดทันที กันยิงผิดตัด)
      const code=normalizeBarcode(txt);   // [T-015] ดึงเฉพาะตัวเลข กันขยะจากการสแกน
      stopCam();
      const input=$('issueInput');
      input.value=code; input.focus();
      toast(tf(APP_TEXT.issue.scannedTpl,{code}));
    },
    ()=>{}).catch(e=>toast(tf(APP_TEXT.cam.openFailTpl,{msg:e}),false));
}
function stopCam(){ if(cam){ cam.stop().then(()=>cam.clear()).catch(()=>{}); cam=null; } $('reader').classList.add('hidden'); }

/* ===== รับเข้า ===== */
let recvProducts=[];
let isNewProduct=false;
let lastReceive=null;   // เก็บผลรับเข้าล่าสุดไว้พิมพ์ฉลาก (T-008)

function initReceiveTab(){
  apiGet('getProducts')
    .then(res=>{
      recvProducts=(res&&res.ok)?res.products:[];
      renderProductDropdown(recvProducts);
    })
    .catch(e=>toast(tf(APP_TEXT.receive.loadProductsFailTpl,{msg:e.message}),false));
}

function renderProductDropdown(list){
  const sel=$('recvProductSel');
  if(!list||!list.length){ sel.innerHTML=`<option value="">${APP_TEXT.receive.noProducts}</option>`; return; }
  sel.innerHTML=`<option value="">${APP_TEXT.receive.pickProduct}</option>`+
    list.map(p=>`<option value="${esc(p.product_id)}">${esc(p.name)} (${esc(p.unit_of_measure)})</option>`).join('');
}

function scanVendorBarcode(){
  const bc=$('recvVbcInput').value.trim();
  if(!bc) return;
  apiGet('lookupByVendorBarcode', {vendor_barcode:bc})
    .then(res=>{
      if(!res||!res.ok){ toast(res.error||APP_TEXT.receive.searchFail,false); return; }
      $('recvVbcInput').value='';
      if(res.products.length===0){
        toast(APP_TEXT.receive.notFound,false);
        showNewProductForm(bc);
      } else if(res.products.length===1){
        selectProduct(res.products[0]);
        toast(tf(APP_TEXT.receive.foundTpl,{name:res.products[0].name}));
      } else {
        renderProductDropdown(res.products);
        toast(tf(APP_TEXT.receive.foundManyTpl,{n:res.products.length}));
      }
    })
    .catch(e=>toast(tf(APP_TEXT.receive.searchFailTpl,{msg:e.message}),false));
}

function selectProduct(prod){
  const sel=$('recvProductSel');
  let found=false;
  for(let i=0;i<sel.options.length;i++){
    if(sel.options[i].value===prod.product_id){ sel.selectedIndex=i; found=true; break; }
  }
  if(!found){
    const opt=document.createElement('option');
    opt.value=prod.product_id; opt.textContent=prod.name+' ('+prod.unit_of_measure+')';
    sel.appendChild(opt); sel.value=prod.product_id;
  }
  hideNewProductForm();
  renderLabelSample();   // [T-033]
}

function showNewProductForm(vbc){
  isNewProduct=true;
  $('newProductForm').classList.remove('hidden');
  if(vbc) $('newProductVbc').value=vbc;
  $('newProductName').focus();
}
function hideNewProductForm(){
  isNewProduct=false;
  $('newProductForm').classList.add('hidden');
}
function toggleNewProduct(){
  if($('newProductForm').classList.contains('hidden')){
    $('recvProductSel').value='';
    showNewProductForm($('recvVbcInput').value.trim());
  } else {
    hideNewProductForm();
  }
  renderLabelSample();   // [T-033] ชื่อบนตัวอย่างเปลี่ยนแหล่ง (dropdown ↔ ช่องชื่อใหม่)
}

function doReceive(){
  const expiry=$('recvExpiry').value.trim();
  const qty=Number($('recvQty').value);
  if(!expiry){ toast(APP_TEXT.receive.needExpiry,false); $('recvExpiry').focus(); return; }
  if(!qty||qty<1){ toast(APP_TEXT.receive.needQty,false); $('recvQty').focus(); return; }

  const payload={lot_no:$('recvLotNo').value.trim(), expiry_date:expiry, qty, user:CURRENT.user_id};

  if(isNewProduct){
    const name=$('newProductName').value.trim();
    const uom=$('newProductUom').value.trim();
    if(!name){ toast(APP_TEXT.receive.needName,false); $('newProductName').focus(); return; }
    if(!uom){ toast(APP_TEXT.receive.needUom,false); $('newProductUom').focus(); return; }
    payload.new_product={name, unit_of_measure:uom, vendor_barcode:$('newProductVbc').value.trim()};
  } else {
    const pid=$('recvProductSel').value;
    if(!pid){ toast(APP_TEXT.receive.needProduct,false); return; }
    payload.product_id=pid;
  }

  $('recvBtn').disabled=true;
  apiPost(Object.assign({action:'receiveForUI'}, payload))
    .then(res=>{
      $('recvBtn').disabled=false;
      if(!res||!res.ok){ toast(res.error||APP_TEXT.receive.failed,false); return; }
      toast(tf(APP_TEXT.receive.okTpl,{n:res.unit_barcodes.length}));
      // เก็บข้อมูลฉลากฝั่ง client (ชื่อ/วันหมดอายุ/วันที่รับ/unit_barcode) — ครบไม่ต้องถาม server ซ้ำ
      // received: ใช้ stamp จาก server (T-031) — fallback วันที่เครื่องถ้า backend ยังเป็น version เก่า
      lastReceive={
        product_name: res.product_name||res.product_id,
        expiry:       payload.expiry_date,
        received:     String(res.received_at||todayLocalIso()).slice(0,10),
        lot_no:       payload.lot_no,
        lot_id:       res.lot_id,
        unit_barcodes:res.unit_barcodes,
      };
      renderReceiveResult(res);
    })
    .catch(e=>{ $('recvBtn').disabled=false; toast(tf(APP_TEXT.common.errorTpl,{msg:e.message}),false); });
}

function renderReceiveResult(res){
  $('recvResultBody').innerHTML=
    `<div class="item">
       <div class="name">${esc(res.product_name||res.product_id)}</div>
       <div class="meta">${tf(APP_TEXT.receive.resultMetaTpl,{lot:esc(res.lot_id), n:res.unit_barcodes.length, txn:esc(res.txn_id)})}</div>
     </div>
     <div style="margin-top:10px">
       <div class="muted" style="margin-bottom:4px">${APP_TEXT.receive.barcodeListHead}</div>
       <div class="monospace">${res.unit_barcodes.map(esc).join('<br>')}</div>
     </div>`;
  $('printBtn').textContent=tf(APP_TEXT.receive.printBtnTpl,{n:res.unit_barcodes.length});
  $('recvResult').classList.remove('hidden');
}

function resetReceive(){
  $('recvVbcInput').value=''; $('recvLotNo').value='';
  $('recvExpiry').value=''; $('recvQty').value='1';
  $('newProductName').value=''; $('newProductUom').value=''; $('newProductVbc').value='';
  hideNewProductForm();
  $('recvResult').classList.add('hidden');
  lastReceive=null;
  receiveTabInited=false; initReceiveTab();  // refresh dropdown (กรณีสร้างชนิดใหม่)
  $('recvVbcInput').focus();
}

/* ===== พิมพ์ฉลาก thermal (T-008) =====
   [T-033] เทมเพลต+core พิมพ์ทั้งหมดย้ายไป labels.js (single source ใช้ร่วม print-history.html)
   ที่นี่เหลือเฉพาะส่วนที่ผูกกับหน้าแอป: printLabels(lastReceive) + ตัวอย่างฉลากสด + ?labelpreview */
function printLabels(){
  if(!lastReceive || !lastReceive.unit_barcodes || !lastReceive.unit_barcodes.length){
    toast(APP_TEXT.print.noLabels,false); return;
  }
  printLabelItems(buildLabelItems(lastReceive));
}

/* ===== ตัวอย่างฉลากสดในแท็บรับเข้า (T-033) =====
   render จากเทมเพลตเดียวกับพิมพ์จริง (labels.js) → เห็นบนจอ = ที่ออกจากเครื่องพิมพ์
   อัปเดตตามที่กรอก: ชนิด/ชื่อใหม่/วันหมดอายุ/จำนวน · เลขตัวอย่าง 00000000 (เลขจริงออกตอนกดรับ) */
function renderLabelSample(){
  const box=$('labelSample');
  if(!box || typeof JsBarcode==='undefined') return;
  if(!document.getElementById('labelSampleCss')){
    const st=document.createElement('style');
    st.id='labelSampleCss';
    // .label/.lb-* ไม่ชน style อื่นบนจอ (style.css ใช้ชื่อนี้เฉพาะใน @media print — legacy T-008)
    // ตัด selector ครอบจักรวาล (*{...} กับ html,body{...}) ออก — กันไปรีเซ็ต style ทั้งแอป
    st.textContent=LABEL_CSS
      .replace('*{margin:0;padding:0;box-sizing:border-box;}','')
      .replace('html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}','')
      +'#labelSample{zoom:1.55;width:max-content;margin-top:4px;}'
      +'#labelSample .label{outline:0.3mm dashed #5a6470;}'
      +'#labelSample .label *{margin:0;padding:0;box-sizing:border-box;}';
    document.head.appendChild(st);
  }
  let name='';
  if(isNewProduct){ name=$('newProductName').value.trim(); }
  else {
    const sel=$('recvProductSel');
    const opt=sel.options[sel.selectedIndex];
    if(sel.value && opt) name=opt.textContent.replace(/\s*\([^)]*\)\s*$/,'');
  }
  const qty=Math.max(1, Number($('recvQty').value)||1);
  const items=buildLabelItems({
    product_name: name||'(ชื่อน้ำยา)',
    expiry:       $('recvExpiry').value.trim(),
    received:     todayLocalIso(),
    unit_barcodes:['00000000'].concat(Array(qty-1).fill('')).slice(0,qty),
  });
  box.innerHTML=buildLabelItem(items[0]);   // โชว์ดวงแรก (1/N)
}

/* ===== พรีวิวฉลากบนจอ (dev) — เปิด index.html?labelpreview=00000027,00000028 =====
   ใช้เทมเพลตเดียวกับพิมพ์จริง (buildLabelBody) → ที่เห็นบนจอ = ที่พิมพ์ออกมาเป๊ะ */
function initLabelPreview(){
  const q=new URLSearchParams(location.search);
  if(!q.has('labelpreview')) return false;
  const raw=q.get('labelpreview');
  const codes=(raw&&raw.trim())?raw.split(',').map(s=>s.trim()).filter(Boolean):['00000027'];
  const name=q.get('name')||'On call Advance Cleaner Premium';
  const expRaw=q.get('exp')||'2026-06-04';
  const recvRaw=q.get('recv')||todayLocalIso();   // [T-031] override ได้ด้วย ?recv=YYYY-MM-DD
  // [T-033] ใช้ buildLabelItems (labels.js) → ได้ seq n/N ตรงกับของจริง
  const items=buildLabelItems({product_name:name, expiry:expRaw, received:recvRaw, unit_barcodes:codes});
  $('login').classList.add('hidden'); $('app').classList.add('hidden');
  const st=document.createElement('style');
  st.textContent=LABEL_CSS+
    ';.pv-page{padding:28px;background:#3a3f47;min-height:100vh;font-family:"IBM Plex Sans",sans-serif;color:#eaecef;}'+
    '.pv-page h3{font-size:12px;font-weight:600;color:#9aa3ad;letter-spacing:.06em;text-transform:uppercase;margin:0 0 12px;}'+
    '.pv-real .label{outline:1px solid #f6465d;margin-bottom:10px;}'+
    '.pv-zoomwrap{zoom:8;width:max-content;}.pv-zoomwrap .label{outline:0.12mm solid #f6465d;margin-bottom:1.4mm;}';
  document.head.appendChild(st);
  const div=document.createElement('div');
  div.className='pv-page';
  div.innerHTML='<h3>Real size · 50 × 25 mm</h3><div class="pv-real">'+buildLabelBody(items)+'</div>'+
    '<h3 style="margin-top:34px">Zoom × 8</h3><div class="pv-zoomwrap">'+buildLabelBody(items)+'</div>';
  document.body.appendChild(div);
  return true;
}

/* ===== เช็คสต๊อก (T-016) — accordion รายชนิด → รายล็อต FEFO ===== */
let stockData=[];   // rows จาก stockByProduct

function initStockTab(){
  $('stockSummary').textContent=APP_TEXT.common.loading;
  $('stockList').innerHTML='';
  apiGet('stockByProduct')
    .then(res=>{
      if(!res||!res.ok){ $('stockSummary').textContent=(res&&res.error)||APP_TEXT.common.loadFail; return; }
      stockData=res.rows||[];
      renderStock(res);
    })
    .catch(e=>{ $('stockSummary').textContent=tf(APP_TEXT.common.errorTpl,{msg:e.message}); });
}

function renderStock(res){
  $('stockSummary').innerHTML=tf(APP_TEXT.stock.summaryTpl,{total:res.total, kinds:stockData.length});
  if(!stockData.length){ $('stockList').innerHTML=`<div class="empty">${APP_TEXT.stock.empty}</div>`; return; }
  $('stockList').innerHTML=stockData.map(r=>{
    const nm=String(r.name||'');
    // [T-020] pid เข้า onclick (string ใน JS) → sanitize เหลือ [\w-] (HTML-escape อย่างเดียวไม่พอ เพราะ browser ถอด entity ก่อน parse JS)
    const pid=String(r.product_id||'').replace(/[^\w-]/g,'');
    return `<div class="item stock-row ${r.in_stock<=0?'zero':''}" data-name="${esc(nm.toLowerCase())}">
      <div class="top" onclick="toggleStockLots('${pid}')" role="button" tabindex="0" aria-expanded="false" aria-controls="lots-${pid}">
        <div><div class="name">${esc(nm)}</div><div class="meta">${esc(r.product_id)}</div></div>
        <div class="stock-qty"><b>${r.in_stock}</b> <span class="muted">${APP_TEXT.stock.unit}</span> <span class="chev" aria-hidden="true">▾</span></div>
      </div>
      <div class="lot-detail hidden" id="lots-${pid}"></div>
    </div>`;
  }).join('');
}

// กดที่ชนิด → ขยาย/ยุบ + โหลดรายล็อต (lazy, โหลดครั้งเดียว)
function toggleStockLots(pid){
  const box=$('lots-'+pid);
  const row=box.closest('.stock-row');
  const toggle=row.querySelector('.top');  // [T-025]
  if(!box.classList.contains('hidden')){
    box.classList.add('hidden'); row.classList.remove('open');
    if(toggle) toggle.setAttribute('aria-expanded','false');  // [T-025]
    return;
  }
  row.classList.add('open'); box.classList.remove('hidden');
  if(toggle) toggle.setAttribute('aria-expanded','true');  // [T-025]
  if(box.dataset.loaded){ return; }
  box.innerHTML=`<div class="muted" style="padding:6px 0">${APP_TEXT.stock.lotsLoading}</div>`;
  apiGet('stockByLot',{product_id:pid})
    .then(res=>{
      if(!res||!res.ok){ box.innerHTML=`<div class="muted">${APP_TEXT.stock.lotsLoadFail}</div>`; return; }
      box.dataset.loaded='1';
      box.innerHTML=renderLots(res.lots, res.warn_days);
    })
    .catch(e=>{ box.innerHTML=`<div class="muted">${tf(APP_TEXT.common.errorTpl,{msg:esc(e.message)})}</div>`; });
}

// days_left คำนวณฝั่ง client (UTC midnight กัน timezone — เหมือน backend SCHEMA §4.6)
function stockDaysLeft(ymd){
  if(!ymd) return null;
  const t=Date.parse(String(ymd)+'T00:00:00Z'); if(isNaN(t)) return null;
  const d=new Date(); const todayUTC=Date.UTC(d.getFullYear(),d.getMonth(),d.getDate());
  return Math.round((t-todayUTC)/86400000);
}

function renderLots(lots, warnDays){
  if(!lots||!lots.length) return `<div class="muted" style="padding:6px 0">${APP_TEXT.stock.noLots}</div>`;
  // [T-022] เกณฑ์เตือนมาจาก backend (Config.expiry_warn_days) จุดเดียวกับหน้าหมดอายุ
  // fallback 60 เฉพาะช่วง backend ยังเป็น version เก่าที่ไม่ส่ง warn_days
  const warn=(warnDays!=null&&warnDays!=='')?Number(warnDays):60;
  return `<div class="lot-head">${APP_TEXT.stock.lotsHead}</div>`+lots.map(l=>{
    const dl=stockDaysLeft(l.expiry_date);
    let tag='';
    if(dl!=null){
      if(dl<0)        tag=`<span class="badge expired">${tf(APP_TEXT.badge.expiredTpl,{n:Math.abs(dl)})}</span>`;
      else if(dl<=warn) tag=`<span class="badge warn">${tf(APP_TEXT.badge.warnTpl,{n:dl})}</span>`;
      else            tag=`<span class="muted">${tf(APP_TEXT.badge.leftTpl,{n:dl})}</span>`;
    }
    // [T-018] lot_id เข้า onclick → sanitize เหลือ [\w-] (เหตุผลเดียวกับ pid — T-020)
    const lid=String(l.lot_id||'').replace(/[^\w-]/g,'');
    return `<div class="lot-block">
      <div class="lot-line" onclick="toggleLotUnits('${lid}')" role="button" tabindex="0"
           aria-expanded="false" aria-controls="units-${lid}">
        <div><span class="lot-no">${esc(l.lot_no||l.lot_id)}</span>
          <span class="muted">${tf(APP_TEXT.stock.lotExpiryTpl,{exp:esc(l.expiry_date||'-')})}</span></div>
        <div class="lot-right"><b>${l.in_stock}</b> <span class="muted">${APP_TEXT.stock.unit}</span> ${tag}
          <span class="chev" aria-hidden="true">▾</span></div>
      </div>
      <div class="unit-detail hidden" id="units-${lid}"></div>
    </div>`;
  }).join('');
}

/* ===== รายชิ้นในล็อต (T-018) — drill-down ชั้นที่ 3: ล็อต → Unit + สถานะ ===== */
// กดที่ล็อต → ขยาย/ยุบ + โหลดรายชิ้น (lazy โหลดครั้งเดียว — pattern เดียวกับ toggleStockLots)
function toggleLotUnits(lid){
  const box=$('units-'+lid);
  if(!box) return;
  const block=box.closest('.lot-block');
  const line=block.querySelector('.lot-line');
  if(!box.classList.contains('hidden')){
    box.classList.add('hidden'); block.classList.remove('open');
    line.setAttribute('aria-expanded','false');
    return;
  }
  box.classList.remove('hidden'); block.classList.add('open');
  line.setAttribute('aria-expanded','true');
  if(box.dataset.loaded){ return; }
  box.innerHTML=`<div class="muted" style="padding:4px 0">${APP_TEXT.stock.unitsLoading}</div>`;
  apiGet('getUnitsByLot',{lot_id:lid})
    .then(res=>{
      if(!res||!res.ok){ box.innerHTML=`<div class="muted">${APP_TEXT.stock.unitsLoadFail}</div>`; return; }
      box.dataset.loaded='1';
      box.innerHTML=renderUnits(res.units);
    })
    .catch(e=>{ box.innerHTML=`<div class="muted">${tf(APP_TEXT.common.errorTpl,{msg:esc(e.message)})}</div>`; });
}

function renderUnits(units){
  if(!units||!units.length) return `<div class="muted" style="padding:4px 0">${APP_TEXT.stock.noUnits}</div>`;
  return units.map(u=>{
    const inStock=u.status==='in_stock';
    const right=inStock
      ? `<span class="unit-ok">${APP_TEXT.stock.unitInStock}</span>`
      : `<span class="muted">${tf(APP_TEXT.stock.unitIssuedTpl,
          {user:esc(u.issued_by||'-'), date:esc((u.issued_at||'').substring(0,10)||'-')})}</span>`;
    return `<div class="unit-line ${inStock?'':'issued'}"><span class="bc">${esc(u.unit_barcode)}</span>${right}</div>`;
  }).join('');
}

// ค้นหาชนิด (กรองฝั่ง client จากที่โหลดมาแล้ว)
function filterStock(){
  const q=$('stockSearch').value.trim().toLowerCase();
  document.querySelectorAll('#stockList .stock-row').forEach(row=>{
    const nm=row.getAttribute('data-name')||'';
    row.classList.toggle('hidden', q!=='' && nm.indexOf(q)<0);
  });
}

/* ===== ใกล้หมดอายุ (FEFO — T-009) ===== */
function initExpiryTab(){
  $('expirySummary').textContent=APP_TEXT.common.loading;
  $('expiryList').innerHTML='';
  apiGet('expiringLots')
    .then(res=>{
      if(!res||!res.ok){ $('expirySummary').textContent=(res&&res.error)||APP_TEXT.common.loadFail; return; }
      renderExpiry(res);
    })
    .catch(e=>{ $('expirySummary').textContent=tf(APP_TEXT.common.errorTpl,{msg:e.message}); });
}
function renderExpiry(res){
  $('expirySummary').innerHTML=
    tf(APP_TEXT.expiry.summaryTpl,{warn:res.warn_days, expired:res.expired_count, warnCount:res.warn_count});
  if(!res.rows.length){
    $('expiryList').innerHTML=`<div class="empty">${tf(APP_TEXT.expiry.emptyTpl,{warn:res.warn_days})}</div>`;
    return;
  }
  $('expiryList').innerHTML=res.rows.map(r=>{
    const badge = r.level==='expired'
      ? `<span class="badge expired">${tf(APP_TEXT.badge.expiredTpl,{n:Math.abs(r.days_left)})}</span>`
      : `<span class="badge warn">${tf(APP_TEXT.badge.warnTpl,{n:r.days_left})}</span>`;
    return `<div class="item ${r.level}"><div class="top">
      <div><div class="name">${esc(r.product_name)}</div>
      <div class="meta">${tf(APP_TEXT.expiry.metaTpl,{lot:esc(r.lot_no||r.lot_id), exp:esc(r.expiry_date), n:r.in_stock})}</div></div>
      ${badge}</div></div>`;
  }).join('');
}

/* ===== Init ===== */
$('issueInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doIssue(); });
$('pinInput').addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
$('recvVbcInput').addEventListener('keydown', e=>{ if(e.key==='Enter') scanVendorBarcode(); });
// [T-033] ตัวอย่างฉลากสด — อัปเดตทุกครั้งที่ข้อมูลบนฉลากเปลี่ยน (ชนิด/ชื่อใหม่/วันหมดอายุ/จำนวน)
['recvProductSel','recvExpiry','recvQty','newProductName'].forEach(id=>{
  $(id).addEventListener('input', renderLabelSample);
  $(id).addEventListener('change', renderLabelSample);
});

document.addEventListener('DOMContentLoaded', ()=>{
  applyAppText();

  // [T-024] เช็กตอนเปิดแอปว่า lib ภายนอกจาก CDN โหลดครบหรือไม่
  if(typeof Html5Qrcode==='undefined' || typeof JsBarcode==='undefined' || typeof qrcode==='undefined'){
    const banner=document.createElement('div');
    banner.textContent='⚠️ เน็ตมีปัญหา ฟีเจอร์กล้อง/พิมพ์ใช้ไม่ได้ (Library โหลดไม่ครบ)';
    banner.style.cssText='background:var(--dan);color:#fff;padding:10px;text-align:center;font-size:13px;font-weight:bold;z-index:9999;position:relative;';
    document.body.prepend(banner);
  }

  if(initLabelPreview()) return;   // โหมดพรีวิวฉลาก (?labelpreview=...) — ข้าม login/loadUsers
  const saved=loadSession();
  // [T-014] session ต้องมี token (ของเก่าก่อน T-014 ไม่มี → ให้ login ใหม่ครั้งเดียว)
  // เข้าแอปทันทีแบบ optimistic แล้วเช็ค token เงียบๆ เบื้องหลัง — ไม่ถ่วงการยิงสต๊อก
  // ถ้าตายจริง apiPost จะ forceRelogin เอง
  if(saved && saved.token){
    CURRENT=saved; enterApp();
    apiPost({action:'checkToken'}).catch(()=>{});
  } else if(saved){ clearSession(); }
  loadUsers();
});
