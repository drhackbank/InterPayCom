/* ═══════════════════════════════════════════════════════════════
   InterPayCom — script.js v2.0.0
   GitHub Pages frontend → Vercel API backend
   IMPORTANT: Set API_URL below to your Vercel deployment URL
═══════════════════════════════════════════════════════════════ */
'use strict';

/* ── CONFIG — Change this after Vercel deploy ─────────────────
   Replace with your actual Vercel API URL
   Example: 'https://interpaycom-api.vercel.app'               */
const API_URL = 'https://interpaycom-api.vercel.app';

/* ── Secure auth hashes ────────────────────────────────────── */
const _IH = 'fc5669b52ce4e283ad1d5d182de88ff9faec6672bace84ac2ce4c083f54fe2bc';
const _PH = '7419efbb48f3629e027dbf9aa78d11fa28a0c1150817f6fa7c92b9c3c635bfed';

async function _sha(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* ── State ─────────────────────────────────────────────────── */
let currencies=[], selCurr={code:'USD',symbol:'$',flag:'🇺🇸',rate:1,name:'US Dollar'};
let curAmount=0, activeTab='paypal', _payInit=false, _ppLoaded=false, _btInst=null;
let _tries=0, _lockUntil=0;
const g = id => document.getElementById(id);

/* ═══════════════════════════════════════════════════════════════
   AUTH
═══════════════════════════════════════════════════════════════ */
function _locked() {
  if (_lockUntil > Date.now()) {
    const s=Math.ceil((_lockUntil-Date.now())/1000);
    showLErr(`<i class="ti ti-clock" aria-hidden="true"></i> Too many attempts. Try again in ${s}s`);
    return true;
  }
  return false;
}
async function doLogin() {
  if (_locked()) return;
  const idv=(g('lid')?.value||'').trim(), pw=g('lpw')?.value||'';
  const spin=g('lf-spin'),icon=g('lf-icon'),txt=g('lf-btntxt'),btn=g('lf-btn');
  clearLErr(); spin.classList.add('on'); icon.style.display='none'; txt.textContent='Signing in…'; btn.disabled=true;
  const [ih,ph]=await Promise.all([_sha(idv),_sha(pw)]);
  setTimeout(()=>{
    spin.classList.remove('on'); icon.style.display=''; txt.textContent='Sign In to Gateway'; btn.disabled=false;
    if(ih===_IH&&ph===_PH){
      _tries=0; sessionStorage.setItem('ipc_ok','1');
      g('scr-login').classList.remove('active');
      g('scr-main').classList.add('active');
      initApp();
    } else {
      _tries++; if(_tries>=3){_lockUntil=Date.now()+30000;_tries=0;}
      showLErr('<i class="ti ti-alert-triangle" aria-hidden="true"></i> Invalid login ID or password.');
      ['lid','lpw'].forEach(id=>g(id)?.classList.add('err'));
    }
  },1500);
}
function doLogout(){
  sessionStorage.removeItem('ipc_ok');
  g('scr-main').classList.remove('active'); g('scr-login').classList.add('active');
  ['lid','lpw'].forEach(id=>{if(g(id)){g(id).value='';g(id).classList.remove('err');}});
  clearLErr(); _payInit=false; _ppLoaded=false;
}
function togglePw(){const i=g('lpw'),ic=g('pw-eye');const h=i.type==='password';i.type=h?'text':'password';ic.className=h?'ti ti-eye-off':'ti ti-eye';}
function showLErr(html){const e=g('lf-err');e.innerHTML=html;e.classList.add('show');}
function clearLErr(){const e=g('lf-err');e?.classList.remove('show');['lid','lpw'].forEach(id=>g(id)?.classList.remove('err'));}

/* ═══════════════════════════════════════════════════════════════
   CURRENCIES
═══════════════════════════════════════════════════════════════ */
const FALLBACK_CURRENCIES=[
  {code:'USD',name:'US Dollar',symbol:'$',flag:'🇺🇸',rate:1,popular:true},
  {code:'EUR',name:'Euro',symbol:'€',flag:'🇪🇺',rate:0.92,popular:true},
  {code:'GBP',name:'British Pound',symbol:'£',flag:'🇬🇧',rate:0.79,popular:true},
  {code:'INR',name:'Indian Rupee',symbol:'₹',flag:'🇮🇳',rate:83.5,popular:true},
  {code:'AUD',name:'Australian Dollar',symbol:'A$',flag:'🇦🇺',rate:1.53,popular:true},
  {code:'CAD',name:'Canadian Dollar',symbol:'C$',flag:'🇨🇦',rate:1.36,popular:true},
  {code:'SGD',name:'Singapore Dollar',symbol:'S$',flag:'🇸🇬',rate:1.34,popular:true},
  {code:'AED',name:'UAE Dirham',symbol:'AED',flag:'🇦🇪',rate:3.67,popular:true},
  {code:'JPY',name:'Japanese Yen',symbol:'¥',flag:'🇯🇵',rate:149.5,popular:true},
  {code:'CHF',name:'Swiss Franc',symbol:'CHF',flag:'🇨🇭',rate:0.89,popular:true},
  {code:'SAR',name:'Saudi Riyal',symbol:'SAR',flag:'🇸🇦',rate:3.75,popular:false},
  {code:'KWD',name:'Kuwaiti Dinar',symbol:'KD',flag:'🇰🇼',rate:0.308,popular:false},
  {code:'MYR',name:'Malaysian Ringgit',symbol:'RM',flag:'🇲🇾',rate:4.72,popular:false},
  {code:'BRL',name:'Brazilian Real',symbol:'R$',flag:'🇧🇷',rate:5.0,popular:false},
  {code:'ZAR',name:'South African Rand',symbol:'R',flag:'🇿🇦',rate:18.6,popular:false},
  {code:'PKR',name:'Pakistani Rupee',symbol:'₨',flag:'🇵🇰',rate:279,popular:false},
  {code:'NGN',name:'Nigerian Naira',symbol:'₦',flag:'🇳🇬',rate:1580,popular:false},
  {code:'KES',name:'Kenyan Shilling',symbol:'KSh',flag:'🇰🇪',rate:129,popular:false},
  {code:'IDR',name:'Indonesian Rupiah',symbol:'Rp',flag:'🇮🇩',rate:15650,popular:false},
  {code:'PHP',name:'Philippine Peso',symbol:'₱',flag:'🇵🇭',rate:56.1,popular:false},
  {code:'VND',name:'Vietnamese Dong',symbol:'₫',flag:'🇻🇳',rate:24300,popular:false},
  {code:'KRW',name:'South Korean Won',symbol:'₩',flag:'🇰🇷',rate:1330,popular:false},
  {code:'TRY',name:'Turkish Lira',symbol:'₺',flag:'🇹🇷',rate:30.7,popular:false},
  {code:'PLN',name:'Polish Zloty',symbol:'zł',flag:'🇵🇱',rate:4.01,popular:false},
  {code:'SEK',name:'Swedish Krona',symbol:'kr',flag:'🇸🇪',rate:10.4,popular:false},
  {code:'NOK',name:'Norwegian Krone',symbol:'kr',flag:'🇳🇴',rate:10.6,popular:false},
  {code:'MXN',name:'Mexican Peso',symbol:'$',flag:'🇲🇽',rate:17.1,popular:false},
  {code:'EGP',name:'Egyptian Pound',symbol:'EGP',flag:'🇪🇬',rate:30.9,popular:false},
  {code:'BDT',name:'Bangladeshi Taka',symbol:'৳',flag:'🇧🇩',rate:110,popular:false},
  {code:'GHS',name:'Ghanaian Cedi',symbol:'₵',flag:'🇬🇭',rate:12.3,popular:false},
];

async function loadRates() {
  try {
    const r=await fetch(`${API_URL}/rates`);
    const d=await r.json();
    if(d.currencies) currencies=d.currencies;
    else currencies=FALLBACK_CURRENCIES;
  } catch { currencies=FALLBACK_CURRENCIES; }
}

function renderList(filter='') {
  const el=g('curr-list'),low=filter.toLowerCase();
  const pop=currencies.filter(c=>c.popular&&(!low||c.code.toLowerCase().includes(low)||c.name.toLowerCase().includes(low)));
  const oth=currencies.filter(c=>!c.popular&&(!low||c.code.toLowerCase().includes(low)||c.name.toLowerCase().includes(low)));
  let html=pop.map(ci).join('');
  if(oth.length&&!low) html+='<div class="curr-sep"></div><div class="curr-section-lbl">All currencies</div>';
  html+=oth.map(ci).join('');
  el.innerHTML=html||'<div style="padding:16px;text-align:center;font-size:12px;color:var(--t4)">No results</div>';
}
function ci(c){const s=c.code===selCurr.code?'sel':'';const r=c.rate?`1 USD = ${c.rate<1?c.rate.toFixed(3):c.rate>999?Math.round(c.rate):c.rate.toFixed(2)} ${c.code}`:'';
  return `<div class="curr-item ${s}" onclick="pickCurr('${c.code}')"><span class="ci-flag">${c.flag}</span><div class="ci-info"><div class="ci-code">${c.code}</div><div class="ci-name">${c.name}</div></div><div class="ci-rate">${r}</div></div>`;}
function openCurr(){g('curr-btn').classList.add('open');g('curr-dd').classList.add('open');g('curr-chev').style.transform='rotate(180deg)';setTimeout(()=>g('curr-search')?.focus(),40);}
function closeCurr(){g('curr-btn')?.classList.remove('open');g('curr-dd')?.classList.remove('open');if(g('curr-chev'))g('curr-chev').style.transform='';}
function filterCurr(v){renderList(v);}
function pickCurr(code){
  const c=currencies.find(x=>x.code===code);if(!c)return;
  selCurr=c; g('curr-flag').textContent=c.flag; g('curr-code').textContent=c.code; g('amt-sym').textContent=c.symbol;
  renderList(g('curr-search')?.value||''); closeCurr(); updateQuickBtns(); onAmountChange(); updateSummary();
  if(activeTab==='paypal') reloadPayPal();
}

/* ═══════════════════════════════════════════════════════════════
   AMOUNT
═══════════════════════════════════════════════════════════════ */
function onAmountChange(){
  const v=parseFloat(g('amt-input')?.value)||0; curAmount=v;
  const inrEl=g('inr-equiv');
  if(v>0&&selCurr.code!=='INR'){
    const ir=(currencies.find(x=>x.code==='INR')?.rate||83.5);
    inrEl.textContent=`≈ ₹${((v/selCurr.rate)*ir).toLocaleString('en-IN',{maximumFractionDigits:2})} INR`;
  } else inrEl.textContent='';
  updateSummary();
}
function updateSummary(){
  const a=curAmount,c=selCurr;
  g('os-amount').textContent=a>0?`${c.symbol}${a.toFixed(2)}`:'—';
  g('os-curr').textContent=`${c.code} — ${c.name}`;
  g('os-total').textContent=a>0?`${c.symbol}${a.toFixed(2)} ${c.code}`:'—';
}
function setQuick(usd){const v=parseFloat((usd*selCurr.rate).toFixed(2));g('amt-input').value=v;curAmount=v;onAmountChange();}
function updateQuickBtns(){
  const base=[50,100,250,500,1000];
  document.querySelectorAll('.qbtn').forEach((btn,i)=>{
    const v=base[i]*selCurr.rate;const d=v>=1000?Math.round(v).toLocaleString():v.toFixed(v<1?2:0);
    btn.textContent=`${selCurr.symbol}${d}`;btn.onclick=()=>setQuick(base[i]);
  });
}

/* ═══════════════════════════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════════════════════════ */
function validate(){
  const amt=parseFloat(g('amt-input')?.value||0);
  const email=(g('payer-email')?.value||'').trim();
  if(!amt||amt<=0){showMsg('err','Please enter a valid payment amount.');return false;}
  if(amt<1){showMsg('err',`Minimum amount is 1 ${selCurr.code}.`);return false;}
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){showMsg('err','Please enter a valid email address.');return false;}
  return true;
}

/* ═══════════════════════════════════════════════════════════════
   PAYPAL — REAL CHARGING via Vercel API
═══════════════════════════════════════════════════════════════ */
function loadPayPalSDK(cb){
  if(_ppLoaded&&window.paypal){cb?.();return;}
  const old=document.getElementById('pp-sdk');if(old)old.remove();
  // We need PayPal client ID — fetch it from our API
  fetch(`${API_URL}/paypal/order`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({_ping:true,amount:0.01,currency:'USD'})
  })
  .then(r=>r.json())
  .then(d=>{
    if(d.clientId) injectPPSDK(d.clientId,cb);
    else if(d.orderId) {
      // API working — get client ID from PayPal order meta or use env-derived value
      // For GitHub Pages we need to inject client ID somehow
      // Use a public meta tag in index.html if set, otherwise show config message
      const metaClientId=document.querySelector('meta[name="paypal-client-id"]')?.content;
      if(metaClientId&&!metaClientId.includes('YOUR_')){ injectPPSDK(metaClientId,cb); }
      else { g('pp-loading').innerHTML='<span style="color:var(--warn);font-size:12px;text-align:center;line-height:1.6;">Add PayPal Client ID to index.html meta tag.<br/><small>See README → Step 3</small></span>'; }
    }
  })
  .catch(()=>{
    g('pp-loading').innerHTML='<span style="color:var(--err);font-size:12px;text-align:center;line-height:1.6;">Cannot connect to payment server.<br/><small>Set API_URL in script.js</small></span>';
  });
}
function injectPPSDK(clientId,cb){
  const s=document.createElement('script');s.id='pp-sdk';
  s.src=`https://www.paypal.com/sdk/js?client-id=${clientId}&currency=${selCurr.code}&intent=capture&components=buttons`;
  s.onload=()=>{_ppLoaded=true;cb?.();};
  s.onerror=()=>{g('pp-loading').innerHTML='<span style="color:var(--err);font-size:12px">PayPal failed to load.</span>';};
  document.head.appendChild(s);
}
function reloadPayPal(){_ppLoaded=false;const old=document.getElementById('pp-sdk');if(old)old.remove();if(g('pp-loading'))g('pp-loading').style.display='flex';if(g('pp-buttons'))g('pp-buttons').innerHTML='';if(activeTab==='paypal')loadPayPalSDK(renderPayPalButtons);}

function renderPayPalButtons(){
  g('pp-loading').style.display='none';if(!window.paypal)return;
  g('pp-buttons').innerHTML='';
  window.paypal.Buttons({
    style:{layout:'vertical',color:'gold',shape:'rect',label:'pay',height:46},
    createOrder:async()=>{
      clearMsg();if(!validate()) throw new Error('Validation failed');
      showMsg('info','Creating payment order…');
      const r=await fetch(`${API_URL}/paypal/order`,{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          amount:     parseFloat(g('amt-input').value).toFixed(2),
          currency:   selCurr.code,
          description:g('payer-desc')?.value||'Payment to InterPayCom',
          customerEmail:g('payer-email')?.value?.trim()||undefined,
          customerName: g('payer-name')?.value?.trim()||undefined,
        })});
      const d=await r.json();
      if(!r.ok||d.error) throw new Error(d.error||'Order creation failed');
      clearMsg(); return d.orderId;
    },
    onApprove:async(data)=>{
      showMsg('info','Capturing payment…');
      try{
        const r=await fetch(`${API_URL}/paypal/capture`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:data.orderID})});
        const result=await r.json();
        if(!r.ok||result.error) throw new Error(result.error||'Capture failed');
        showSuccess(result,'PayPal');
      }catch(e){showMsg('err',e.message||'Payment capture failed.');}
    },
    onError:(err)=>{console.error('[PP]',err);showMsg('err','PayPal error. Please try again.');},
    onCancel:()=>{showMsg('warn','Payment cancelled. You can try again.');},
  }).render('#pp-buttons');
}

/* ═══════════════════════════════════════════════════════════════
   BRAINTREE — REAL CHARGING via Vercel API
═══════════════════════════════════════════════════════════════ */
async function loadBraintree(){
  if(!window.braintree){g('dropin-container').innerHTML='<div style="padding:14px;font-size:12px;color:var(--t3)">Loading…</div>';return;}
  try{
    const r=await fetch(`${API_URL}/braintree/token`);
    const d=await r.json();
    if(!r.ok||!d.clientToken) throw new Error(d.error||'No token');
    if(_btInst){try{await _btInst.teardown();}catch{}_btInst=null;}
    _btInst=await braintree.dropin.create({
      authorization:d.clientToken,
      container:'#dropin-container',
      paypal:{flow:'checkout',amount:(curAmount||1).toFixed(2),currency:selCurr.code},
    });
  }catch(err){
    console.warn('[BT]',err.message);
    g('dropin-container').innerHTML=`<div style="padding:14px;font-size:12px;color:var(--err)">Card payment unavailable: ${err.message}</div>`;
  }
}

async function submitBraintree(){
  if(!validate())return;
  if(!_btInst){showMsg('err','Payment form not ready.');return;}
  const btn=g('pay-btn-bt'),spin=g('pay-spin'),txt=g('paybtn-txt');
  btn.disabled=true;spin.style.display='inline-block';txt.textContent='Processing…';clearMsg();
  try{
    const {nonce}=await _btInst.requestPaymentMethod();
    showMsg('info','Charging payment…');
    const r=await fetch(`${API_URL}/braintree/pay`,{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        nonce,
        amount:        parseFloat(g('amt-input').value).toFixed(2),
        currency:      selCurr.code,
        description:   g('payer-desc')?.value||'Payment to InterPayCom',
        customerEmail: g('payer-email')?.value?.trim()||undefined,
        customerName:  g('payer-name')?.value?.trim()||undefined,
      })});
    const result=await r.json();
    if(!r.ok||result.error) throw new Error(result.error||'Payment declined');
    showSuccess(result,'Braintree');
  }catch(e){showMsg('err',e.message||'Payment failed. Please try again.');}
  finally{btn.disabled=false;spin.style.display='none';txt.textContent='Pay Now';}
}

/* ═══════════════════════════════════════════════════════════════
   METHOD SWITCH
═══════════════════════════════════════════════════════════════ */
function switchMethod(m){
  activeTab=m;
  g('mtab-pp').classList.toggle('on',m==='paypal');
  g('mtab-bt').classList.toggle('on',m==='card');
  g('pp-container').classList.toggle('hidden',m!=='paypal');
  g('bt-container').classList.toggle('hidden',m!=='card');
  clearMsg();
  if(m==='paypal'&&!_ppLoaded)loadPayPalSDK(renderPayPalButtons);
  if(m==='card')loadBraintree();
}

/* ═══════════════════════════════════════════════════════════════
   SUCCESS
═══════════════════════════════════════════════════════════════ */
function showSuccess(r,method){
  g('pay-card').classList.add('hidden');g('success-card').classList.remove('hidden');
  g('success-details').innerHTML=[
    ['Status',         '✅ COMPLETED'],
    ['Transaction ID', r.transactionId||r.captureId||r.orderId||'—'],
    ['Amount Charged', `${selCurr.symbol}${parseFloat(r.amount||curAmount).toFixed(2)} ${r.currency||selCurr.code}`],
    ['Payment Method', method],
    ['Customer',       r.payerEmail||r.customerEmail||g('payer-email')?.value||'—'],
    ['Date & Time',    new Date().toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST'],
  ].map(([k,v])=>`<div class="sd-row"><span>${k}</span><span>${v}</span></div>`).join('');
  toast('Payment received and charged! 🎉');
}
function resetPayment(){
  g('success-card').classList.add('hidden');g('pay-card').classList.remove('hidden');
  ['amt-input','payer-name','payer-email','payer-desc'].forEach(id=>{if(g(id))g(id).value='';});
  curAmount=0;onAmountChange();clearMsg();
}

/* ═══════════════════════════════════════════════════════════════
   MESSAGES + TOAST
═══════════════════════════════════════════════════════════════ */
function showMsg(t,m){const e=g('pay-msg');e.className=`pay-msg ${t}`;e.textContent=m;e.classList.remove('hidden');}
function clearMsg(){g('pay-msg')?.classList.add('hidden');}
function toast(msg,icon='ti-circle-check'){
  const t=g('toast');t.innerHTML=`<i class="ti ${icon}" aria-hidden="true"></i> ${msg}`;
  t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),4000);
}

/* ═══════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════ */
async function initApp(){
  if(_payInit)return;_payInit=true;
  await loadRates();
  renderList();updateQuickBtns();updateSummary();
  loadPayPalSDK(renderPayPalButtons);
  document.addEventListener('click',e=>{if(!e.target.closest('.curr-wrap'))closeCurr();});
}

document.addEventListener('DOMContentLoaded',()=>{
  ['lid','lpw'].forEach(id=>{
    const el=g(id);if(!el)return;
    el.addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
    el.addEventListener('input',clearLErr);
  });
  if(sessionStorage.getItem('ipc_ok')==='1'){
    g('scr-login').classList.remove('active');g('scr-main').classList.add('active');initApp();
  } else {
    g('scr-login').classList.add('active');
  }
});

Object.assign(window,{doLogin,doLogout,togglePw,openCurr,closeCurr,filterCurr,pickCurr,onAmountChange,setQuick,switchMethod,submitBraintree,resetPayment});
