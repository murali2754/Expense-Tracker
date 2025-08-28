const $ = (sel, ctx=document) => ctx.querySelector(sel);
const state = { txs: [], filters: { q:'', type:'all', category:'all', sort:'date_desc' } };
const storeKey = "expense_tracker_v1";

(function init(){
  try{ state.txs = JSON.parse(localStorage.getItem(storeKey))||[] }catch{ state.txs=[] }
  $("#txDate").value = new Date().toISOString().slice(0,10);
  $("#txForm").addEventListener("submit", onSubmit);
  $("#clearForm").addEventListener("click", clearForm);
  $("#q").addEventListener("input", e=>{state.filters.q=e.target.value.toLowerCase(); render()});
  $("#fType").addEventListener("change", e=>{state.filters.type=e.target.value; render()});
  $("#fCategory").addEventListener("change", e=>{state.filters.category=e.target.value; render()});
  $("#fSort").addEventListener("change", e=>{state.filters.sort=e.target.value; render()});
  $("#exportBtn").addEventListener("click", exportJSON);
  $("#importFile").addEventListener("change", importJSON);
  $("#resetBtn").addEventListener("click", resetAll);
  render();
})();

function persist(){ localStorage.setItem(storeKey, JSON.stringify(state.txs)) }

function onSubmit(e){
  e.preventDefault();
  const id = $("#editId").value || crypto.randomUUID();
  const t = {
    id, date:$("#txDate").value, desc:$("#txDesc").value.trim(),
    category:$("#txCategory").value, type:$("#txType").value,
    amount:parseFloat($("#txAmount").value)
  };
  if(!t.desc || !isFinite(t.amount)) return alert("Enter valid details");
  const i = state.txs.findIndex(x=>x.id===id);
  if(i>=0) state.txs[i]=t; else state.txs.push(t);
  persist(); clearForm(); render();
}
function clearForm(){ $("#txForm").reset(); $("#editId").value=""; }
function editTx(id){ const t=state.txs.find(x=>x.id===id); if(!t) return;
  $("#editId").value=t.id; $("#txDate").value=t.date; $("#txDesc").value=t.desc;
  $("#txCategory").value=t.category; $("#txType").value=t.type; $("#txAmount").value=t.amount; }
function deleteTx(id){ if(confirm("Delete?")){ state.txs=state.txs.filter(x=>x.id!==id); persist(); render(); }}

function applyFilters(list){
  const f=state.filters;
  let out=list.filter(t=>(!f.q||t.desc.toLowerCase().includes(f.q)) && (f.type==='all'||t.type===f.type) && (f.category==='all'||t.category===f.category));
  switch(f.sort){case'date_asc':out.sort((a,b)=>a.date.localeCompare(b.date));break;
    case'amt_desc':out.sort((a,b)=>b.amount-a.amount);break;
    case'amt_asc':out.sort((a,b)=>a.amount-b.amount);break;
    default:out.sort((a,b)=>b.date.localeCompare(a.date));}
  return out;
}

function render(){
  const rows=$("#rows"); rows.innerHTML="";
  const list=applyFilters(state.txs);
  list.forEach(t=>{
    const tr=$("#rowTmpl").content.cloneNode(true);
    tr.querySelector("[data-cell=date]").textContent=t.date;
    tr.querySelector("[data-cell=desc]").textContent=t.desc;
    tr.querySelector("[data-cell=category]").textContent=t.category;
    tr.querySelector("[data-cell=amount]").textContent="₹"+t.amount.toFixed(2);
    tr.querySelector("[data-cell=type]").textContent=t.type;
    tr.querySelector("[data-action=edit]").addEventListener("click",()=>editTx(t.id));
    tr.querySelector("[data-action=delete]").addEventListener("click",()=>deleteTx(t.id));
    rows.appendChild(tr);
  });

  updateTotals(list);   // ✅ update KPI cards + summary
  drawChart();
}

function updateTotals(list){
  let income=0, expense=0;
  state.txs.forEach(t=>{
    if(t.type==="income") income+=t.amount;
    else if(t.type==="expense") expense+=t.amount;
  });
  const net=income-expense;

  // KPI Cards
  $("#incomeTotal").textContent="₹"+income.toFixed(2);
  $("#expenseTotal").textContent="₹"+expense.toFixed(2);
  $("#netBalance").textContent="₹"+net.toFixed(2);

  $("#incomeCount").textContent=state.txs.filter(t=>t.type==="income").length+" entries";
  $("#expenseCount").textContent=state.txs.filter(t=>t.type==="expense").length+" entries";
  $("#netHint").textContent=net>=0?"Good job! You're saving 💚":"Careful, spending exceeds income! ⚠️";

  // Summary below table
  $("#sumIncome").textContent="₹"+income.toFixed(2);
  $("#sumExpense").textContent="₹"+expense.toFixed(2);
  $("#sumNet").textContent="₹"+net.toFixed(2);

  // Empty state
  $("#emptyState").hidden=list.length>0;
}

function drawChart(){
  const c=$("#chart"),ctx=c.getContext("2d"); ctx.clearRect(0,0,c.width,c.height);
  const data={}; state.txs.forEach(t=>{if(t.type==='expense'){data[t.category]=(data[t.category]||0)+t.amount}});
  let total=Object.values(data).reduce((a,b)=>a+b,0),start=-Math.PI/2,i=0;
  for(const [cat,val] of Object.entries(data)){
    ctx.beginPath(); ctx.moveTo(130,130); ctx.arc(130,130,100,start,start+(val/total)*2*Math.PI); ctx.closePath();
    ctx.fillStyle=`hsl(${i*60},70%,55%)`; ctx.fill(); start+=(val/total)*2*Math.PI; i++;
  }
}

function exportJSON(){
  const blob=new Blob([JSON.stringify(state.txs)],{type:'application/json'});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="expense.json"; a.click();
}
async function importJSON(e){const f=e.target.files[0]; if(!f) return; const txt=await f.text();
  try{state.txs=JSON.parse(txt);persist();render();}catch{alert("Invalid file")}}
function resetAll(){if(confirm("Clear all?")){state.txs=[];persist();render();}}
