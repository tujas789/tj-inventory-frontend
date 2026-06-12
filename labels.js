/* labels.js — เทมเพลตฉลาก thermal 50×25mm (single source — T-033)
   ใช้ร่วม 2 หน้า: index.html (รับเข้า+ตัวอย่างฉลาก) และ print-history.html (ปริ้นซ้ำ)
   ⚠️ ลำดับโหลด: app-text.js → api.js → labels.js → (สคริปต์หน้า)
   ต้องมี lib: JsBarcode + qrcode-generator (โหลดจาก CDN ใน <head> ของแต่ละหน้า)

   เลย์เอาต์ (เจ้าของเคาะ 2026-06-12 ผ่าน mockup):
     แถวบน  = [ QR 14mm | ชื่อ 2 บรรทัด + (กรอบ "รับ DD/MM/YY" + ลำดับกล่อง n/N) ]
     แถวกลาง = Code128 เต็มกว้าง (แท่งอ้วน — ADR-0003)
     แถวล่าง = EXP DD/MM/YY (ซ้าย ไร้กรอบ) + เลข barcode (ขวา)
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
  '.label{width:50mm;height:24mm;padding:0.7mm 1.2mm;display:flex;flex-direction:column;',
    'overflow:hidden;color:#000;background:#fff;',
    'font-family:"IBM Plex Sans Thai","IBM Plex Sans","Segoe UI",Tahoma,sans-serif;}',
  '.label+.label{page-break-before:always;}',
  '.lb-head{display:flex;gap:1.3mm;flex:1;min-height:0;align-items:center;}',
  '.lb-qr{flex:0 0 14mm;width:14mm;height:14mm;}',
  '.lb-qr svg{width:100%;height:100%;display:block;}',
  '.lb-info{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:1mm;}',
  '.lb-name{font-size:8pt;font-weight:700;line-height:1.12;display:-webkit-box;',
    '-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}',
  // [T-033] กรอบ = วันที่รับ + ลำดับกล่อง n/N ข้างกรอบ
  '.lb-dates{display:flex;align-items:center;gap:1.2mm;}',
  '.lb-recv{font-size:7pt;font-weight:700;line-height:1;white-space:nowrap;',
    'border:0.3mm solid #000;border-radius:1mm;padding:0.5mm 1mm;}',
  '.lb-seq{font-size:8pt;font-weight:700;line-height:1;white-space:nowrap;}',
  '.lb-bc{width:100%;height:5mm;}',
  '.lb-bc svg{width:100%;height:100%;display:block;}',
  // [T-033] แถวล่าง: EXP ซ้าย (ไร้กรอบ) + เลข barcode ขวา
  '.lb-foot{display:flex;justify-content:space-between;align-items:baseline;margin-top:0.6mm;}',
  '.lb-exp{font-size:7pt;font-weight:700;line-height:1;white-space:nowrap;}',
  '.lb-code{font-family:"IBM Plex Mono","Courier New",monospace;font-size:7.5pt;font-weight:700;',
    'letter-spacing:1.5px;white-space:nowrap;line-height:1;}'
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

// สร้าง .label หนึ่งใบ — item = {name, recv, seq, exp, code}
function buildLabelItem(item){
  // Code128 — เต็มความกว้าง แท่งอ้วน ; margin 20 (=10 โมดูล) = quiet zone ครบสเปก
  // preserveAspectRatio=none → ยืดเต็ม 100% × ความสูงคงที่ (ไม่ letterbox จนแท่งแคบ)
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  JsBarcode(svg, item.code, {format:'CODE128', displayValue:false, margin:20, height:60, width:2});
  // ⚠️ getAttribute คืน "404px" (มี px) → parseFloat ก่อน ไม่งั้น viewBox ผิดสเปก
  const bw=parseFloat(svg.getAttribute('width')), bh=parseFloat(svg.getAttribute('height'));
  svg.setAttribute('viewBox','0 0 '+bw+' '+bh);
  svg.setAttribute('preserveAspectRatio','none');
  svg.removeAttribute('width'); svg.removeAttribute('height');
  const bcHtml=new XMLSerializer().serializeToString(svg);
  // QR — ค่าเดียวกับ Code128 ; ECC=H + quiet zone 4 โมดูล (iPhone อ่านชัวร์ — T-015)
  let qrHtml='';
  if(typeof qrcode!=='undefined'){
    const qr=qrcode(0,'H'); qr.addData(item.code); qr.make();
    qrHtml=qr.createSvgTag({scalable:true, margin:4});
  }
  return '<div class="label">'+
      '<div class="lb-head">'+
        '<div class="lb-qr">'+qrHtml+'</div>'+
        '<div class="lb-info">'+
          '<div class="lb-name">'+esc(item.name)+'</div>'+
          ((item.recv||item.seq)?
            '<div class="lb-dates">'+
              (item.recv?'<div class="lb-recv">'+esc(item.recv)+'</div>':'')+
              (item.seq?'<div class="lb-seq">'+esc(item.seq)+'</div>':'')+
            '</div>':'')+
        '</div>'+
      '</div>'+
      '<div class="lb-bc">'+bcHtml+'</div>'+
      '<div class="lb-foot">'+
        '<div class="lb-exp">'+esc(item.exp||'')+'</div>'+
        '<div class="lb-code">'+esc(item.code)+'</div>'+
      '</div>'+
    '</div>';
}
function buildLabelBody(items){ return items.map(buildLabelItem).join(''); }
function buildLabelDoc(items){
  return '<!doctype html><html><head><meta charset="utf-8"><title>labels</title>'+
    '<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;700&family=IBM+Plex+Sans+Thai:wght@400;700&family=IBM+Plex+Mono:wght@700&display=swap" rel="stylesheet">'+
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
