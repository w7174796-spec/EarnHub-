const express=require("express");
const session=require("express-session");
const bcrypt=require("bcryptjs");
const Database=require("better-sqlite3");
const path=require("path");

const app=express();
const db=new Database("app.db");
db.pragma("journal_mode=WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 name TEXT NOT NULL,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'user',
 balance REAL NOT NULL DEFAULT 0,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS earnings(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 amount REAL NOT NULL,
 description TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS withdrawals(
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 amount REAL NOT NULL,
 method TEXT NOT NULL,
 account TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
`);
const adminEmail=process.env.ADMIN_EMAIL||"admin@example.com";
const adminPassword=process.env.ADMIN_PASSWORD||"ChangeMe123!";
const existing=db.prepare("SELECT id FROM users WHERE email=?").get(adminEmail);
if(!existing){
 const hash=bcrypt.hashSync(adminPassword,12);
 db.prepare("INSERT INTO users(name,email,password_hash,role) VALUES(?,?,?,'admin')").run("Administrator",adminEmail,hash);
 console.log(`Admin created: ${adminEmail} / ${adminPassword}`);
}

app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
 secret:process.env.SESSION_SECRET||"replace-this-secret-in-production",
 resave:false,saveUninitialized:false,
 cookie:{httpOnly:true,sameSite:"lax",secure:false,maxAge:86400000}
}));
app.use(express.static(path.join(__dirname,"public")));

function auth(req,res,next){
 if(!req.session.userId) return res.status(401).json({error:"Please log in."});
 next();
}
function admin(req,res,next){
 if(!req.session.userId) return res.status(401).json({error:"Please log in."});
 const u=db.prepare("SELECT role FROM users WHERE id=?").get(req.session.userId);
 if(!u||u.role!=="admin") return res.status(403).json({error:"Admin access required."});
 next();
}

app.post("/api/signup",(req,res)=>{
 const {name,email,password}=req.body;
 if(!name||!email||!password||password.length<8) return res.status(400).json({error:"Name, email and an 8+ character password are required."});
 try{
  const hash=bcrypt.hashSync(password,12);
  const r=db.prepare("INSERT INTO users(name,email,password_hash) VALUES(?,?,?)").run(name.trim(),email.trim().toLowerCase(),hash);
  req.session.userId=r.lastInsertRowid;
  res.json({ok:true});
 }catch(e){res.status(400).json({error:"That email is already registered."});}
});
app.post("/api/login",(req,res)=>{
 const {email,password}=req.body;
 const u=db.prepare("SELECT * FROM users WHERE email=?").get((email||"").trim().toLowerCase());
 if(!u||!bcrypt.compareSync(password||"",u.password_hash)) return res.status(401).json({error:"Invalid email or password."});
 req.session.userId=u.id; res.json({ok:true});
});
app.post("/api/logout",(req,res)=>req.session.destroy(()=>res.json({ok:true})));

app.get("/api/me",auth,(req,res)=>{
 const u=db.prepare("SELECT id,name,email,role,balance,created_at FROM users WHERE id=?").get(req.session.userId);
 const earnings=db.prepare("SELECT amount,description,created_at FROM earnings WHERE user_id=? ORDER BY id DESC LIMIT 20").all(u.id);
 const withdrawals=db.prepare("SELECT id,amount,method,account,status,created_at FROM withdrawals WHERE user_id=? ORDER BY id DESC LIMIT 20").all(u.id);
 res.json({user:u,earnings,withdrawals});
});

// Demo earning action: replace with verified task/ad/referral provider before production.
app.post("/api/earn",auth,(req,res)=>{
 const amount=Number(req.body.amount||1);
 if(!Number.isFinite(amount)||amount<=0||amount>100) return res.status(400).json({error:"Invalid demo reward."});
 const desc=String(req.body.description||"Completed demo task").slice(0,120);
 const tx=db.transaction(()=>{
  db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(amount,req.session.userId);
  db.prepare("INSERT INTO earnings(user_id,amount,description) VALUES(?,?,?)").run(req.session.userId,amount,desc);
 });
 tx(); res.json({ok:true});
});

app.post("/api/withdraw",auth,(req,res)=>{
 const amount=Number(req.body.amount);
 const method=String(req.body.method||"").slice(0,40);
 const account=String(req.body.account||"").slice(0,120);
 if(!Number.isFinite(amount)||amount<5||!method||!account) return res.status(400).json({error:"Minimum withdrawal is 5.00 and payment details are required."});
 const tx=db.transaction(()=>{
  const u=db.prepare("SELECT balance FROM users WHERE id=?").get(req.session.userId);
  if(u.balance<amount) throw new Error("Insufficient balance.");
  db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(amount,req.session.userId);
  db.prepare("INSERT INTO withdrawals(user_id,amount,method,account) VALUES(?,?,?,?)").run(req.session.userId,amount,method,account);
 });
 try{tx();res.json({ok:true});}catch(e){res.status(400).json({error:e.message});}
});

app.get("/api/admin/summary",admin,(req,res)=>{
 const users=db.prepare("SELECT id,name,email,role,balance,created_at FROM users ORDER BY id DESC").all();
 const withdrawals=db.prepare(`
 SELECT w.*,u.name,u.email FROM withdrawals w JOIN users u ON u.id=w.user_id
 ORDER BY w.id DESC LIMIT 100`).all();
 const stats={
  users:db.prepare("SELECT COUNT(*) c FROM users WHERE role='user'").get().c,
  pending:db.prepare("SELECT COUNT(*) c FROM withdrawals WHERE status='pending'").get().c,
  paid:db.prepare("SELECT COALESCE(SUM(amount),0) s FROM withdrawals WHERE status='paid'").get().s,
  balances:db.prepare("SELECT COALESCE(SUM(balance),0) s FROM users WHERE role='user'").get().s
 };
 res.json({users,withdrawals,stats});
});
app.post("/api/admin/withdrawal/:id",admin,(req,res)=>{
 const id=Number(req.params.id), status=req.body.status;
 if(!["approved","paid","rejected"].includes(status)) return res.status(400).json({error:"Invalid status."});
 const w=db.prepare("SELECT * FROM withdrawals WHERE id=?").get(id);
 if(!w) return res.status(404).json({error:"Withdrawal not found."});
 if(w.status==="pending" && status==="rejected"){
  db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(w.amount,w.user_id);
 }
 db.prepare("UPDATE withdrawals SET status=? WHERE id=?").run(status,id);
 res.json({ok:true});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"public","index.html")));
const port=process.env.PORT||3000;
app.listen(port,()=>console.log(`Money app running on http://localhost:${port}`));