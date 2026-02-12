import React, { useState, useEffect } from "react";
import { FaPlus } from "react-icons/fa";
import { storeUid, secDefaultPagesForRole } from "../utils/helpers";
import { APP_PAGES } from "../data/constants";

const ROLE_LIST = ["admin", "manager", "front_office", "housekeeping", "store_keeper", "accountant", "viewer"];

// ================= MAIN WRAPPER =================
export default function SecurityManager({ 
  supabaseEnabled, 
  supabase, 
  currentUser, 
  users, 
  setUsers, 
  onLogout 
}) {
  if (supabaseEnabled) {
    return <SupabaseSecurityManager supabase={supabase} currentUser={currentUser} />;
  }
  return (
    <LocalSecurityManager 
      users={users} 
      setUsers={setUsers} 
      currentUser={currentUser} 
      onLogout={onLogout} 
    />
  );
}

// ================= 1. LOCAL SECURITY =================
function LocalSecurityManager({ users, setUsers, currentUser, onLogout }) {
  const isAdmin = (currentUser?.username || "") === "admin";
  const [selectedId, setSelectedId] = useState(users?.[0]?.id || "");
  
  useEffect(() => { 
    if (!selectedId && users?.[0]?.id) setSelectedId(users[0].id); 
  }, [users, selectedId]);
  
  const selected = (users || []).find((u) => u.id === selectedId) || (users || [])[0];

  const updateUser = (id, patch) => { 
    const next = (users || []).map((u) => (u.id === id ? { ...u, ...patch } : u)); 
    setUsers(next); 
  };
  
  const addUser = () => { 
    const nu = { id: storeUid("u"), username: `user${(users?.length || 0) + 1}`, pin: "0000", allowedPages: ["dashboard"] }; 
    setUsers([nu, ...(users || [])]); 
    setSelectedId(nu.id); 
  };
  
  const deleteUser = (id) => { 
    if ((users || []).length <= 1) return; 
    const u = (users || []).find((x) => x.id === id); 
    if (!u || u.username === "admin") return alert("Cannot delete admin."); 
    setUsers((prev) => prev.filter((x) => x.id !== id)); 
  };
  
  const togglePage = (pageKey) => { 
    if (!selected) return; 
    const cur = selected.allowedPages || []; 
    const next = cur.includes(pageKey) ? cur.filter((x) => x !== pageKey) : [...cur, pageKey]; 
    updateUser(selected.id, { allowedPages: next }); 
  };

  return (
    <div className="card panel" style={{ marginTop: 14 }}>
      <div className="cardHead">
        <div><div className="cardTitle">Security</div><div className="cardSub">Users & page permissions</div></div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="pill pill--green">Logged: {currentUser?.username || "—"}</span><button className="btn btn--ghost" onClick={onLogout}>Lock / Logout</button></div>
      </div>
      {!isAdmin ? <div className="emptyState">Read only (Admin only)</div> : (
        <div className="securityGrid">
          <div className="securityUsersList">
            <div className="securityUsersHeader"><div style={{ fontWeight: 950 }}>Users</div><button className="btn btn--mini" onClick={addUser}><FaPlus /> Add</button></div>
            {(users || []).map((u) => (
              <div key={u.id} className={`securityUserRow ${u.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(u.id)}>
                <div style={{ display: "grid", gap: 2 }}><div style={{ fontWeight: 950 }}>{u.username}</div><div style={{ fontSize: 12, opacity: 0.7 }}>{(u.allowedPages || []).length} pages {u.username === "admin" && <span className="pill pill--amber">Admin</span>}</div></div>
                {u.username !== "admin" && <button className="btn btn--mini btn--danger" onClick={(e) => { e.stopPropagation(); deleteUser(u.id); }}>Delete</button>}
              </div>
            ))}
          </div>
          <div className="securityEditor">
            {selected ? (
              <>
                <div className="securityFields">
                  <div className="securityFieldCard"><div className="label">Username</div><input className="input" value={selected.username || ""} onChange={(e) => updateUser(selected.id, { username: e.target.value })} disabled={selected.username === "admin"} /></div>
                  <div className="securityFieldCard"><div className="label">PIN</div><input className="input" type="password" value={selected.pin || ""} onChange={(e) => updateUser(selected.id, { pin: e.target.value })} /></div>
                </div>
                <div style={{ marginTop: 12 }}><div className="label" style={{ marginBottom: 10 }}>Allowed Pages</div>
                  <div className="securityChecks">
                    {APP_PAGES.map((p) => (
                      <label key={p.key} className="securityCheckItem"><input type="checkbox" checked={(selected.allowedPages || []).includes(p.key)} onChange={() => togglePage(p.key)} /><span>{p.label}</span></label>
                    ))}
                  </div>
                </div>
              </>
            ) : <div className="emptyState">Select a user</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= 2. SUPABASE SECURITY =================
function SupabaseSecurityManager({ supabase, currentUser }) {
  const isAdmin = String(currentUser?.role || "") === "admin";
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  const load = async () => { 
    if (!supabase) return; 
    setLoading(true); 
    try { 
      const { data } = await supabase.from("app_users").select("*").order("email"); 
      setRows(data || []); 
      if (!selectedId && data?.[0]) setSelectedId(data[0].id); 
    } finally { setLoading(false); } 
  };
  
  useEffect(() => { load(); }, [supabase]);
  const selected = rows.find((r) => r.id === selectedId);

  const patchRow = async (id, patch) => { 
    if (!supabase) return; 
    setLoading(true); 
    try { 
      await supabase.from("app_users").update(patch).eq("id", id); 
      await load(); 
    } finally { setLoading(false); } 
  };
  
  const toggleAllowedPage = (pageKey) => { 
    if (!selected) return; 
    const cur = selected.allowed_pages || []; 
    const next = cur.includes(pageKey) ? cur.filter((x) => x !== pageKey) : [...cur, pageKey]; 
    patchRow(selected.id, { allowed_pages: next }); 
  };

  return (
    <div className="card panel" style={{ marginTop: 14 }}>
      <div className="cardHead"><div><div className="cardTitle">Security</div><div className="cardSub">Users, roles & page permissions (Supabase)</div></div><div style={{ display: "flex", gap: 10, alignItems: "center" }}><span className="pill pill--green">Logged: {currentUser?.email || "—"}</span></div></div>
      {!isAdmin ? <div className="emptyState">Read only</div> : (
        <div className="securityGrid">
          <div className="securityUsersList">
            <div className="securityUsersHeader"><div style={{ fontWeight: 950 }}>Users</div><button className="btn btn--mini" onClick={load} disabled={loading}>Refresh</button></div>
            {rows.map((u) => (
              <div key={u.id} className={`securityUserRow ${u.id === selectedId ? "active" : ""}`} onClick={() => setSelectedId(u.id)}>
                <div style={{ display: "grid", gap: 2 }}><div style={{ fontWeight: 950 }}>{u.full_name || u.email}</div><div style={{ fontSize: 12, opacity: 0.7 }}>{(u.allowed_pages || []).length} pages {u.role === "admin" && <span className="pill pill--amber">Admin</span>}</div></div>
              </div>
            ))}
          </div>
          <div className="securityEditor">
            {selected ? (
              <div className="securityFields">
                <div className="securityFieldCard"><div className="label">Full Name</div><input className="input" value={selected.full_name || ""} onChange={(e) => setRows(prev => prev.map(r => r.id === selected.id ? { ...r, full_name: e.target.value } : r))} onBlur={() => patchRow(selected.id, { full_name: selected.full_name })} /></div>
                <div className="securityFieldCard"><div className="label">Role</div><select className="input" value={selected.role || "viewer"} onChange={(e) => patchRow(selected.id, { role: e.target.value })}>{ROLE_LIST.map((r) => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="securityFieldCard field--full"><div className="label">Allowed Pages</div>
                  <div className="securityChecks">{APP_PAGES.map((p) => (<label key={p.key} className="securityCheckItem"><input type="checkbox" checked={(selected.allowed_pages || []).includes(p.key)} onChange={() => toggleAllowedPage(p.key)} /><span>{p.label}</span></label>))}</div>
                  <div style={{ marginTop: 10 }}><button className="btn btn--mini" onClick={() => patchRow(selected.id, { allowed_pages: secDefaultPagesForRole(selected.role) })}>Apply role defaults</button></div>
                </div>
              </div>
            ) : <div className="emptyState">No users found</div>}
          </div>
        </div>
      )}
    </div>
  );
}