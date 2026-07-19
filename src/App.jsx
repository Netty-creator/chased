import React, { useState, useEffect } from "react";
import { Plus, Send, Clock, CheckCircle2, AlertCircle, ArrowLeft, Copy, Check, LogOut } from "lucide-react";

const SUPABASE_URL = "https://oflrobtkwinocvitxivt.supabase.co";
const SUPABASE_KEY = "sb_publishable_REn4wobRwI1JE8T0O5wfWw_tyMEANBo";

const STATUS_STYLES = {
  paid: { bg: "#3F7855", label: "Paid", icon: CheckCircle2 },
  pending: { bg: "#D4A017", label: "Pending", icon: Clock },
  overdue: { bg: "#E85D4E", label: "Overdue", icon: AlertCircle },
};

function daysUntil(dateStr) {
  return Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
}

function deriveStatus(inv) {
  if (inv.status === "paid") return "paid";
  return daysUntil(inv.due_date) < 0 ? "overdue" : "pending";
}

async function supabaseSignUp(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function supabaseSignIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

async function fetchInvoices(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices?select=*&order=created_at.desc`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("Failed to load invoices");
  return res.json();
}

async function createInvoice(accessToken, invoice) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/invoices`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(invoice),
  });
  if (!res.ok) throw new Error("Failed to create invoice");
  return res.json();
}

function Receipt({ invoice, onCopy, copied }) {
  const status = STATUS_STYLES[deriveStatus(invoice)];
  const StatusIcon = status.icon;
  return (
    <div style={{ background: "#fff", borderRadius: 4, position: "relative", boxShadow: "0 1px 3px rgba(27,35,64,0.08), 0 8px 24px rgba(27,35,64,0.06)", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 8, backgroundImage: "radial-gradient(circle at 8px 0px, transparent 5px, #fff 5px)", backgroundSize: "16px 8px", backgroundColor: "#EDEEF0" }} />
      <div style={{ padding: "28px 28px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8A8F9E", fontWeight: 600 }}>Invoice</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: "#1B2340", marginTop: 2 }}>{invoice.brand}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: status.bg, color: "#fff", padding: "5px 10px", borderRadius: 100, fontSize: 12, fontWeight: 600 }}>
            <StatusIcon size={13} />
            {status.label}
          </div>
        </div>

        <div style={{ marginTop: 18, color: "#4A4F63", fontSize: 14, lineHeight: 1.5 }}>{invoice.deliverable}</div>

        <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px dashed #D8DAE1", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 11, color: "#8A8F9E", textTransform: "uppercase", letterSpacing: "0.08em" }}>Due</div>
            <div style={{ fontSize: 14, color: "#1B2340", fontWeight: 600, marginTop: 2 }}>
              {new Date(invoice.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              {invoice.status !== "paid" && (
                <span style={{ color: daysUntil(invoice.due_date) < 0 ? "#E85D4E" : "#8A8F9E", fontWeight: 500 }}>
                  {"  \u2022  "}
                  {daysUntil(invoice.due_date) < 0 ? `${Math.abs(daysUntil(invoice.due_date))}d overdue` : `due in ${daysUntil(invoice.due_date)}d`}
                </span>
              )}
            </div>
          </div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: "#1B2340" }}>${Number(invoice.amount).toLocaleString()}</div>
        </div>

        {invoice.status !== "paid" && (
          <button onClick={() => onCopy(invoice.id)} style={{ marginTop: 18, width: "100%", padding: "10px 0", borderRadius: 6, border: "1px solid #D8DAE1", background: copied === invoice.id ? "#F0F5F1" : "#F7F7F8", color: copied === invoice.id ? "#3F7855" : "#1B2340", fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer" }}>
            {copied === invoice.id ? <Check size={14} /> : <Copy size={14} />}
            {copied === invoice.id ? "Payment link copied" : "Copy payment link"}
          </button>
        )}
      </div>
    </div>
  );
}

function AuthScreen({ onAuthed }) {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      if (mode === "signup") {
        const data = await supabaseSignUp(email, password);
        if (data.error || data.error_description) {
          setError(data.error_description || data.msg || "Sign up failed");
        } else if (data.access_token) {
          onAuthed(data.access_token);
        } else {
          setInfo("Account created — check your email to confirm, then sign in.");
          setMode("signin");
        }
      } else {
        const data = await supabaseSignIn(email, password);
        if (data.error || data.error_description) {
          setError(data.error_description || data.msg || "Sign in failed");
        } else {
          onAuthed(data.access_token);
        }
      }
    } catch (err) {
      setError("Something went wrong. Check your connection and try again.");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EDEEF0", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <form onSubmit={handleSubmit} style={{ background: "#fff", borderRadius: 10, padding: 32, width: 320 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: "#1B2340" }}>Chased</div>
        <div style={{ fontSize: 13, color: "#8A8F9E", marginTop: 2, marginBottom: 20 }}>Get paid on time. Every time.</div>

        <label style={labelStyle}>Email</label>
        <input style={inputStyle} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />

        <label style={labelStyle}>Password</label>
        <input style={inputStyle} type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />

        {error && <div style={{ color: "#E85D4E", fontSize: 13, marginTop: 10 }}>{error}</div>}
        {info && <div style={{ color: "#3F7855", fontSize: 13, marginTop: 10 }}>{info}</div>}

        <button type="submit" disabled={loading} style={{ marginTop: 18, width: "100%", background: "#1B2340", color: "#fff", border: "none", borderRadius: 8, padding: "12px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
          {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>

        <button type="button" onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); setInfo(""); }} style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#8A8F9E", fontSize: 13, cursor: "pointer" }}>
          {mode === "signup" ? "Already have an account? Sign in" : "New here? Create an account"}
        </button>
      </form>
    </div>
  );
}

export default function InvoiceApp() {
  const [accessToken, setAccessToken] = useState(null);
  const [view, setView] = useState("dashboard");
  const [copied, setCopied] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ brand: "", deliverable: "", amount: "", dueDate: "" });

  useEffect(() => {
    if (!accessToken) return;
    setLoading(true);
    fetchInvoices(accessToken)
      .then((data) => setInvoices(data))
      .catch(() => setLoadError("Couldn't load your invoices. Try refreshing."))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const totals = invoices.reduce(
    (acc, inv) => {
      const s = deriveStatus(inv);
      if (s !== "paid") acc.owed += Number(inv.amount);
      if (s === "overdue") acc.overdue += Number(inv.amount);
      return acc;
    },
    { owed: 0, overdue: 0 }
  );

  function handleCopy(id) {
    setCopied(id);
    setTimeout(() => setCopied(null), 1800);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.brand || !form.amount || !form.dueDate) return;
    try {
      const [created] = await createInvoice(accessToken, {
        brand: form.brand,
        deliverable: form.deliverable || "Sponsored content",
        amount: Number(form.amount),
        due_date: form.dueDate,
        status: "pending",
      });
      setInvoices([created, ...invoices]);
      setForm({ brand: "", deliverable: "", amount: "", dueDate: "" });
      setView("dashboard");
    } catch (err) {
      setLoadError("Couldn't save that invoice. Try again.");
    }
  }

  if (!accessToken) {
    return <AuthScreen onAuthed={setAccessToken} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "#EDEEF0", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "40px 20px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 24, fontWeight: 700, color: "#1B2340" }}>Chased</div>
            <div style={{ fontSize: 13, color: "#8A8F9E", marginTop: 2 }}>Get paid on time. Every time.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {view === "dashboard" && (
              <button onClick={() => setView("new")} style={{ display: "flex", alignItems: "center", gap: 6, background: "#1B2340", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                <Plus size={16} />
                New invoice
              </button>
            )}
            <button onClick={() => setAccessToken(null)} title="Sign out" style={{ display: "flex", alignItems: "center", background: "#fff", color: "#8A8F9E", border: "1px solid #D8DAE1", borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {loadError && <div style={{ color: "#E85D4E", fontSize: 13, marginBottom: 16 }}>{loadError}</div>}

        {view === "dashboard" ? (
          <>
            <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
              <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "#8A8F9E", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Owed to you</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "#1B2340", marginTop: 4 }}>${totals.owed.toLocaleString()}</div>
              </div>
              <div style={{ flex: 1, background: "#fff", borderRadius: 10, padding: "16px 18px" }}>
                <div style={{ fontSize: 12, color: "#E85D4E", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Overdue</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: "#E85D4E", marginTop: 4 }}>${totals.overdue.toLocaleString()}</div>
              </div>
            </div>

            {loading ? (
              <div style={{ color: "#8A8F9E", fontSize: 14 }}>Loading your invoices…</div>
            ) : invoices.length === 0 ? (
              <div style={{ background: "#fff", borderRadius: 10, padding: 32, textAlign: "center", color: "#8A8F9E", fontSize: 14 }}>
                No invoices yet. Click "New invoice" to send your first one.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {invoices.map((inv) => (
                  <Receipt key={inv.id} invoice={inv} onCopy={handleCopy} copied={copied} />
                ))}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleCreate} style={{ background: "#fff", borderRadius: 10, padding: 28 }}>
            <button type="button" onClick={() => setView("dashboard")} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "#8A8F9E", fontSize: 13, fontWeight: 600, cursor: "pointer", padding: 0, marginBottom: 20 }}>
              <ArrowLeft size={14} />
              Back to dashboard
            </button>

            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 20, fontWeight: 700, color: "#1B2340", marginBottom: 20 }}>New invoice</div>

            <label style={labelStyle}>Brand name</label>
            <input style={inputStyle} placeholder="e.g. Lumio Skincare" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />

            <label style={labelStyle}>Deliverable</label>
            <input style={inputStyle} placeholder="e.g. 1 sponsored Reel + 3 Stories" value={form.deliverable} onChange={(e) => setForm({ ...form, deliverable: e.target.value })} />

            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Amount ($)</label>
                <input style={inputStyle} type="number" placeholder="1800" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Due date</label>
                <input style={inputStyle} type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </div>
            </div>

            <button type="submit" style={{ marginTop: 12, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: "#1B2340", color: "#fff", border: "none", borderRadius: 8, padding: "13px 0", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              <Send size={15} />
              Create & generate payment link
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 12, fontWeight: 600, color: "#8A8F9E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, marginTop: 14 };
const inputStyle = { width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: 7, border: "1px solid #D8DAE1", fontSize: 14, color: "#1B2340", outline: "none", fontFamily: "inherit", backgroundColor: "#fff", colorScheme: "light" };
