const $=s=>document.querySelector(s), msg=t=>{const e=$("#msg");e.textContent=t;e.style.display="block";setTimeout(()=>e.style.display="none",2500)};
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...opt});const d=await r.json();if(!r.ok)throw Error(d.error||"Request failed");return d}
function showAuth(sign=false){$("#auth").hidden=false;$("#app").hidden=true;$("#loginCard").hidden=sign;$("#signupCard").hidden=!sign;$("#navLogout").hidden=true;$("#navLogin").hidden=sign;$("#navSignup").hidden=!sign}
function money(n){return Number(n).toFixed(2)}
async function load(){
 try{const d=await api("/api/me");$("#auth").hidden=true;$("#app").hidden=false;$("#navLogout").hidden=false;$("#navLogin").hidden=true;$("#navSignup").hidden=true;
 $("#balance").textContent=money(d.user.balance);$("#earnings").innerHTML=d.earnings.length?d.earnings.map(x=>`<div class=row><span>${x.description}</span><b>+${money(x.amount)}</b></div>`).join(""):"No earnings yet.";
 $("#withdrawals").innerHTML=d.withdrawals.length?d.withdrawals.map(x=>`<div class=row><span>${x.method}<br><small>${x.account}</small></span><span>${money(x.amount)} <span class=pill>${x.status}</span></span></div>`).join(""):"No withdrawal requests.";
 if(d.user.role==="admin")loadAdmin(); else $("#admin").hidden=true;
 }catch(e){showAuth(false)}
}
async function loadAdmin(){const d=await api("/api/admin/summary");$("#admin").hidden=false;$("#stats").innerHTML=`<div class=stats><div class=stat>Users<b>${d.stats.users}</b></div><div class=stat>Pending<b>${d.stats.pending}</b></div><div class=stat>Paid<b>${money(d.stats.paid)}</b></div><div class=stat>User balances<b>${money(d.stats.balances)}</b></div></div>`;
 $("#adminWithdrawals").innerHTML=d.withdrawals.length?d.withdrawals.map(w=>`<div class=row><span><b>${w.name}</b> (${w.email})<br>${money(w.amount)} via ${w.method}<br><small>${w.account}</small></span><span>${w.status==="pending"?`<button onclick="setW(${w.id},'approved')">Approve</button> <button onclick="setW(${w.id},'rejected')">Reject</button>`:w.status}</span></div>`).join(""):"No requests."}
async function setW(id,status){try{await api("/api/admin/withdrawal/"+id,{method:"POST",body:JSON.stringify({status})});msg("Updated");load()}catch(e){msg(e.message)}}
$("#login").onsubmit=async e=>{e.preventDefault();try{await api("/api/login",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});load()}catch(x){msg(x.message)}};
$("#signup").onsubmit=async e=>{e.preventDefault();try{await api("/api/signup",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});load()}catch(x){msg(x.message)}};
$("#earn").onclick=async()=>{try{await api("/api/earn",{method:"POST",body:JSON.stringify({amount:1,description:"Completed demo task"})});msg("1.00 added");load()}catch(e){msg(e.message)}};
$("#withdraw").onsubmit=async e=>{e.preventDefault();try{await api("/api/withdraw",{method:"POST",body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});e.target.reset();msg("Withdrawal request submitted");load()}catch(x){msg(x.message)}};
$("#navLogin").onclick=()=>showAuth(false);$("#navSignup").onclick=()=>showAuth(true);$("#toSignup").onclick=()=>showAuth(true);$("#toLogin").onclick=()=>showAuth(false);$("#navLogout").onclick=async()=>{await api("/api/logout",{method:"POST"});showAuth(false)};load();