"use client";

import { useEffect, useState } from "react";

interface Role {
  id: string;
  role: string;
  active: boolean;
  criteria: any;
  updated_at: string;
}

export default function AdminDashboard() {
  const [email, setEmail] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<"roles" | "candidates" | "calendar">("roles");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteCandidateConfirmId, setDeleteCandidateConfirmId] = useState<string | null>(null);

  // Advanced Dashboard State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [updatingCandidate, setUpdatingCandidate] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);
  const [recruitNoteCache, setRecruitNoteCache] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Form states
  const [newRoleName, setNewRoleName] = useState("");
  const [newJD, setNewJD] = useState("");
  const [newSkills, setNewSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [newWorkMode, setNewWorkMode] = useState<"remote" | "hybrid" | "onsite">("remote");
  const [newLocation, setNewLocation] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "iamkabshah@gmail.com" || email.endsWith("@brandivemedsols.com")) {
      setIsAuthenticated(true);
      fetchRoles();
      fetchCandidates();
    } else {
      setError("Access Denied. You are not authorized.");
    }
  };

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        headers: { "x-admin-email": email }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRoles(data.roles || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      const res = await fetch("/api/admin/candidates", {
        headers: { "x-admin-email": email }
      });
      const data = await res.json();
      if (res.ok) setCandidates(data.candidates || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAuthenticated) {
      interval = setInterval(() => {
        fetchCandidates();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isAuthenticated, activeTab]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({
          role: newRoleName,
          jd: newJD,
          required_skills: newSkills.join(","),
          work_mode: newWorkMode,
          location: newLocation
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setNewRoleName("");
      setNewJD("");
      setNewSkills([]);
      setSkillInput("");
      setNewWorkMode("remote");
      setNewLocation("");
      fetchRoles();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (id: string) => {
    try {
      const res = await fetch("/api/admin/roles", {
        method: "DELETE",
        headers: { 
          "Content-Type": "application/json",
          "x-admin-email": email
        },
        body: JSON.stringify({ id })
      });
      if (!res.ok) throw new Error("Failed to delete role");
      fetchRoles();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      const res = await fetch(`/api/candidate/${id}`, {
        method: "DELETE"
      });
      if (!res.ok) throw new Error("Failed to delete candidate");
      setCandidates(prev => prev.filter(c => c.id !== id));
      // Optionally also fetch to ensure full sync
      fetchCandidates();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleUpdateCandidate = async (id: string, updates: any) => {
    setUpdatingCandidate(true);
    try {
      const res = await fetch("/api/admin/candidates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ id, ...updates })
      });
      if (res.ok) {
        setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
        if (selectedCandidate && selectedCandidate.id === id) {
          setSelectedCandidate({ ...selectedCandidate, ...updates });
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingCandidate(false);
    }
  };

  const handleSendInvite = async (c: any) => {
    if (!c.email) {
      showToast("Error: Candidate has no email on file.");
      return;
    }
    setSendingInvite(true);
    try {
      const res = await fetch("/api/admin/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-email": email },
        body: JSON.stringify({ 
          to: c.email, 
          candidateName: c.full_name || "Candidate", 
          roleInterest: c.role_interest,
          candidateId: c.id
        })
      });
      if (res.ok) {
        showToast("Session Success: Interview invitation dispatched successfully.");
        handleUpdateCandidate(c.id, { 
          recruiter_notes: c.recruiter_notes ? c.recruiter_notes + `\n[${new Date().toLocaleDateString()}] Sent Interview Invite.` 
          : `[${new Date().toLocaleDateString()}] Sent Interview Invite.`,
          status: "qualified"
        });
      } else {
        const err = await res.json();
        showToast("Error: " + (err.error || "Failed to send email"));
      }
    } catch(e) {
      console.error(e);
      showToast("Error: Network or server error occurred.");
    } finally {
      setSendingInvite(false);
    }
  };

  const filteredCandidates = candidates.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (roleFilter !== "all" && c.role_interest?.toLowerCase().trim() !== roleFilter) return false;
    if (searchQuery) {
      const qs = searchQuery.toLowerCase();
      const matchName = c.full_name?.toLowerCase().includes(qs);
      const matchEmail = c.email?.toLowerCase().includes(qs);
      const matchSkill = c.skills?.some((s: string) => s.toLowerCase().includes(qs));
      if (!matchName && !matchEmail && !matchSkill) return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Role", "Experience", "Location", "Availability", "Score", "Status", "Needs Recruiter"];
    const rows = filteredCandidates.map(c => [
      `"${c.full_name || ''}"`, `"${c.email || ''}"`, `"${c.phone || ''}"`, `"${c.role_interest || ''}"`, 
      c.years_experience || 0, `"${c.location || ''}"`, `"${c.availability || ''}"`, c.score || 0, 
      `"${c.status || ''}"`, c.needs_recruiter ? 'Yes' : 'No'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `candidates_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f9f5f0] flex items-center justify-center p-6">
        <div className="bg-white p-10 rounded-[2rem] shadow-sm max-w-md w-full border border-surface-light">
          <h1 className="text-2xl font-display font-medium text-brand mb-6 text-center">HR Admin Login</h1>
          {error && <div className="bg-red-50 text-red-500 p-3 rounded-xl mb-4 text-sm text-center">{error}</div>}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              type="email" 
              placeholder="Enter your authorized email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-xl border border-surface-light focus:outline-none focus:border-brand/40"
              required
            />
            <button type="submit" className="bg-brand text-white py-3 rounded-xl font-medium hover:opacity-90">
              Access Dashboard
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF9F6] font-sans text-text-primary selection:bg-accent/20 flex flex-col">
      
      {/* Top Navbar */}
      <header className="border-b border-orange-100/50 bg-[#FDF9F6] sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 h-20 flex flex-col sm:flex-row items-center justify-between gap-4 py-4 sm:py-0">
          <div className="text-xl sm:text-2xl font-display font-bold text-brand shrink-0">
            RecruitChat <span className="text-accent">AI</span>
          </div>
          
          <nav className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 justify-center">
            <button 
              onClick={() => setActiveTab("roles")}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 ${
                activeTab === "roles" ? "bg-orange-50 text-accent border border-orange-200/60 shadow-[0_2px_10px_rgba(249,115,22,0.05)]" : "text-neutral-500 hover:bg-white hover:shadow-sm border border-transparent"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Manage Roles
            </button>
            <button 
              onClick={() => setActiveTab("candidates")}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 ${
                activeTab === "candidates" ? "bg-orange-50 text-accent border border-orange-200/60 shadow-[0_2px_10px_rgba(249,115,22,0.05)]" : "text-neutral-500 hover:bg-white hover:shadow-sm border border-transparent"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Submissions
              <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === "candidates" ? "bg-orange-200/50 text-accent" : "bg-neutral-100 text-neutral-500"}`}>
                {candidates.length}
              </span>
            </button>
            <button 
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all shrink-0 ${
                activeTab === "calendar" ? "bg-orange-50 text-accent border border-orange-200/60 shadow-[0_2px_10px_rgba(249,115,22,0.05)]" : "text-neutral-500 hover:bg-white hover:shadow-sm border border-transparent"
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              HR Calendar
            </button>
          </nav>
          
          <div className="hidden lg:flex items-center gap-2 text-sm font-medium text-neutral-600 bg-white/50 px-3 py-1.5 rounded-full border border-orange-50 transition-colors shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] ml-1"></span>
            <span className="px-1">{email}</span>
            
            <div className="w-[1px] h-4 bg-orange-200 mx-1"></div>
            
            <button 
              onClick={() => {
                setIsAuthenticated(false);
                setEmail("");
                window.location.href = "/";
              }}
              className="text-neutral-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-full transition-all flex items-center justify-center cursor-pointer"
              title="Logout and return to home"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 w-full flex-1">
        
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-[#FFF6F0] to-[#FFE8DA] border border-[#FFE1CD] rounded-[2rem] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between relative overflow-hidden mb-8 shadow-[0_8px_30px_rgba(249,115,22,0.03)]">
          <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
            <h2 className="text-3xl sm:text-4xl font-display font-medium text-[#1A2E46] mb-3">Welcome back</h2>
            <p className="text-[#5C6B7B] font-medium text-sm sm:text-base">Create and manage AI chatbot roles effortlessly.</p>
          </div>
          
          {/* Decorative Illustration */}
          <div className="relative z-0 md:absolute right-0 top-0 bottom-0 w-64 md:w-96 flex items-center justify-center opacity-90">
            {/* Background graphics/dots */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 grid grid-cols-4 gap-2 opacity-10">
              {[...Array(24)].map((_, i) => <div key={i} className="w-1.5 h-1.5 rounded-full bg-accent"></div>)}
            </div>
            
            {/* Floating cards */}
            <div className="relative shadow-2xl rounded-2xl bg-white p-6 rotate-12 translate-x-8 -translate-y-4 border border-orange-50 w-48 opacity-40">
               <div className="w-12 h-12 rounded-full bg-orange-100 mb-4"></div>
               <div className="h-2 w-full bg-orange-50 rounded-full mb-2"></div>
               <div className="h-2 w-2/3 bg-orange-50 rounded-full"></div>
            </div>
            <div className="absolute shadow-[0_20px_40px_rgba(249,115,22,0.1)] rounded-2xl bg-white p-6 -rotate-6 border border-orange-50 w-52 z-10">
               <div className="flex items-center gap-4 mb-6">
                 <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center shadow-lg shadow-accent/30 shrink-0">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                 </div>
                 <div className="flex-1">
                   <div className="h-2 w-full bg-[#FFE8DA] rounded-full mb-2"></div>
                   <div className="h-2 w-2/3 bg-[#FFE1CD] rounded-full"></div>
                 </div>
               </div>
               <div className="h-2 w-full bg-neutral-100 rounded-full mb-2"></div>
               <div className="h-2 w-4/5 bg-neutral-100 rounded-full mb-2"></div>
               <div className="h-2 w-5/6 bg-neutral-100 rounded-full"></div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-6 py-4 rounded-2xl mb-8 shadow-sm text-sm font-medium">
            Error: {error}
          </div>
        )}

        {activeTab === "roles" && (
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12">
            
            {/* Create New Role (Left Column) */}
            <div className="lg:col-span-4">
              <div className="bg-white rounded-[2rem] p-8 shadow-[0_8px_30px_rgba(249,115,22,0.04)] border border-orange-50">
                <div className="relative mb-8 pt-2">
                  <div className="absolute left-0 top-3 bottom-3 w-1.5 bg-accent rounded-full"></div>
                  <h3 className="text-xl font-display font-bold text-[#1A2E46] pl-5">Create New Role</h3>
                  <p className="text-xs text-neutral-500 mt-2 pl-5">Deploy a new role to the AI chatbot instantly.</p>
                </div>
                
                <form onSubmit={handleCreateRole} className="flex flex-col gap-5">
                  <div className="border-b border-neutral-100 mb-2 pb-4"></div>
                  <div>
                    <label htmlFor="roleTitle" className="block text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Role Title</label>
                    <input 
                      id="roleTitle"
                      type="text" 
                      placeholder="e.g. Senior Frontend Engineer" 
                      value={newRoleName}
                      onChange={(e) => setNewRoleName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAFAFA] border border-neutral-200 text-sm focus:outline-none focus:border-accent focus:bg-white transition-all text-[#1A2E46] font-medium placeholder:text-neutral-400"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="jobDescription" className="block text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Job Description</label>
                    <textarea 
                      id="jobDescription"
                      placeholder="Paste the core requirements, responsibilities, and nice-to-haves here..." 
                      value={newJD}
                      onChange={(e) => setNewJD(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-[#FAFAFA] border border-neutral-200 text-sm focus:outline-none focus:border-accent focus:bg-white transition-all min-h-[140px] resize-y text-[#1A2E46] font-medium leading-relaxed placeholder:text-neutral-400"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="roleSkills" className="block text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Required Skills</label>
                    <div className="w-full p-2 rounded-xl bg-[#FAFAFA] border border-neutral-200 flex flex-wrap gap-2 focus-within:border-accent focus-within:bg-white transition-all min-h-[46px] items-center">
                      {newSkills.map((skill, i) => (
                        <span key={i} className="flex items-center gap-1.5 text-xs font-semibold bg-white border border-neutral-200 text-[#1A2E46] px-2.5 py-1.5 rounded-lg shadow-sm">
                          {skill}
                          <button type="button" onClick={() => setNewSkills(newSkills.filter(s => s !== skill))} className="text-neutral-400 hover:text-red-500 font-bold ml-1 flex items-center justify-center p-0.5 rounded-full hover:bg-neutral-100 transition-colors">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </span>
                      ))}
                      <input 
                        id="roleSkills"
                        type="text" 
                        placeholder={newSkills.length === 0 ? "Type a skill & press Enter" : "Add another..."} 
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            const val = skillInput.trim().replace(/,/g, '');
                            if (val && !newSkills.includes(val)) {
                              setNewSkills([...newSkills, val]);
                            }
                            setSkillInput("");
                          }
                        }}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-[#1A2E46] font-medium placeholder:text-neutral-400 min-w-[120px] px-1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="workMode" className="block text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Work Mode</label>
                      <select 
                        id="workMode"
                        value={newWorkMode}
                        onChange={(e) => setNewWorkMode(e.target.value as any)}
                        className="w-full px-4 py-3 rounded-xl bg-[#FAFAFA] border border-neutral-200 text-sm focus:outline-none focus:border-accent focus:bg-white transition-all text-[#1A2E46] font-medium"
                      >
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="onsite">On-site</option>
                      </select>
                    </div>
                    {String(newWorkMode) !== "remote" && (
                      <div>
                        <label htmlFor="officeLocation" className="block text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-2">Office Location</label>
                        <input 
                          id="officeLocation"
                          type="text" 
                          placeholder="e.g. London" 
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-[#FAFAFA] border border-neutral-200 text-sm focus:outline-none focus:border-accent focus:bg-white transition-all text-[#1A2E46] font-medium placeholder:text-neutral-400"
                          required={newWorkMode !== "remote"}
                        />
                      </div>
                    )}
                  </div>
                  <button type="submit" disabled={loading} className="bg-gradient-to-r from-accent to-orange-400 text-white py-4 rounded-xl font-semibold hover:shadow-lg hover:shadow-orange-500/20 transition-all disabled:opacity-50 w-full mt-4 flex items-center justify-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    {loading ? "Publishing..." : "Publish to AI"}
                  </button>
                </form>
              </div>
            </div>

            {/* Active Positions (Right Column) */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              <div className="flex items-center justify-between px-2 pb-2">
                <div>
                  <h2 className="text-xl font-display font-bold text-[#1A2E46]">Active Positions</h2>
                  <p className="text-sm text-neutral-500 mt-1">Manage and monitor all roles currently live on the AI chatbot.</p>
                </div>
                <div className="bg-orange-50 text-accent font-semibold px-4 py-1.5 rounded-full text-sm border border-orange-100 shrink-0">
                  {roles.length} Total
                </div>
              </div>

              {roles.length === 0 && !loading && (
                <div className="bg-white/50 text-center rounded-[2rem] p-16 border border-dashed border-orange-200 text-neutral-500 shadow-sm flex flex-col items-center">
                  <p className="font-medium text-brand">No active positions</p>
                </div>
              )}
              
              <div className="flex flex-col gap-5">
                {roles.map(role => (
                  <div key={role.id} className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(249,115,22,0.03)] border-l-4 border-l-orange-200 border border-transparent hover:border-orange-100 hover:border-l-accent transition-all flex flex-col sm:flex-row justify-between gap-6 group">
                    <div className="flex gap-4 sm:gap-6 w-full">
                      
                      {/* Icon */}
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-50/50 flex items-center justify-center shrink-0 border border-blue-100/50">
                        <svg className="w-7 h-7 sm:w-8 sm:h-8 text-[#1A2E46]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      
                      {/* Details */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <h3 className="text-lg sm:text-xl font-display font-bold text-[#1A2E46] tracking-tight">{role.role}</h3>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border flex items-center gap-1.5 shrink-0 ${role.active ? 'bg-green-50 text-green-600 border-green-100' : 'bg-neutral-100 text-neutral-500 border-neutral-200'}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${role.active ? 'bg-green-500' : 'bg-neutral-400'}`}></span>
                            {role.active ? 'LIVE' : 'OFFLINE'}
                          </span>
                        </div>
                        
                        <div className="bg-[#FFFDFB] p-4 rounded-xl border border-[#F3EFEA] mb-4">
                           <p className="text-neutral-600 text-sm leading-relaxed line-clamp-2 pr-6">
                            {role.criteria?.description}
                           </p>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {role.criteria?.required_skills?.map((skill: string, i: number) => (
                            <span key={i} className="text-xs font-semibold bg-neutral-100 text-neutral-500 px-3 py-1.5 rounded-lg border border-neutral-200/50">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex sm:flex-col items-center justify-between sm:justify-start shrink-0 border-t sm:border-t-0 sm:border-l border-neutral-100 pt-4 sm:pt-0 sm:pl-6 relative">
                      
                      {/* Invisible on mobile, just for layout match */}
                      <div className="hidden sm:block absolute right-0 top-0 text-neutral-300">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </div>

                      <button 
                        onClick={() => setDeleteConfirmId(role.id)}
                        className="w-full sm:w-auto px-6 py-2 rounded-full text-sm font-bold transition-all bg-white text-accent border border-orange-200 hover:bg-orange-50 hover:border-accent flex items-center justify-center gap-2 sm:mt-10"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                      
                      <div className="text-center sm:mt-auto hidden sm:block">
                        <div className="text-[10px] text-neutral-400 font-medium uppercase mb-0.5">Updated</div>
                        <div className="text-xs text-[#1A2E46] font-semibold">{new Date(role.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric"})}</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Empty Add Role Placholder */}
                <button
                  type="button"
                  onKeyDown={(e) => { if(e.key === 'Enter' || e.key === ' ') document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(); }}
                  onClick={() => { document.querySelector<HTMLInputElement>('input[type="text"]')?.focus(); }} 
                  className="w-full text-left border border-dashed border-orange-200 bg-orange-50/30 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-center gap-4 cursor-pointer hover:bg-orange-50/60 transition-colors mt-2"
                >
                   <div className="w-10 h-10 rounded-full bg-orange-100 text-accent flex items-center justify-center text-xl font-bold">+</div>
                   <div className="text-sm font-semibold text-[#1A2E46]">Add more roles to engage your AI chatbot better.</div>
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === "candidates" && (
          <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between px-2 pb-2">
              <div>
                <h2 className="text-xl font-display font-bold text-[#1A2E46]">Candidate Submissions</h2>
                <p className="text-sm text-neutral-500 mt-1">Review AI-screened candidates applying for active roles.</p>
              </div>
              <div className="bg-orange-50 text-accent font-semibold px-4 py-1.5 rounded-full text-sm border border-orange-100 shrink-0">
                {filteredCandidates.length} Total
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl flex flex-col md:flex-row gap-4 shadow-sm border border-orange-50 mb-2">
              <input type="text" placeholder="Search name, email, or skill..." className="flex-1 bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-accent" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-accent">
                <option value="all">All Statuses</option>
                <option value="qualified">Qualified</option>
                <option value="needs_review">Needs Review</option>
                <option value="rejected">Not a Fit</option>
              </select>
              <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="bg-neutral-50 px-4 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-accent max-w-[200px] capitalize">
                <option value="all">All Roles</option>
                {Array.from(new Set(roles.map(r => r.role).filter(Boolean).map(r => String(r).trim().toLowerCase()))).map((r: any) => (
                  <option key={r} value={r} className="capitalize">{r}</option>
                ))}
              </select>
              <button onClick={exportToCSV} className="bg-white border border-neutral-200 px-6 py-2.5 rounded-xl text-sm font-bold text-neutral-700 hover:bg-neutral-50 shrink-0 transition-colors">Export CSV</button>
            </div>
            
            {filteredCandidates.length === 0 && (
              <div className="bg-white/50 text-center rounded-[2rem] p-16 border border-dashed border-orange-200 text-neutral-500 shadow-sm flex flex-col items-center">
                <p className="font-medium text-brand">No submissions yet.</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredCandidates.map(candidate => {
                const match = candidate.recruiter_notes?.match(/INTERVIEW CONFIRMED:\s*(.+)/);
                const bookedSlot = match ? match[1].trim() : null;
                const meetMatch = candidate.recruiter_notes?.match(/\[Meet Link\]\s*(https:\/\/meet\.jit\.si\/[^\s]+)/);
                const meetLink = meetMatch ? meetMatch[1].trim() : null;

                return (
                 <div key={candidate.id} className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgba(249,115,22,0.03)] border border-orange-50 hover:border-orange-200 transition-colors flex flex-col h-full relative">
                  
                  {/* Absolutly positioned booked tag on the top of the card if slot exists */}
                  {bookedSlot && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center z-10 whitespace-nowrap overflow-hidden rounded-full shadow-md border border-[#1A2E46]">
                      <div className="bg-[#1A2E46] text-white text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 flex items-center gap-2">
                         <svg className="w-3.5 h-3.5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                         {bookedSlot.split(' ')[0]}&nbsp;{bookedSlot.split(' ').slice(1).join(' ')}
                      </div>
                      {meetLink && (
                        <a href={meetLink} target="_blank" rel="noreferrer" className="bg-green-600 hover:bg-green-500 transition-colors text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 border-l border-green-700/50">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                          Meet
                        </a>
                      )}
                    </div>
                  )}

                  <div className="flex items-start justify-between mb-5 mt-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-[#1A2E46] font-bold text-lg border border-blue-100">
                        {candidate.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                           <h3 className="text-lg font-display font-bold text-[#1A2E46] leading-none">{candidate.full_name || "Unknown"}</h3>
                           {new Date(candidate.created_at || Date.now()).getTime() > Date.now() - 172800000 && candidate.status === 'needs_review' && (
                             <span className="bg-red-500 text-white text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm animate-pulse whitespace-nowrap">Needs Review</span>
                           )}
                        </div>
                        <p className="text-neutral-500 text-xs font-semibold tracking-wide uppercase">{candidate.role_interest || "Undefined Role"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                       {candidate.recruiter_notes?.includes("Interview Invite") && (
                          <div className="bg-blue-50 text-blue-700 text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full border border-blue-200 shadow-sm hidden md:flex">
                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                             Invite Sent
                          </div>
                       )}
                       {candidate.recruiter_notes?.includes("Marked as Contacted") && !candidate.recruiter_notes?.includes("Interview Invite") && (
                          <div className="bg-green-50 text-green-700 text-[10px] items-center gap-1.5 font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full border border-green-200 shadow-sm hidden md:flex">
                             <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                             Contacted
                          </div>
                       )}
                       <button
                         onClick={() => setDeleteCandidateConfirmId(candidate.id)}
                         className="text-neutral-400 hover:text-red-500 transition-colors p-2"
                         title="Delete Candidate"
                       >
                         <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                         </svg>
                       </button>
                    </div>
                  </div>
                  
                  <div className="bg-[#FFFDFB] rounded-xl p-4 mb-5 border border-[#F3EFEA] flex-1">
                    <div className="flex items-center justify-between mb-3 border-b border-[#F3EFEA] pb-3">
                      <div className="flex flex-col">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Match Score</span>
                         <span className={`text-3xl font-black ${
                           candidate.status === 'qualified' ? 'text-green-600' :
                           candidate.status === 'rejected' ? 'text-red-500' :
                           'text-orange-500'
                         }`}>{candidate.score || 0}<span className="text-xs font-bold text-neutral-300 ml-0.5">/100</span></span>
                      </div>
                      <div className="flex flex-col items-end">
                         <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-2">Status</span>
                         <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                           candidate.status === 'qualified' ? 'bg-green-50 text-green-700 border-green-200 shadow-[0_0_10px_rgba(34,197,94,0.1)]' : 
                           candidate.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' : 
                           'bg-orange-50 text-orange-700 border-orange-200 shadow-[0_0_10px_rgba(249,115,22,0.1)]'
                         }`}>
                           {candidate.status.replace("_", " ")}
                         </span>
                      </div>
                    </div>
                    <p className="text-[#1A2E46] text-sm leading-relaxed line-clamp-4 font-medium opacity-90">"{candidate.reason || "No feedback generated."}"</p>
                  </div>
                  
                  {/* Candidate Data Grid */}
                  <div className="grid grid-cols-2 gap-y-4 gap-x-2 mb-6 bg-neutral-50/50 p-4 rounded-xl border border-neutral-100/60">
                    {candidate.email && (
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">Email</span>
                        <span className="font-medium text-[#1A2E46] text-sm truncate" title={candidate.email}>{candidate.email}</span>
                      </div>
                    )}
                    {candidate.phone && (
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">Phone</span>
                        <span className="font-medium text-[#1A2E46] text-sm truncate">{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.location && (
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">Location</span>
                        <span className="font-medium text-[#1A2E46] text-sm truncate capitalize" title={candidate.location}>{candidate.location}</span>
                      </div>
                    )}
                    {candidate.years_experience !== undefined && candidate.years_experience !== null && (
                      <div className="flex flex-col">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">Experience</span>
                        <span className="font-medium text-[#1A2E46] text-sm">{candidate.years_experience} Years</span>
                      </div>
                    )}
                    {candidate.availability && (
                      <div className="flex flex-col col-span-2">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-0.5">Availability</span>
                        <span className="font-medium text-[#1A2E46] text-sm capitalize">{candidate.availability.replace(/_/g, ' ')}</span>
                      </div>
                    )}
                    {candidate.skills && Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
                      <div className="flex flex-col col-span-2 pt-1 border-t border-neutral-200/50 mt-1">
                        <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider mb-2 mt-2">Key Skills</span>
                        <div className="flex flex-wrap gap-1.5">
                          {candidate.skills.map((skill: string, index: number) => (
                            <span key={index} className="px-2 py-1 text-[10px] font-bold tracking-wide text-brand bg-white border border-neutral-200 rounded-md shadow-sm">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col mt-auto w-full">
                    <button 
                      onClick={() => { setSelectedCandidate(candidate); setRecruitNoteCache(candidate.recruiter_notes || ""); }} 
                      className="bg-[#1A2E46] text-white w-full py-2.5 rounded-full text-sm font-bold shadow-sm hover:opacity-90 transition-all mb-3 text-center"
                    >
                      View Profile & Notes
                    </button>
                    {candidate.resume_url ? (
                      <a 
                        href={candidate.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-white text-accent w-full py-2.5 rounded-full text-sm font-bold border border-orange-200 hover:bg-orange-50 transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        View Secure Resume
                      </a>
                    ) : (
                      <div className="w-full py-2.5 rounded-full text-sm font-bold text-neutral-400 bg-neutral-100 flex items-center justify-center border border-neutral-200">
                        No Resume Attached
                      </div>
                    )}
                  </div>
                </div>
              );
              })}
            </div>
          </div>
        )}

        {activeTab === "calendar" && (
          <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto">
            <div className="flex items-center justify-between px-2 pb-2">
              <div>
                <h2 className="text-xl font-display font-bold text-[#1A2E46]">Upcoming Interviews</h2>
                <p className="text-sm text-neutral-500 mt-1">A consolidated view of all candidates who have confirmed their slots.</p>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-orange-50 shadow-[0_8px_30px_rgba(249,115,22,0.03)] p-8">
               {(() => {
                 const scheduledCandidates = candidates
                   .map(c => {
                     const match = c.recruiter_notes?.match(/INTERVIEW CONFIRMED:\s*(.+)/);
                     const meetMatch = c.recruiter_notes?.match(/\[Meet Link\]\s*(https:\/\/meet\.jit\.si\/[^\s]+)/);
                     return match ? { 
                       ...c, 
                       bookedSlot: match[1].trim(),
                       meetLink: meetMatch ? meetMatch[1].trim() : null
                     } : null;
                   })
                   .filter(Boolean);

                 if (scheduledCandidates.length === 0) {
                   return (
                     <div className="text-center py-12 flex flex-col items-center">
                       <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-300 mb-4 border border-neutral-100">
                         <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       <p className="font-bold text-[#1A2E46] text-lg">No interviews scheduled yet</p>
                       <p className="text-neutral-500 text-sm mt-1">When candidates confirm a slot, they will appear here.</p>
                     </div>
                   );
                 }

                 return (
                   <div className="flex flex-col gap-4">
                     {scheduledCandidates.map(c => (
                       <div key={c!.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-neutral-50 border border-neutral-100 hover:border-orange-200 transition-colors">
                         <div className="flex items-center gap-4 mb-4 sm:mb-0">
                           <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-[#1A2E46] font-bold text-lg border border-neutral-200 shadow-sm shrink-0">
                             {c?.full_name?.charAt(0) || "?"}
                           </div>
                           <div>
                             <h4 className="font-bold text-[#1A2E46]">{c!.full_name}</h4>
                             <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">{c!.role_interest}</p>
                           </div>
                         </div>
                         <div className="flex items-center gap-4 w-full sm:w-auto">
                           <div className="bg-white border-2 border-accent/20 px-4 py-2 rounded-xl flex items-center gap-3 w-full sm:w-auto text-sm font-bold text-[#1A2E46]">
                              <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              {c!.bookedSlot}
                           </div>
                           {c!.meetLink && (
                             <a href={c!.meetLink} target="_blank" rel="noreferrer" className="bg-green-100/50 text-green-700 px-4 py-2 rounded-xl text-sm font-bold border border-green-200 hover:bg-green-100 transition-colors flex items-center gap-2">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                               Join Call
                             </a>
                           )}
                           <button onClick={() => { setSelectedCandidate(c); setRecruitNoteCache(c!.recruiter_notes || ""); setActiveTab("candidates"); }} className="hidden sm:flex bg-[#1A2E46] text-white p-2.5 rounded-xl hover:opacity-90">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                           </button>
                         </div>
                       </div>
                     ))}
                   </div>
                 );
               })()}
            </div>
          </div>
        )}
      </main>
      
      {/* Footer */}
      <footer className="border-t border-orange-100/50 mt-auto py-6">
         <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-neutral-500">
            <div>© 2026 RecruitChat AI. All rights reserved.</div>
            <div>Built with <span className="text-red-500">♥</span> for smarter hiring</div>
         </div>
      </footer>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A2E46]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-orange-50">
            <h3 className="text-xl font-display font-bold text-[#1A2E46] mb-2">Delete this role?</h3>
            <p className="text-neutral-500 text-sm mb-8 leading-relaxed font-medium">
              This action cannot be undone. The AI will immediately stop offering this role to candidates.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)} 
                className="flex-1 px-4 py-3 rounded-xl bg-neutral-100 text-[#1A2E46] font-bold hover:bg-neutral-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => { deleteRole(deleteConfirmId); setDeleteConfirmId(null); }} 
                className="flex-1 px-4 py-3 rounded-xl bg-red-50 text-red-500 font-bold border border-red-200 hover:bg-red-500 hover:text-white transition-colors text-sm"
              >
                Delete Role
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Candidate Delete Confirmation Modal */}
      {deleteCandidateConfirmId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A2E46]/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 border border-orange-50">
            <h3 className="text-xl font-display font-bold text-[#1A2E46] mb-2">Delete candidate?</h3>
            <p className="text-neutral-500 text-sm mb-8 leading-relaxed font-medium">
              This action cannot be undone. It will permanently remove their application and securely delete any uploaded resume.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteCandidateConfirmId(null)} 
                className="flex-1 px-4 py-3 rounded-xl bg-neutral-100 text-[#1A2E46] font-bold hover:bg-neutral-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={() => { deleteCandidate(deleteCandidateConfirmId); setDeleteCandidateConfirmId(null); }} 
                className="flex-1 px-4 py-3 rounded-xl bg-red-50 text-red-500 font-bold border border-red-200 hover:bg-red-500 hover:text-white transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transcript & Override Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4">
           <button 
             type="button"
             className="absolute inset-0 w-full h-full outline-none border-none cursor-pointer bg-[#1A2E46]/60 backdrop-blur-sm" 
             onClick={() => setSelectedCandidate(null)}
             onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter') setSelectedCandidate(null); }}
           >
             <span className="sr-only">Close Modal</span>
           </button>
           <div className="bg-white w-full max-w-5xl max-h-[92vh] sm:h-[90vh] rounded-[2rem] shadow-2xl relative z-10 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-orange-100">
              <div className="p-5 sm:p-7 border-b border-neutral-100 flex justify-between items-start bg-neutral-50/50">
                 <div>
                    <h2 className="text-xl sm:text-2xl font-display font-bold text-[#1A2E46] mb-1">{selectedCandidate.full_name}</h2>
                    <p className="text-xs sm:text-sm font-semibold text-neutral-500 uppercase tracking-widest">{selectedCandidate.role_interest}</p>
                 </div>
                 <button onClick={() => setSelectedCandidate(null)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-neutral-400 hover:text-red-500 shadow-sm border border-neutral-200 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                 </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-7 flex flex-col lg:flex-row gap-6 sm:gap-8">
                 {/* Left Col: Details & Notes */}
                 <div className="flex-1 flex flex-col gap-6">
                    <div>
                       <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-3">Recruiter Actions</h3>
                       <div className="flex flex-wrap gap-2 mb-4">
                          <button disabled={updatingCandidate} onClick={() => handleUpdateCandidate(selectedCandidate.id, { status: "qualified" })} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${selectedCandidate.status === 'qualified' ? 'bg-green-500 text-white border-green-600' : 'bg-white text-neutral-600 hover:bg-green-50 border-neutral-200'}`}>Mark Qualified</button>
                          <button disabled={updatingCandidate} onClick={() => handleUpdateCandidate(selectedCandidate.id, { status: "needs_review" })} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${selectedCandidate.status === 'needs_review' ? 'bg-orange-500 text-white border-orange-600' : 'bg-white text-neutral-600 hover:bg-orange-50 border-neutral-200'}`}>Needs Review</button>
                          <button disabled={updatingCandidate} onClick={() => handleUpdateCandidate(selectedCandidate.id, { status: "rejected" })} className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${selectedCandidate.status === 'rejected' ? 'bg-red-500 text-white border-red-600' : 'bg-white text-neutral-600 hover:bg-red-50 border-neutral-200'}`}>Not a Fit</button>
                       </div>
                       <div className="bg-orange-50/50 p-4 sm:p-5 rounded-2xl border border-orange-100 placeholder-neutral-400">
                          <h4 className="text-xs font-bold text-[#1A2E46] mb-2">Internal Notes</h4>
                          <textarea 
                             placeholder="Add internal recruiter notes, feedback, or flags here..."
                             className="w-full bg-white border border-orange-200 rounded-xl p-3 text-sm focus:outline-accent resize-none h-24 sm:h-32 mb-3"
                             value={recruitNoteCache}
                             onChange={(e) => setRecruitNoteCache(e.target.value)}
                          />
                          <div className="flex flex-wrap gap-2">
                             <button disabled={updatingCandidate} onClick={() => { handleUpdateCandidate(selectedCandidate.id, { recruiter_notes: recruitNoteCache }); }} className="bg-accent text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm">Save Notes</button>
                             <button disabled={sendingInvite} onClick={() => handleSendInvite(selectedCandidate)} className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
                               {sendingInvite ? "Sending..." : "📧 Email Schedule Invite"}
                             </button>
                             <button onClick={() => { const d = new Date().toLocaleDateString(); const update = (recruitNoteCache ? recruitNoteCache + "\n" : "") + `[${d}] Marked as Contacted.`; handleUpdateCandidate(selectedCandidate.id, { recruiter_notes: update }); setRecruitNoteCache(update); }} className="bg-white text-neutral-600 border border-neutral-200 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-neutral-50 transition-colors flex items-center gap-1.5"><svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Mark Contacted</button>
                          </div>
                          {updatingCandidate && <div className="text-xs text-brand font-medium mt-2 animate-pulse">Saving changes...</div>}
                       </div>
                    </div>
                    {selectedCandidate.score_breakdown && (
                       <div>
                          <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-3">Score Breakdown (Advanced)</h3>
                          <pre className="bg-[#1A2E46] text-blue-50 p-5 rounded-2xl text-xs overflow-x-auto shadow-inner">
                             {JSON.stringify(selectedCandidate.score_breakdown, null, 2)}
                          </pre>
                       </div>
                    )}
                 </div>
                 {/* Right Col: Transcript */}
                 <div className="flex-1 flex flex-col min-h-[300px] h-full">
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#1A2E46] mb-3">Live Transcript</h3>
                    <div className="flex-1 bg-neutral-50 rounded-2xl border border-neutral-200 p-4 overflow-y-auto flex flex-col gap-4 shadow-inner relative max-h-[800px] lg:max-h-none">
                       {selectedCandidate.transcript && selectedCandidate.transcript.length > 0 ? (
                           selectedCandidate.transcript.map((msg: any, i: number) => (
                              <div key={i} className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed ${msg.role === 'bot' ? 'bg-white border border-neutral-200 text-neutral-700 self-start shadow-sm rounded-tl-sm' : 'bg-accent text-white self-end shadow-sm shadow-accent/20 rounded-tr-sm'}`}>
                                 {msg.content}
                              </div>
                           ))
                       ) : (
                          <div className="text-neutral-400 text-sm font-medium flex flex-col items-center justify-center h-full gap-2 opacity-60">
                             <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                             Transcript not available
                          </div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Polished Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[400] bg-white text-[#1A2E46] px-5 py-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-neutral-100 flex items-center gap-3 animate-in slide-in-from-top-4 slide-in-from-right-4 fade-in duration-300 pointer-events-none font-semibold text-sm">
          <span className={`flex items-center justify-center w-7 h-7 rounded-full text-lg ${toastMessage.startsWith("Error") ? "bg-red-50 text-red-500" : "bg-green-50 text-green-500"}`}>
             {toastMessage.startsWith("Error") ? "⚠️" : (
               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
             )}
          </span>
          {toastMessage.replace("Error: ", "").replace("Session Success: ", "")}
        </div>
      )}
    </div>
  );
}
