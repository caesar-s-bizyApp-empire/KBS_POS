
(function(){
/* ---------- App-wide config & storage keys ---------- */
const STORAGE = {
  USERS: 'minishop_users_v1',
  STOCK: 'minishop_stock_v1',
  POS: 'minishop_pos_v1',
  INVOICES: 'minishop_invoices_v1',
  APP_SETTINGS: 'minishop_settings_v1',
  SAVED_USER: 'minishop_saved_user_v1'
};

/* ---------- Default demo data (created on first run) ---------- */
function ensureDefaults(){
  if(!localStorage.getItem(STORAGE.USERS)){
    const users = [
      { username: 'admin', password: 'admin', role: 'admin', name: 'Administrator' },
      { username: 'cashier', password: 'cashier', role: 'cashier', name: 'Cashier One' }
    ];
    localStorage.setItem(STORAGE.USERS, JSON.stringify(users));
  }
  if(!localStorage.getItem(STORAGE.STOCK)){
    const sampleStock = [
      { name: 'Infinix Hot 40i', qty: 50, costPrice: 1.20 },
      { name: 'Bread (Small)', qty: 30, costPrice: 0.80 },
      { name: 'Soap Bar', qty: 40, costPrice: 1.50 }
    ];
    localStorage.setItem(STORAGE.STOCK, JSON.stringify(sampleStock));
  }
  if(!localStorage.getItem(STORAGE.POS)){
    localStorage.setItem(STORAGE.POS, JSON.stringify([]));
  }
  if(!localStorage.getItem(STORAGE.INVOICES)){
    localStorage.setItem(STORAGE.INVOICES, JSON.stringify([]));
  }
  if(!localStorage.getItem(STORAGE.APP_SETTINGS)){
    localStorage.setItem(STORAGE.APP_SETTINGS, JSON.stringify({
      brandName: "CAESAR'S SUPERMART SHOP",
      brandLogo: '🛒',
      defaultPrintSize: '80',
      theme: 'light'
    }));
  }
}
ensureDefaults();

/* ---------- DOM refs ---------- */
const loginScreen = document.getElementById('loginScreen');
const appEl = document.getElementById('app');
const mainContent = document.getElementById('mainContent');
const btnLogin = document.getElementById('btnLogin');
const btnDemoFill = document.getElementById('btnDemoFill');
const usernameEl = document.getElementById('username');
const passwordEl = document.getElementById('password');
const rememberEl = document.getElementById('remember');
const errorEl = document.getElementById('error');
const datetimeEl = document.getElementById('datetime');
const brandNameEl = document.getElementById('brandName');
const brandLogoEl = document.getElementById('brandLogo');
const userNameSmall = document.getElementById('userNameSmall');

const csvStockFile = document.getElementById('csvStockFile');
const csvPosFile = document.getElementById('csvPosFile');
const csvInvoicesFile = document.getElementById('csvInvoicesFile');

/* ---------- Utility helpers ---------- */
function readJSON(key, fallback){ try{ return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch(e){ return fallback; } }
function writeJSON(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
function money(n){ return 'Gh¢' + (Number(n)||0).toFixed(2); }
function escapeHtml(str){ return String(str || '').replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function now(){ return new Date().toLocaleString(); }
function showError(msg){ errorEl.style.display='block'; errorEl.textContent = msg; setTimeout(()=>{ errorEl.style.display='none'; }, 4000); }

/* ---------- Clock ---------- */
setInterval(()=>{ datetimeEl.textContent = new Date().toLocaleString(); }, 1000);

/* ---------- Users management (persisted) ---------- */
function getUsers(){ return readJSON(STORAGE.USERS, []); }
function saveUsers(users){ writeJSON(STORAGE.USERS, users); }

/* ---------- Login flow ---------- */
function findUser(username){ return getUsers().find(u => u.username === username); }

function doLogin(userObj, remember){
  // mark saved if requested
  if(remember){
    localStorage.setItem(STORAGE.SAVED_USER, JSON.stringify(userObj));
  } else {
    localStorage.removeItem(STORAGE.SAVED_USER);
  }
  // show app
  loginScreen.style.display = 'none';
  appEl.style.display = '';
  appEl.setAttribute('aria-hidden','false');
  // populate brand and user
  const settings = readJSON(STORAGE.APP_SETTINGS, {});
  brandNameEl.textContent = settings.brandName || 'MiniShop';
  brandLogoEl.textContent = settings.brandLogo || '🛒';
  userNameSmall.textContent = userObj.name || userObj.username;
  currentUser = userObj;
  openDashboard(currentUser);
}

/* Auto-login if saved */
const savedUserJson = localStorage.getItem(STORAGE.SAVED_USER);
let currentUser = null;
if(savedUserJson){
  try{
    const su = JSON.parse(savedUserJson);
    // refresh user object from storage to get latest password/name changes
    const u = findUser(su.username);
    if(u){
      doLogin(u, true);
    } else {
      localStorage.removeItem(STORAGE.SAVED_USER);
    }
  } catch(e){}
}

/* ---------- Demo fill ---------- */
btnDemoFill.addEventListener('click', ()=>{
  usernameEl.value = 'admin';
  passwordEl.value = 'admin';
});

/* ---------- Login handler ---------- */
btnLogin.addEventListener('click', ()=>{
  const u = usernameEl.value.trim();
  const p = passwordEl.value.trim();
  if(!u || !p) return showError('Enter username and password');
  const user = findUser(u);
  if(!user) return showError('User not found');
  if(user.password !== p) return showError('Invalid username or password');
  doLogin(user, rememberEl.checked);
});

/* ---------- Sign out & lock ---------- */
document.getElementById('signOut').addEventListener('click', ()=>{ localStorage.removeItem(STORAGE.SAVED_USER); location.reload(); });
document.getElementById('lockBtn').addEventListener('click', ()=>{ localStorage.removeItem(STORAGE.SAVED_USER); location.reload(); });

/* ---------- Nav bindings ---------- */
document.getElementById('navDashboard').addEventListener('click', ()=> openDashboard(currentUser));
document.getElementById('navStock').addEventListener('click', ()=> renderStockManager());
document.getElementById('navPOS').addEventListener('click', ()=> renderPOS(currentUser));
document.getElementById('navReports').addEventListener('click', ()=> renderReports());
document.getElementById('navInvoices').addEventListener('click', ()=> renderInvoices());
document.getElementById('navSettings').addEventListener('click', ()=> renderSettings());
document.getElementById('navImport').addEventListener('click', ()=> openImportSelector());
document.getElementById('navExport').addEventListener('click', ()=> openExportModal());

/* ---------- Dashboard ---------- */
function openDashboard(user){
  const invoices = readJSON(STORAGE.INVOICES, []);
  const totalSales = invoices.reduce((s,inv)=> 
    s + Number((inv.total||'0').toString().replace(/[^\d.-]/g,'')), 0);

  mainContent.innerHTML = `
    <div class="card">
     <h2 style="text-align: center; margin-bottom: 4px;">CAESAR'S BUSINESS EMPIRE</h2>
      <hr style="border: 1px solid #000; width: 100%; margin: 0 auto 12px auto;">

      <div class="section-title">
        <h3>Quick Sales Summary</h3>
        <div class="badge">${user.role.toUpperCase()}</div>
      </div>

      <div style="display:flex;gap:18px;margin-top:12px;flex-wrap:wrap">
        <div style="flex:1;min-width:180px" class="card">
          <div class="small-muted">Total Sales</div>
          <div style="font-size:20px;font-weight:700">${money(totalSales)}</div>
        </div>

        <div style="flex:1;min-width:180px" class="card">
          <div class="small-muted">Invoices</div>
          <div style="font-size:20px;font-weight:700">${invoices.length}</div>
        </div>

        <div style="flex:1;min-width:180px" class="card">
          <div class="small-muted">Stock Items</div>
          <div style="font-size:20px;font-weight:700">${readJSON(STORAGE.STOCK,[]).length}</div>
        </div>
      </div>

      ${
        user.role === 'admin' ? `
        <div style="margin-top:15px;text-align:right">
          <button id="resetSummaryBtn" class="btn ghost">Reset Summary (Admin)</button>
        </div>` : ''
      }
    </div>
  `;

  if(user.role === 'admin'){
    document.getElementById('resetSummaryBtn')
      .addEventListener('click', resetQuickSummary);
  }
}


function resetQuickSummary(){

  const users = getUsers();
  const adminUser = users.find(u => u.role === 'admin');

  if(!adminUser){
    return showError("Admin account not found.");
  }

  const enteredPassword = prompt("Enter Admin Password to confirm reset:");

  if(!enteredPassword){
    return;
  }

  if(enteredPassword !== adminUser.password){
    return showError("Incorrect admin password. Reset denied.");
  }

  if(!confirm("WARNING: This will permanently delete ALL invoices and stock items. Continue?")){
    return;
  }

  // Clear invoices
  writeJSON(STORAGE.INVOICES, []);

  // Clear stock
  writeJSON(STORAGE.STOCK, []);

  alert("System successfully reset by Admin.");

  openDashboard(currentUser);
}

/* ---------- Stock Manager (with import/export/search) ---------- */
function renderStockManager(){
  const stock = readJSON(STORAGE.STOCK, []);
  mainContent.innerHTML = `
    <div class="card">
      <div class="section-title">
        <h3>Stock Manager</h3>
        <div style="display:flex;gap:8px;align-items:center">
          <input id="stockSearch" class="input" placeholder="Search stock..." style="width:220px" />
          <button id="btnAddItem" class="btn">Add / Merge Item</button>
          <button id="btnImportStock" class="btn ghost">Import CSV</button>
          <button id="btnExportStock" class="btn ghost">Export CSV</button>
        </div>
      </div>

      <table aria-live="polite">
        <thead><tr><th>#</th><th>Item</th><th style="text-align:center">Qty</th><th style="text-align:right">Cost Price</th><th style="text-align:center">Actions</th></tr></thead>
        <tbody id="stockTable">${stock.map((s,i)=>`
          <tr>
            <td>${i+1}</td>
            <td>${escapeHtml(s.name)}</td>
            <td style="text-align:center">${s.qty}</td>
            <td style="text-align:right">${money(s.costPrice)}</td>
            <td style="text-align:center" class="actions">
              <button data-id="${i}" class="editBtn btn ghost">Edit</button>
              <button data-id="${i}" class="deleteBtn btn ghost">Delete</button>
            </td>
          </tr>
        `).join('')}</tbody>
      </table>
    </div>
  `;

  document.getElementById('btnAddItem').addEventListener('click', addOrMergeItemFlow);
  document.getElementById('btnImportStock').addEventListener('click', ()=> csvStockFile.click());
  document.getElementById('btnExportStock').addEventListener('click', ()=> downloadCSV('stock'));

  document.getElementById('stockSearch').addEventListener('input', (e)=>{
    const q = e.target.value.trim().toLowerCase();
    const stock = readJSON(STORAGE.STOCK, []);
    const rows = stock.filter(s => s.name.toLowerCase().includes(q));
    const tbody = document.getElementById('stockTable');
    tbody.innerHTML = rows.map((s,i)=>`
      <tr>
        <td>${i+1}</td>
        <td>${escapeHtml(s.name)}</td>
        <td style="text-align:center">${s.qty}</td>
        <td style="text-align:right">${money(s.costPrice)}</td>
        <td style="text-align:center" class="actions">
          <button data-name="${escapeHtml(s.name)}" class="quickEdit btn ghost">Edit</button>
        </td>
      </tr>
    `).join('');
    // attach quick edit
    document.querySelectorAll('.quickEdit').forEach(b=>b.onclick = ()=> {
      const name = b.dataset.name;
      const idx = readJSON(STORAGE.STOCK, []).findIndex(x=>x.name===name);
      if(idx>=0) editStockItem(idx);
    });
  });

  attachStockActions();
}

/* Add or merge prompt flow */
function addOrMergeItemFlow(){
  const name = prompt('Item name');
  if(!name) return;
  const qty = parseInt(prompt('Quantity', '1'));
  if(isNaN(qty)) return alert('Invalid quantity');
  const cp = parseFloat(prompt('Cost Price', '0.00'));
  if(isNaN(cp)) return alert('Invalid cost price');

  const stock = readJSON(STORAGE.STOCK, []);
  const existing = stock.find(s => s.name.toLowerCase() === name.toLowerCase());
  if(existing){
    existing.qty += qty;
    existing.costPrice = cp;
  } else {
    stock.push({ name, qty, costPrice: cp });
  }
  writeJSON(STORAGE.STOCK, stock);
  renderStockManager();
}

/* attach edit/delete in stock table */
function attachStockActions(){
  document.querySelectorAll('.editBtn').forEach(btn=>{
    btn.onclick = ()=> {
      const idx = Number(btn.dataset.id);
      editStockItem(idx);
    };
  });
  document.querySelectorAll('.deleteBtn').forEach(btn=>{
    btn.onclick = ()=> {
      const idx = Number(btn.dataset.id);
      const stock = readJSON(STORAGE.STOCK, []);
      if(confirm('Delete this item?')){ stock.splice(idx,1); writeJSON(STORAGE.STOCK, stock); renderStockManager(); }
    };
  });
}
function editStockItem(idx){
  const stock = readJSON(STORAGE.STOCK, []);
  const s = stock[idx];
  if(!s) return;
  const name = prompt('Item name', s.name); if(!name) return;
  const qty = parseInt(prompt('Quantity', s.qty)); if(isNaN(qty)) return;
  const cp = parseFloat(prompt('Cost Price', s.costPrice)); if(isNaN(cp)) return;
  stock[idx] = { name, qty, costPrice: cp };
  writeJSON(STORAGE.STOCK, stock);
  renderStockManager();
}

/* ---------- POS ---------- */
function renderPOS(currentUser){
  const stock = readJSON(STORAGE.STOCK, []);
  const pos = readJSON(STORAGE.POS, []);
  const settings = readJSON(STORAGE.APP_SETTINGS, {});
  mainContent.innerHTML = `
    <div class="card">
      <div class="section-title">
        <h3>POS Interface</h3>
        <div class="small-muted">Cashier: <strong>${escapeHtml(currentUser.name)}</strong></div>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;align-items:center" class="topline">
        <label style="display:flex;flex-direction:column;min-width:180px">
          Select item
          <select id="selectItem" class="input">
            <option value="">Select Item</option>
            ${stock.map(s=>`<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)} (Qty: ${s.qty})</option>`).join('')}
          </select>
        </label>

        <label style="display:flex;flex-direction:column;width:90px">
          Qty
          <input type="number" id="sellQty" class="input" placeholder="Qty" min="1" value="1">
        </label>

        <label style="display:flex;flex-direction:column;width:120px">
          Profit %
          <input type="number" id="profitPercent" class="input" placeholder="Profit %" value="20">
        </label>

        <label style="display:flex;flex-direction:column;width:140px">
          Print size
          <select id="printSize" class="input">
            <option value="58">58mm (small)</option>
            <option value="80" ${settings.defaultPrintSize==='80'?'selected':''}>80mm (standard)</option>
            <option value="a4">A4 (full)</option>
          </select>
        </label>

        <div style="display:flex;gap:6px;align-items:flex-end">
          <button id="addPOSItem" class="btn">Add to POS</button>
          <button id="clearPOS" class="btn ghost">Clear POS</button>
        </div>
      </div>

      <table>
        <thead>
          <tr><th>Item</th><th style="text-align:right">Cost Price</th><th style="text-align:center">Profit %</th><th style="text-align:right">Sell Price</th><th style="text-align:center">Qty</th><th style="text-align:right">Total</th><th style="text-align:center">Actions</th></tr>
        </thead>
        <tbody id="posTable">${pos.map((p,i)=>`<tr>
          <td>${escapeHtml(p.name)}</td>
          <td style="text-align:right">${money(p.costPrice)}</td>
          <td style="text-align:center">${p.profitPercent}</td>
          <td style="text-align:right">${money(p.sellingPrice)}</td>
          <td style="text-align:center">${p.qty}</td>
          <td style="text-align:right">${money(p.sellingPrice * p.qty)}</td>
          <td style="text-align:center" class="actions"><button data-id="${i}" class="deletePOS btn ghost">Delete</button></td>
        </tr>`).join('')}</tbody>
      </table>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
        <div>Grand Total: <strong id="grandTotal">Gh¢0.00</strong> | Grand Profit: <strong id="grandProfit">Gh¢0.00</strong></div>
        <div style="display:flex;gap:8px">
          <button id="previewReceipt" class="btn">Preview Receipt</button>
          <button id="printReceipt" class="btn neutral">Print Receipt</button>
        </div>
      </div>

      <pre id="receipt" aria-hidden="true" style="display:none"></pre>
      <div id="invoiceView" style="margin-top:8px"></div>
    </div>
  `;

  attachPOSToggles(currentUser);
  recalcPOS();
}

/* POS bindings */
function attachPOSToggles(currentUser){
  const selectItem = document.getElementById('selectItem');
  const qtyInput = document.getElementById('sellQty');
  const profitInput = document.getElementById('profitPercent');
  const printSizeSelect = document.getElementById('printSize');

  document.getElementById('addPOSItem').addEventListener('click', ()=>{
    const itemName = selectItem.value;
    const qty = parseInt(qtyInput.value);
    const profitPercent = parseFloat(profitInput.value);
    if(!itemName || isNaN(qty) || qty<=0 || isNaN(profitPercent)) return showError('Please select valid item, quantity and profit.');
    const stock = readJSON(STORAGE.STOCK, []);
    const item = stock.find(s=>s.name===itemName);
    if(!item || item.qty < qty) return showError('Not enough quantity in stock.');
    const sellingPrice = Number(item.costPrice) + (Number(item.costPrice) * (profitPercent/100));
    // update stock
    item.qty -= qty;
    // add to pos list
    const pos = readJSON(STORAGE.POS, []);
    pos.push({ name: item.name, qty, costPrice: item.costPrice, profitPercent, sellingPrice });
    writeJSON(STORAGE.POS, pos);
    writeJSON(STORAGE.STOCK, stock);
    renderPOS(currentUser);
  });

  document.getElementById('clearPOS').addEventListener('click', ()=>{
    const pos = readJSON(STORAGE.POS, []);
    const stock = readJSON(STORAGE.STOCK, []);
    pos.forEach(p=>{
      const s = stock.find(x=>x.name===p.name);
      if(s) s.qty += p.qty;
    });
    writeJSON(STORAGE.POS, []);
    writeJSON(STORAGE.STOCK, stock);
    renderPOS(currentUser);
  });

  document.querySelectorAll('.deletePOS').forEach(btn=>{
    btn.onclick = ()=>{
      const idx = Number(btn.dataset.id);
      const pos = readJSON(STORAGE.POS, []);
      const p = pos[idx];
      const stock = readJSON(STORAGE.STOCK, []);
      const s = stock.find(x=>x.name===p.name);
      if(s) s.qty += p.qty;
      pos.splice(idx,1);
      writeJSON(STORAGE.POS, pos);
      writeJSON(STORAGE.STOCK, stock);
      renderPOS(currentUser);
    };
  });

  document.getElementById('previewReceipt').addEventListener('click', ()=>{
    const pos = readJSON(STORAGE.POS, []);
    if(pos.length===0) return showError('No items in POS.');
    const settings = readJSON(STORAGE.APP_SETTINGS, {});
    let rec = `${settings.brandName} ${settings.brandLogo}\n`;
    rec += `Date: ${new Date().toLocaleString()}\n`;
    rec += `Cashier: ${currentUser.name}\n`;
    rec += `-------------------------------------\n`;
    pos.forEach(p => rec += `${p.name} x${p.qty} @ ${money(p.sellingPrice)} = ${money(p.qty * p.sellingPrice)}\n`);
    rec += `-------------------------------------\n`;
    const total = pos.reduce((s,p)=> s + (p.sellingPrice * p.qty), 0);
    rec += `GRAND TOTAL: ${money(total)}\n`;
    const receiptEl = document.getElementById('receipt');
    receiptEl.textContent = rec;
    receiptEl.style.display = 'block';
  });

  document.getElementById('printReceipt').addEventListener('click', ()=>{
    const receiptEl = document.getElementById('receipt');
    if(!receiptEl || receiptEl.textContent.trim().length===0) return showError('Please preview receipt first.');
    const w = window.open("", "PrintReceipt");
    w.document.write(`<pre>${receiptEl.textContent}</pre>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();

    // save invoice
    const pos = readJSON(STORAGE.POS, []);
    const invoices = readJSON(STORAGE.INVOICES, []);
    const total = pos.reduce((s,p)=> s + (p.sellingPrice * p.qty), 0);
    invoices.push({ cashier: currentUser.name, items: pos, total: money(total), date: new Date().toLocaleString() });
    writeJSON(STORAGE.INVOICES, invoices);
    // clear pos
    writeJSON(STORAGE.POS, []);
    renderPOS(currentUser);
  });

  recalcPOS();
}

/* recalc totals */
function recalcPOS(){
  const pos = readJSON(STORAGE.POS, []);
  const total = pos.reduce((s,p)=> s + (p.sellingPrice * p.qty), 0);
  const profit = pos.reduce((s,p)=> s + ((p.sellingPrice - p.costPrice) * p.qty), 0);
  const grandTotalEl = document.getElementById('grandTotal');
  const grandProfitEl = document.getElementById('grandProfit');
  if(grandTotalEl) grandTotalEl.textContent = money(total);
  if(grandProfitEl) grandProfitEl.textContent = money(profit);
}

/* ---------- Reports / Invoices ---------- */
function renderReports(){
  const invoices = readJSON(STORAGE.INVOICES, []);
  mainContent.innerHTML = `
    <div class="card">
      <h3>Reports</h3>
      <div class="small-muted">A simple listing of invoices</div>
      <table>
        <thead><tr><th>#</th><th>Cashier</th><th style="text-align:right">Total</th><th>Date</th></tr></thead>
        <tbody>${invoices.map((inv,i)=>`<tr>
          <td>${i+1}</td>
          <td>${escapeHtml(inv.cashier)}</td>
          <td style="text-align:right">${escapeHtml(inv.total)}</td>
          <td>${escapeHtml(inv.date)}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>
  `;
}
function renderInvoices(){
  renderReports();
}

/* ---------- Settings + Change Password ---------- */
function renderSettings(){
  const settings = readJSON(STORAGE.APP_SETTINGS, {});
  mainContent.innerHTML = `
    <div class="card">
      <div class="section-title"><h3>Settings</h3></div>

      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
        <div style="min-width:280px;flex:1" class="card">
          <div class="small-muted">Brand</div>
          <label class="small-muted" style="margin-top:8px">Business name</label>
          <input id="setBrandName" class="input" value="${escapeHtml(settings.brandName||'')}" />
          <label class="small-muted" style="margin-top:8px">Logo (emoji or text)</label>
          <input id="setBrandLogo" class="input" value="${escapeHtml(settings.brandLogo||'')}" />
          <label class="small-muted" style="margin-top:8px">Default print size</label>
          <select id="setPrintSize" class="input">
            <option value="58">58</option>
            <option value="80" ${settings.defaultPrintSize==='80'?'selected':''}>80</option>
            <option value="a4" ${settings.defaultPrintSize==='a4'?'selected':''}>A4</option>
          </select>
          <div style="margin-top:10px;display:flex;gap:8px">
            <button id="saveSettingsBtn" class="btn">Save settings</button>
            <button id="openPassChange" class="btn ghost">Change Password</button>
          </div>
        </div>

        <div style="min-width:280px;flex:1" class="card">
          <div class="small-muted">Users</div>
          <div style="margin-top:8px">You can change any user's password here.</div>
          <label class="small-muted" style="margin-top:8px">Select user</label>
          <select id="userSelect" class="input">${getUsers().map(u=>`<option value="${escapeHtml(u.username)}">${escapeHtml(u.name)} (${escapeHtml(u.username)})</option>`).join('')}</select>
          <label class="small-muted" style="margin-top:8px">New password</label>
          <input id="newPassword" class="input" type="password" placeholder="Enter new password" />
          <div style="margin-top:8px;display:flex;gap:8px">
            <button id="changePasswordBtn" class="btn">Set password</button>
            <button id="resetToDefaultBtn" class="btn ghost">Reset demo passwords</button>
          </div>
          <div class="small-muted" style="margin-top:8px">Password must be at least 4 characters for demo (you can change policy later).</div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('saveSettingsBtn').addEventListener('click', ()=>{
    const bn = document.getElementById('setBrandName').value.trim();
    const bl = document.getElementById('setBrandLogo').value.trim();
    const ps = document.getElementById('setPrintSize').value;
    const settings = readJSON(STORAGE.APP_SETTINGS, {});
    settings.brandName = bn || settings.brandName;
    settings.brandLogo = bl || settings.brandLogo;
    settings.defaultPrintSize = ps;
    writeJSON(STORAGE.APP_SETTINGS, settings);
    brandNameEl.textContent = settings.brandName;
    brandLogoEl.textContent = settings.brandLogo;
    alert('Settings saved');
  });

  document.getElementById('changePasswordBtn').addEventListener('click', ()=>{
    const sel = document.getElementById('userSelect').value;
    const newPass = document.getElementById('newPassword').value;
    if(!newPass || newPass.length < 4) return showError('Password must be at least 4 characters');
    const users = getUsers();
    const idx = users.findIndex(u=>u.username===sel);
    if(idx<0) return showError('User not found');
    users[idx].password = newPass;
    saveUsers(users);
    alert('Password updated for ' + users[idx].username);
  });

  document.getElementById('resetToDefaultBtn').addEventListener('click', ()=>{
    if(!confirm('Reset demo users to default demo passwords?')) return;
    const users = getUsers();
    users.forEach(u=>{
      if(u.username==='admin') u.password = 'admin';
      if(u.username==='cashier') u.password = 'cashier';
    });
    saveUsers(users);
    alert('Demo passwords reset');
  });

  document.getElementById('openPassChange').addEventListener('click', ()=>{
    // scroll to user controls
    document.getElementById('userSelect').focus();
  });
}

/* ---------- CSV import/export ---------- */
/* simple CSV parse (no quotes handling beyond basic) */
function parseCSV(text){
  const lines = text.split(/\r?\n/).filter(l=>l.trim().length>0);
  const headers = lines[0].split(',').map(h=>h.trim());
  const rows = lines.slice(1).map(line => {
    const cols = line.split(',').map(c=>c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = (cols[i]===undefined)?'':cols[i]);
    return obj;
  });
  return { headers, rows };
}

function downloadCSV(kind){
  if(kind==='stock'){
    const stock = readJSON(STORAGE.STOCK, []);
    const csv = ['name,qty,costPrice', ...stock.map(s=>`${s.name},${s.qty},${s.costPrice}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'stock.csv'; a.click(); URL.revokeObjectURL(url);
  } else if(kind==='pos'){
    const pos = readJSON(STORAGE.POS, []);
    const csv = ['name,qty,costPrice,profitPercent,sellingPrice', ...pos.map(p=>`${p.name},${p.qty},${p.costPrice},${p.profitPercent},${p.sellingPrice}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'pos.csv'; a.click(); URL.revokeObjectURL(url);
  } else if(kind==='invoices'){
    const inv = readJSON(STORAGE.INVOICES, []);
    const csv = ['cashier,total,date', ...inv.map(i=>`${i.cashier},${(i.total||'')},${i.date}`)].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'invoices.csv'; a.click(); URL.revokeObjectURL(url);
  }
}

/* open import selector modal (we use file inputs) */
function openImportSelector(){
  const choice = prompt('Import which CSV? Enter "stock", "pos", or "invoices"');
  if(!choice) return;
  if(choice.toLowerCase()==='stock'){ csvStockFile.click(); }
  else if(choice.toLowerCase()==='pos'){ csvPosFile.click(); }
  else if(choice.toLowerCase()==='invoices'){ csvInvoicesFile.click(); }
  else alert('Unknown import type');
}

/* hook file inputs */
csvStockFile.addEventListener('change', (ev)=>{
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=> {
    try{
      const parsed = parseCSV(e.target.result);
      // expect headers name,qty,costPrice
      const rows = parsed.rows.map(r=>({
        name: r.name || r.Name || r.item || '',
        qty: Number(r.qty || r.Qty || r.quantity || 0),
        costPrice: Number(r.costPrice || r.CostPrice || r.cost || 0)
      })).filter(r=>r.name);
      const existing = readJSON(STORAGE.STOCK, []);
      // merge items by name
      rows.forEach(r=>{
        const ex = existing.find(x=>x.name.toLowerCase()===r.name.toLowerCase());
        if(ex){ ex.qty += r.qty; ex.costPrice = r.costPrice; } else existing.push(r);
      });
      writeJSON(STORAGE.STOCK, existing);
      alert('Stock CSV imported and merged.');
      renderStockManager();
    }catch(e){ showError('Failed to parse CSV'); }
  };
  reader.readAsText(f);
  csvStockFile.value = '';
});

csvPosFile.addEventListener('change', (ev)=>{
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=> {
    try{
      const parsed = parseCSV(e.target.result);
      const rows = parsed.rows.map(r=>({
        name: r.name || r.Name || '',
        qty: Number(r.qty || r.Qty || r.quantity || 1),
        costPrice: Number(r.costPrice || r.CostPrice || r.cost || 0),
        profitPercent: Number(r.profitPercent || r.Profit || 0),
        sellingPrice: Number(r.sellingPrice || r.SellPrice || 0)
      })).filter(r=>r.name);
      const pos = readJSON(STORAGE.POS, []);
      rows.forEach(r=> pos.push(r));
      writeJSON(STORAGE.POS, pos);
      alert('POS CSV imported.');
      renderPOS(currentUser);
    }catch(e){ showError('Failed to parse CSV'); }
  };
  reader.readAsText(f);
  csvPosFile.value = '';
});

csvInvoicesFile.addEventListener('change', (ev)=>{
  const f = ev.target.files && ev.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = (e)=> {
    try{
      const parsed = parseCSV(e.target.result);
      const rows = parsed.rows.map(r=>({
        cashier: r.cashier || r.Cashier || '',
        total: r.total || r.Total || '',
        date: r.date || r.Date || now()
      })).filter(r=>r.cashier);
      const inv = readJSON(STORAGE.INVOICES, []);
      rows.forEach(r=> inv.push(r));
      writeJSON(STORAGE.INVOICES, inv);
      alert('Invoices CSV imported.');
      renderReports();
    }catch(e){ showError('Failed to parse CSV'); }
  };
  reader.readAsText(f);
  csvInvoicesFile.value = '';
});

/* export modal (simple prompt) */
function openExportModal(){
  const choice = prompt('Export which CSV? Enter "stock", "pos", or "invoices"');
  if(!choice) return;
  if(choice.toLowerCase()==='stock') downloadCSV('stock');
  else if(choice.toLowerCase()==='pos') downloadCSV('pos');
  else if(choice.toLowerCase()==='invoices') downloadCSV('invoices');
  else alert('Unknown export type');
}

/* ---------- Init: show dashboard or login ---------- */
if(!currentUser){
  loginScreen.style.display = '';
  appEl.style.display = 'none';
} else {
  loginScreen.style.display = 'none';
  appEl.style.display = '';
  openDashboard(currentUser);
}

})();