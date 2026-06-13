/* labels.js — เทมเพลตฉลาก thermal 50×25mm (single source — T-033)
   ใช้ร่วม 2 หน้า: index.html (รับเข้า+ตัวอย่างฉลาก) และ print-history.html (ปริ้นซ้ำ)
   ⚠️ ลำดับโหลด: app-text.js → api.js → labels.js → (สคริปต์หน้า)
   ต้องมี lib: JsBarcode + qrcode-generator (โหลดจาก CDN ใน <head> ของแต่ละหน้า)

   เลย์เอาต์ "แบบ C" 2 คอลัมน์ (spec: frontend/design_handoff_barcode_label/README.md):
     ซ้าย (12mm) = QR 12×12mm + ลำดับกล่อง n/N ใต้ QR
     เส้นคั่นแนวตั้ง 0.2mm
     ขวา (flex:1) = ชื่อ → รับ DD/MM/YY → Code128 เต็มกว้าง (แท่งอ้วน — ADR-0003) → EXP + เลข barcode
*/

/** แปลง 'YYYY-MM-DD' → 'DD/MM/YY' สำหรับโชว์บนฉลาก */
function fmtExpiry(d){
  const p=String(d||'').split('-');
  if(p.length!==3) return d||'';
  return p[2]+'/'+p[1]+'/'+p[0].slice(2);
}
/** วันที่วันนี้ตามเครื่อง 'YYYY-MM-DD' — fallback ของ received_at (T-031) */
function todayLocalIso(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

/* [T-015] label 24mm < หน้า 25mm = เผื่อ slack 1mm กัน rounding ดันหน้าว่าง (บทเรียน JOURNAL bug #2)
   ⚠️ พื้นที่ 50mm ตึง — ขนาด/gap วัดผ่าน ?labelpreview + getBoundingClientRect ก่อนแก้เสมอ */
const LABEL_CSS=[
  '@page{size:50mm 25mm;margin:0;}',
  '*{margin:0;padding:0;box-sizing:border-box;}',
  'html,body{background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;}',
  '.label{width:50mm;height:24mm;padding:1.1mm 1.4mm;display:flex;gap:1.6mm;',
    'overflow:hidden;color:#000;background:#fff;',
    'font-family:"IBM Plex Sans Thai","IBM Plex Sans","Segoe UI",Tahoma,sans-serif;}',
  '.label+.label{page-break-before:always;}',
  // คอลัมน์ซ้าย: QR + ลำดับ
  '.lb-left{flex:0 0 12mm;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.8mm;}',
  '.lb-qr{width:12mm;height:12mm;}',
  '.lb-qr svg{width:100%;height:100%;display:block;}',
  '.lb-seq{font-size:7pt;font-weight:700;line-height:1;white-space:nowrap;}',
  // เส้นคั่น
  '.lb-div{border-left:0.2mm solid #000;align-self:stretch;}',
  // คอลัมน์ขวา
  '.lb-right{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:0.9mm;}',
  '.lb-name{font-size:8pt;font-weight:700;line-height:1.15;}',
  '.lb-recv{font-size:6.5pt;font-weight:600;line-height:1;white-space:nowrap;}',
  // Code128
  '.lb-bc{width:100%;height:5.5mm;}',
  '.lb-bc svg{width:100%;height:100%;display:block;}',
  // แถวล่าง
  '.lb-foot{display:flex;justify-content:space-between;align-items:baseline;gap:1.2mm;}',
  '.lb-exp{font-size:6.5pt;font-weight:700;line-height:1;white-space:nowrap;}',
  '.lb-code{font-family:"IBM Plex Mono","Courier New",monospace;font-size:6.5pt;font-weight:700;',
    'letter-spacing:1px;white-space:nowrap;line-height:1;}'
].join('');

/** แปลงข้อมูล 1 ชุดรับเข้า → รายการฉลาก (จุดเดียว ใช้ทั้งรับเข้า/ปริ้นซ้ำ/ตัวอย่าง)
 *  src = {product_name, expiry(YYYY-MM-DD), received(YYYY-MM-DD), unit_barcodes[]}
 *  → item = {name, recv "รับ 12/06/26", seq "1/4", exp "EXP 14/03/28", code} */
function buildLabelItems(src){
  const expTxt  = src.expiry   ? ('EXP '+fmtExpiry(src.expiry))  : '';
  const recvTxt = src.received ? ('รับ '+fmtExpiry(src.received)) : '';
  const total   = src.unit_barcodes.length;
  return src.unit_barcodes.map((code,i)=>({
    name: src.product_name||'', recv: recvTxt, seq: (i+1)+'/'+total, exp: expTxt, code
  }));
}

function buildLabelItem(item){
  // Code128
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  JsBarcode(svg, item.code, {format:'CODE128', displayValue:false, margin:20, height:60, width:2});
  const bw=parseFloat(svg.getAttribute('width')), bh=parseFloat(svg.getAttribute('height'));
  svg.setAttribute('viewBox','0 0 '+bw+' '+bh);
  svg.setAttribute('preserveAspectRatio','none');
  svg.removeAttribute('width'); svg.removeAttribute('height');
  // ⚠️ restore style หลัง JsBarcode ล้าง
  svg.style.width='100%'; svg.style.height='100%'; svg.style.display='block';
  const bcHtml=new XMLSerializer().serializeToString(svg);

  // QR
  let qrHtml='';
  if(typeof qrcode!=='undefined'){
    const qr=qrcode(0,'H'); qr.addData(item.code); qr.make();
    qrHtml=qr.createSvgTag({scalable:true, margin:3});
  }

  return '<div class="label">'+
    // คอลัมน์ซ้าย
    '<div class="lb-left">'+
      '<div class="lb-qr">'+qrHtml+'</div>'+
      (item.seq?'<div class="lb-seq">'+esc(item.seq)+'</div>':'')+
    '</div>'+
    // เส้นคั่น
    '<div class="lb-div"></div>'+
    // คอลัมน์ขวา
    '<div class="lb-right">'+
      '<div class="lb-name">'+esc(item.name)+'</div>'+
      (item.recv?'<div class="lb-recv">'+esc(item.recv)+'</div>':'')+
      '<div class="lb-bc">'+bcHtml+'</div>'+
      '<div class="lb-foot">'+
        '<div class="lb-exp">'+esc(item.exp||'')+'</div>'+
        '<div class="lb-code">'+esc(item.code)+'</div>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function buildLabelBody(items){ return items.map(buildLabelItem).join(''); }
function buildLabelDoc(items){
  return '<!doctype html><html><head><meta charset="utf-8"><title>labels</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=IBM+Plex+Mono:wght@600;700&display=swap" rel="stylesheet">'+
    '<style>'+LABEL_CSS+'</style></head><body>'+buildLabelBody(items)+'</body></html>';
}

// core พิมพ์ — รับ items ที่ประกอบแล้ว (เรียกได้จากทุกหน้า — ต้องมี toast() ในหน้านั้น)
function printLabelItems(items){
  if(!items||!items.length){ toast(APP_TEXT.print.noLabels,false); return; }
  if(typeof JsBarcode==='undefined'){ toast(APP_TEXT.print.libMissing,false); return; }
  // ── พิมพ์ผ่าน hidden iframe แล้วสั่ง frame.contentWindow.print() ────────────
  // สั่ง print() บน iframe ที่เราคุมเอง → @page ของ iframe ถูกใช้จริง (ไม่หมุน 90°)
  const doc = buildLabelDoc(items);
  let frame=document.getElementById('labelPrintFrame');
  if(!frame){
    frame=document.createElement('iframe');
    frame.id='labelPrintFrame';
    frame.setAttribute('aria-hidden','true');
    frame.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
    document.body.appendChild(frame);
  }
  const fdoc=frame.contentWindow.document;
  fdoc.open(); fdoc.write(doc); fdoc.close();
  // [T-025] รอฟอนต์โหลดเสร็จจริงก่อนสั่งพิมพ์ (แทน setTimeout มั่วๆ ที่อาจสั้นไปบนเน็ตช้า)
  const fDoc = frame.contentWindow.document;
  (fDoc.fonts && fDoc.fonts.ready ? fDoc.fonts.ready : Promise.resolve())
    .then(function(){
      try{ frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch(e){ toast(tf(APP_TEXT.print.failTpl,{msg:e.message}),false); }
    })
    .catch(function(){
      // fallback กรณี fonts.ready reject (เช่น iOS Safari เก่า)
      try{ frame.contentWindow.focus(); frame.contentWindow.print(); }
      catch(e){ toast(tf(APP_TEXT.print.failTpl,{msg:e.message}),false); }
    });
}
