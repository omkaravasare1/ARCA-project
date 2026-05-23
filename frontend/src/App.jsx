import { useState, useEffect, useRef } from "react";

const API = "http://localhost:8000";

const PALETTES = {
dark: {
  bg: "#060910", surface: "#0c1018", card: "#111820", border: "#1a2636",
  accent: "#00b4d8", accentDim: "#0099bb", green: "#00c97b", amber: "#f0a500",
  red: "#e63946", purple: "#8b5cf6", text: "#dfe8f5", muted: "#5a7a99",
  subtle: "#0f1a24", shadow: "rgba(0,0,0,.28)", input: "#0c131d",
},
light: {
  bg: "#f5f7fb", surface: "#ffffff", card: "#ffffff", border: "#d8e0ea",
  accent: "#0077a3", accentDim: "#006487", green: "#087f5b", amber: "#b7791f",
  red: "#c92a2a", purple: "#6d3fd1", text: "#172033", muted: "#64748b",
  subtle: "#eef3f8", shadow: "rgba(15,23,42,.08)", input: "#f8fafc",
},
};
let C = PALETTES.dark;

const SEV = { CRITICAL: C.red, HIGH: C.amber, MEDIUM: C.accent, LOW: C.green };
const STA = { PENDING: C.amber, IN_PROGRESS: C.accent, COMPLETED: C.green };
const DEPT_C = {
  Compliance: C.accent, IT: C.purple, Operations: C.green, AML: C.amber,
  Legal: "#ff6b6b", Product: "#06d6a0", HR: "#ffd166", "IT Security": C.red,
};

// ── SVG Icon Set ──
const I = {
  grid: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  file: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  cpu: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>,
  msg: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  shield: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  alert: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  clock: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  check: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  user: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  building: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="9" y1="6" x2="9" y2="6.01"/><line x1="15" y1="6" x2="15" y2="6.01"/><line x1="9" y1="10" x2="9" y2="10.01"/><line x1="15" y1="10" x2="15" y2="10.01"/><line x1="9" y1="14" x2="9" y2="14.01"/><line x1="15" y1="14" x2="15" y2="14.01"/><path d="M9 18h6"/></svg>,
  refresh: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  pin: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z"/></svg>,
  book: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  upload: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>,
  eye: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>,
  sun: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>,
  moon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A8.5 8.5 0 1111.2 3 6.5 6.5 0 0021 12.8z"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>,
};

const MOCK = [
  { id:"RBI-2025-001", title:"RBI Master Direction – KYC (Amendment) 2025", source:"RBI", date:"2025-03-15", severity:"HIGH", status:"PENDING", url:"https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12865",
    summary:"Updated KYC norms mandate re-verification of existing customers within 90 days for high-risk categories. New digital KYC channels must comply with updated Aadhaar OTP standards.",
    maps:[{dept:"Compliance",task:"Update KYC policy documentation",due:"2025-04-15",priority:"HIGH"},{dept:"IT",task:"Upgrade digital KYC API to Aadhaar v2",due:"2025-04-30",priority:"HIGH"},{dept:"Operations",task:"Initiate re-verification campaign for high-risk customers",due:"2025-05-30",priority:"MEDIUM"}] },
  { id:"SEBI-2025-012", title:"SEBI Circular – Cybersecurity Framework for Banks", source:"SEBI", date:"2025-04-01", severity:"CRITICAL", status:"IN_PROGRESS", url:"https://www.sebi.gov.in/legal/circulars/mar-2025/extension-towards-adoption-and-implementation-of-cybersecurity-and-cyber-resilience-framework-cscrf-for-sebi-regulated-entities-res-_93146.html",
    summary:"Banks must implement a comprehensive cybersecurity framework including SOC, VAPT, and zero-trust architecture by Q3 2025. Annual audit mandatory.",
    maps:[{dept:"IT Security",task:"Establish 24x7 SOC operations",due:"2025-06-01",priority:"CRITICAL"},{dept:"IT",task:"Conduct VAPT on all customer-facing systems",due:"2025-05-15",priority:"HIGH"},{dept:"Compliance",task:"File framework adoption declaration",due:"2025-07-01",priority:"MEDIUM"},{dept:"HR",task:"Cybersecurity awareness training for all staff",due:"2025-06-30",priority:"LOW"}] },
  { id:"IFSCA-2025-003", title:"IFSCA – AML/CFT Guidelines Update", source:"IFSCA", date:"2025-02-20", severity:"HIGH", status:"COMPLETED",
    summary:"Enhanced due diligence requirements for cross-border transactions above USD 10,000. Suspicious transaction reporting window reduced from 7 days to 48 hours.",
    maps:[{dept:"AML",task:"Update STR reporting workflow to 48-hour SLA",due:"2025-03-20",priority:"HIGH"},{dept:"Operations",task:"Flag all cross-border transactions > USD 10,000 for EDD",due:"2025-03-15",priority:"HIGH"},{dept:"IT",task:"Update transaction monitoring rules engine",due:"2025-03-30",priority:"MEDIUM"}] },
  { id:"RBI-2025-007", title:"RBI – Digital Lending Guidelines Amendment", source:"RBI", date:"2025-04-10", severity:"MEDIUM", status:"PENDING",
    summary:"All digital lending apps must display APR prominently, provide cooling-off period of 3 days, and submit quarterly lending data to CRILC.",
    maps:[{dept:"Product",task:"Display APR prominently on all digital lending UIs",due:"2025-05-15",priority:"HIGH"},{dept:"Operations",task:"Implement 3-day cooling-off period process",due:"2025-05-15",priority:"HIGH"},{dept:"IT",task:"Build CRILC quarterly data submission module",due:"2025-06-01",priority:"MEDIUM"}] },
  { id:"MCA-2025-002", title:"MCA – DPDP Act Compliance for Financial Entities", source:"MCA", date:"2025-03-28", severity:"CRITICAL", status:"IN_PROGRESS",
    summary:"Digital Personal Data Protection Act mandates consent management, data localisation, and a Data Protection Officer appointment for all financial entities processing >10 lakh records.",
    maps:[{dept:"Legal",task:"Appoint Data Protection Officer",due:"2025-05-01",priority:"CRITICAL"},{dept:"IT",task:"Build consent management portal",due:"2025-06-30",priority:"HIGH"},{dept:"Compliance",task:"Conduct data audit and classify sensitive data",due:"2025-05-30",priority:"HIGH"},{dept:"IT",task:"Implement data localisation controls",due:"2025-07-31",priority:"MEDIUM"}] },
];

function Badge({label,color}){
  return <span style={{fontSize:10,fontWeight:700,letterSpacing:".5px",padding:"2px 8px",borderRadius:4,border:`1px solid ${color}55`,color,background:`${color}12`,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase"}}>{label}</span>;
}
function Spinner(){
  return <div style={{display:"flex",alignItems:"center",gap:8,color:C.accent}}>
    <div style={{width:14,height:14,border:`2px solid ${C.border}`,borderTop:`2px solid ${C.accent}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
    <span style={{fontSize:12,fontFamily:"'JetBrains Mono',monospace"}}>Processing</span>
  </div>;
}
function StatCard({label,value,sub,color,icon}){
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:"18px 22px",flex:1,minWidth:150,borderLeft:`3px solid ${color}`,transition:"transform .2s,box-shadow .2s",cursor:"default"}}
    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px ${color}15`}}
    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none"}}>
    <div style={{color,marginBottom:6}}>{icon}</div>
    <div style={{fontSize:26,fontWeight:800,color,fontFamily:"'JetBrains Mono',monospace"}}>{value}</div>
    <div style={{fontSize:12,color:C.text,fontWeight:600,marginTop:2}}>{label}</div>
    {sub&&<div style={{fontSize:11,color:C.muted,marginTop:4}}>{sub}</div>}
  </div>;
}

function DetailList({title,items,color}){
  const values=Array.isArray(items)?items:(items?[items]:[]);
  if(!values.length)return null;
  return <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
    <h4 style={{fontSize:12,fontWeight:800,color,marginBottom:10}}>{title}</h4>
    {values.map((x,i)=><div key={i} style={{fontSize:12,color:C.text,lineHeight:1.55,marginBottom:7,display:"flex",gap:8}}>
      <span style={{color,fontFamily:"'JetBrains Mono',monospace"}}>{i+1}.</span><span>{x}</span>
    </div>)}
  </div>;
}

export default function App(){
  const [theme,setTheme]=useState(()=>localStorage.getItem("arca-theme")||"dark");
  C = PALETTES[theme] || PALETTES.dark;
  const [tab,setTab]=useState("dashboard");
  const [regs,setRegs]=useState(MOCK);
  const [selected,setSelected]=useState(null);
  const [aiLoading,setAiLoading]=useState(false);
  const [aiOutput,setAiOutput]=useState("");
  const [chatHistory,setChatHistory]=useState([]);
  const [chatInput,setChatInput]=useState("");
  const [chatLoading,setChatLoading]=useState(false);
  const [fSev,setFSev]=useState("ALL");
  const [fSta,setFSta]=useState("ALL");
  const [fSrc,setFSrc]=useState("ALL");
  const [fetchLoading,setFetchLoading]=useState(false);
  const [notif,setNotif]=useState(null);
  const [evidence,setEvidence]=useState({});
  const [validating,setValidating]=useState({});
  const [uploading,setUploading]=useState({});
  const [selectedMap,setSelectedMap]=useState(null);
  const [selectedReg,setSelectedReg]=useState(null);
  const [analysisCache,setAnalysisCache]=useState({});
  const [aStatus,setAStatus]=useState("ALL");
  const [aDept,setADept]=useState("ALL");
  const [aRole,setARole]=useState("ALL");
  const [aSort,setASort]=useState("priority");
  const chatEnd=useRef(null);

  useEffect(()=>{
    fetch(`${API}/regulations`)
      .then(r=>r.ok?r.json():Promise.reject())
      .then(d=>{if(d.regulations?.length)setRegs(d.regulations)})
      .catch(()=>{});
  },[]);
  useEffect(()=>{chatEnd.current?.scrollIntoView({behavior:"smooth"})},[chatHistory]);
  useEffect(()=>{document.body.dataset.theme=theme;localStorage.setItem("arca-theme",theme)},[theme]);
  const notify=(msg,type="success")=>{setNotif({msg,type});setTimeout(()=>setNotif(null),3500)};

  const fetchLive=async()=>{
    setFetchLoading(true);
    try{const r=await fetch(`${API}/fetch-regulations`);if(r.ok){const d=await r.json();if(d.regulations?.length){setRegs(d.regulations);notify(`Synced ${d.regulations.length} regulations`)}}}
    catch{notify("Backend offline — showing demo data","warn")}
    setFetchLoading(false);
  };

  const analyseAI=async(reg)=>{
    setSelected(reg);setAiLoading(true);setAiOutput(analysisCache[reg.id]||reg.analysis||"");setTab("analysis");
    try{const r=await fetch(`${API}/regulations/${reg.id}/analyse`,{method:"POST"});
      const d=await r.json();const analysis=d.analysis||d;setAiOutput(analysis);setAnalysisCache(prev=>({...prev,[reg.id]:analysis}));setRegs(prev=>prev.map(x=>x.id===reg.id?{...x,analysis,analysis_generated_at:new Date().toISOString()}:x))}
    catch{setAiOutput(analysisCache[reg.id]||reg.analysis||{error:"AI analysis unavailable. Previous analysis preserved if available."})}
    setAiLoading(false);
  };

  const genMAPs=async(reg)=>{
    setSelected(reg);setAiLoading(true);setTab("maps");
    try{const r=await fetch(`${API}/regulations/${reg.id}/generate-maps`,{method:"POST"});
      const d=await r.json();if(d.maps?.length){setRegs(prev=>prev.map(x=>x.id===reg.id?{...x,maps:d.maps}:x));notify(d.preserved?`Preserved existing MAPs for ${reg.id}`:`Generated ${d.maps.length} MAPs for ${reg.id}`)}else{notify("No new MAPs returned; existing MAPs preserved","warn")}}
    catch{notify("MAP generation failed — using existing data","warn")}
    setAiLoading(false);
  };

  const validateMAP=async(regId,mapIndex)=>{
    const key=`${regId}:${mapIndex}`;
    const ev=(evidence[key]||"").trim();
    if(!ev){notify("Add evidence before validation","warn");return;}
    setValidating(prev=>({...prev,[key]:true}));
    try{
      const r=await fetch(`${API}/validate-map`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({regulation_id:regId,map_index:mapIndex,validated_by:"Compliance Reviewer",evidence:ev})});
      const d=await r.json();
      if(!r.ok) throw new Error(d.detail||"Validation failed");
      setRegs(prev=>prev.map(x=>x.id===regId?d.regulation:x));
      const ok=d.result?.validated;
      notify(ok?`MAP validated at ${d.result.confidence}% confidence`:"Validation found gaps","warn");
    }catch(err){
      notify(err.message||"Validation service unavailable","warn");
    }
    setValidating(prev=>({...prev,[key]:false}));
  };

  const uploadEvidence=async(regId,mapIndex,file)=>{
    if(!file)return;
    const key=`${regId}:${mapIndex}`;
    if(!file.type.startsWith("image/")){notify("Upload a PNG, JPG, JPEG, or WEBP screenshot","warn");return;}
    if(file.size>5*1024*1024){notify("Screenshot must be 5 MB or smaller","warn");return;}
    setUploading(prev=>({...prev,[key]:true}));
    try{
      const url=`${API}/maps/${encodeURIComponent(regId)}/${mapIndex}/evidence-upload?filename=${encodeURIComponent(file.name)}&uploaded_by=${encodeURIComponent("Compliance Reviewer")}`;
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":file.type},body:file});
      const d=await r.json();
      if(!r.ok) throw new Error(d.detail||"Screenshot upload failed");
      setRegs(prev=>prev.map(x=>x.id===regId?d.regulation:x));
      setEvidence(prev=>({...prev,[key]:d.map.evidence||prev[key]||""}));
      notify("Screenshot attached to MAP evidence");
    }catch(err){
      notify(err.message||"Screenshot upload failed","warn");
    }
    setUploading(prev=>({...prev,[key]:false}));
  };

  const sendChat=async()=>{
    if(!chatInput.trim())return;
    const userMsg={role:"user",content:chatInput};
    const hist=[...chatHistory,userMsg];
    setChatHistory(hist);setChatInput("");setChatLoading(true);
    try{const r=await fetch(`${API}/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:chatInput,history:hist.slice(-10)})});
      const d=await r.json();setChatHistory([...hist,{role:"assistant",content:d.reply}])}
    catch{setChatHistory([...hist,{role:"assistant",content:"AI service unavailable. Please verify backend connectivity."}])}
    setChatLoading(false);
  };

  const totalMAPs=regs.reduce((a,r)=>a+(r.maps?.length||0),0);
  const critical=regs.filter(r=>r.severity==="CRITICAL").length;
  const pending=regs.filter(r=>r.status==="PENDING").length;
  const completed=regs.filter(r=>r.status==="COMPLETED").length;
  const filtered=regs.filter(r=>(fSev==="ALL"||r.severity===fSev)&&(fSta==="ALL"||r.status===fSta)&&(fSrc==="ALL"||r.source===fSrc));
  const sources=[...new Set(regs.map(r=>r.source))];
  const deptLoad={};regs.forEach(r=>r.maps?.forEach(m=>{deptLoad[m.dept]=(deptLoad[m.dept]||0)+1}));
  const allAssignments=regs.flatMap(r=>(r.maps||[]).map((m,mapIndex)=>({...m,mapIndex,regId:r.id,regTitle:r.title,regSource:r.source,regUrl:r.url,regSeverity:r.severity,regDate:r.date})));
  const departments=[...new Set(allAssignments.map(m=>m.dept).filter(Boolean))].sort();
  const roles=[...new Set(allAssignments.map(m=>m.owner_role).filter(Boolean))].sort();
  const priorityRank={CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};
  const statusRank={NEEDS_FIX:0,IN_REVIEW:1,IN_PROGRESS:2,ASSIGNED:3,VALIDATED:4};
  const assignmentRows=allAssignments
    .filter(m=>(aStatus==="ALL"||(m.status||"ASSIGNED")===aStatus)&&(aDept==="ALL"||m.dept===aDept)&&(aRole==="ALL"||m.owner_role===aRole))
    .sort((a,b)=>{
      if(aSort==="status")return (statusRank[a.status||"ASSIGNED"]??9)-(statusRank[b.status||"ASSIGNED"]??9);
      if(aSort==="dept")return (a.dept||"").localeCompare(b.dept||"");
      if(aSort==="role")return (a.owner_role||"").localeCompare(b.owner_role||"");
      if(aSort==="due")return (a.due||"").localeCompare(b.due||"");
      return (priorityRank[a.priority||"MEDIUM"]??9)-(priorityRank[b.priority||"MEDIUM"]??9);
    });

  const NAV=[["dashboard","Dashboard",I.grid],["regulations","Regulations",I.file],["maps","MAPs",I.target],["assignments","Assignments",I.check],["analysis","AI Analysis",I.cpu],["chat","Chat",I.msg],["audit","Audit Log",I.shield]];

  return <div style={{background:C.bg,minHeight:"100vh",color:C.text,fontFamily:"'Inter',sans-serif",transition:"background .2s,color .2s"}}>
    {notif&&<div style={{position:"fixed",top:16,right:16,zIndex:999,background:notif.type==="warn"?C.amber:C.green,color:"#000",padding:"10px 18px",borderRadius:8,fontWeight:700,fontSize:13,animation:"fadeIn .3s ease",boxShadow:`0 4px 20px ${notif.type==="warn"?C.amber:C.green}40`}}>{notif.msg}</div>}

    {/* HEADER */}
    <header style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 32px",display:"flex",alignItems:"center",justifyContent:"space-between",height:60,position:"sticky",top:0,zIndex:100,backdropFilter:"blur(12px)"}}>
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{width:34,height:34,borderRadius:8,background:`linear-gradient(135deg,${C.accent}22,${C.purple}22)`,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent}}>{I.shield}</div>
        <div>
          <div style={{fontWeight:800,fontSize:15,letterSpacing:"-.3px",background:`linear-gradient(135deg,${C.accent},${C.purple})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>ARCA</div>
          <div style={{fontSize:9,color:C.muted,letterSpacing:"1.5px",fontFamily:"'JetBrains Mono',monospace",fontWeight:500}}>REGULATORY COMPLIANCE INTELLIGENCE</div>
        </div>
      </div>
      <nav style={{display:"flex",gap:2}}>
        {NAV.map(([k,l,ic])=><button key={k} onClick={()=>setTab(k)} style={{background:tab===k?`${C.accent}14`:"transparent",border:tab===k?`1px solid ${C.accent}44`:"1px solid transparent",color:tab===k?C.accent:C.muted,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600,transition:"all .15s",display:"flex",alignItems:"center",gap:6}}>{ic}{l}</button>)}
      </nav>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button title="Toggle theme" onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,width:34,height:34,borderRadius:7,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
          {theme==="dark"?I.sun:I.moon}
        </button>
        <button onClick={fetchLive} disabled={fetchLoading} style={{background:`${C.green}14`,border:`1px solid ${C.green}44`,color:C.green,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:11,display:"flex",alignItems:"center",gap:6,letterSpacing:".3px"}}>
          {fetchLoading?<Spinner/>:<>{I.refresh} Sync Live Data</>}
        </button>
      </div>
    </header>

    <main style={{padding:"24px 32px",maxWidth:1400,margin:"0 auto"}}>

      {/* ── DASHBOARD ── */}
      {tab==="dashboard"&&<div style={{animation:"fadeIn .3s ease"}}>
        <div style={{marginBottom:24}}>
          <h1 style={{fontSize:22,fontWeight:800,marginBottom:4,letterSpacing:"-.3px"}}>Compliance Operations Center</h1>
          <p style={{color:C.muted,fontSize:13}}>Real-time regulatory intelligence for Indian banking institutions</p>
        </div>
        <div style={{display:"flex",gap:14,marginBottom:24,flexWrap:"wrap"}}>
          <StatCard label="Total Regulations" value={regs.length} sub="Active monitoring" color={C.accent} icon={I.file}/>
          <StatCard label="Critical Alerts" value={critical} sub="Immediate action" color={C.red} icon={I.alert}/>
          <StatCard label="Pending Compliance" value={pending} sub="Action required" color={C.amber} icon={I.clock}/>
          <StatCard label="Completed" value={completed} sub="Validated" color={C.green} icon={I.check}/>
          <StatCard label="Total MAPs" value={totalMAPs} sub="Actionable tasks" color={C.purple} icon={I.target}/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1.6fr",gap:16}}>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
            <h3 style={{fontSize:13,fontWeight:700,marginBottom:16,letterSpacing:".2px"}}>Department Workload</h3>
            {Object.entries(deptLoad).sort((a,b)=>b[1]-a[1]).map(([d,c])=><div key={d} style={{marginBottom:12}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,fontWeight:600,color:DEPT_C[d]||C.text}}>{d}</span>
                <span style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:C.muted}}>{c} tasks</span>
              </div>
              <div style={{background:C.border,borderRadius:4,height:5}}>
                <div style={{background:DEPT_C[d]||C.accent,width:`${Math.min((c/totalMAPs)*100*3,100)}%`,height:"100%",borderRadius:4,transition:"width .6s ease"}}/>
              </div>
            </div>)}
          </div>

          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
            <h3 style={{fontSize:13,fontWeight:700,marginBottom:16,letterSpacing:".2px"}}>Recent Regulatory Updates</h3>
            {regs.slice(0,4).map(r=><div key={r.id} onClick={()=>{setSelected(r);setTab("regulations")}}
              style={{display:"flex",alignItems:"flex-start",gap:12,padding:"11px 0",borderBottom:`1px solid ${C.border}`,cursor:"pointer",transition:"opacity .15s"}}
              onMouseEnter={e=>e.currentTarget.style.opacity=".75"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <div style={{width:8,height:8,borderRadius:"50%",marginTop:5,background:SEV[r.severity],flexShrink:0,boxShadow:`0 0 6px ${SEV[r.severity]}`}}/>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{r.title}</div>
                <div style={{display:"flex",gap:6}}><Badge label={r.source} color={C.accent}/><Badge label={r.severity} color={SEV[r.severity]}/><Badge label={r.status.replace("_"," ")} color={STA[r.status]}/></div>
              </div>
              <div style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{r.date}</div>
            </div>)}
          </div>
        </div>

        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20,marginTop:16}}>
          <h3 style={{fontSize:13,fontWeight:700,marginBottom:16,letterSpacing:".2px"}}>Severity Distribution</h3>
          <div style={{display:"flex",gap:14}}>
            {["CRITICAL","HIGH","MEDIUM","LOW"].map(s=>{const n=regs.filter(r=>r.severity===s).length;return <div key={s} style={{flex:1,background:`${SEV[s]}08`,border:`1px solid ${SEV[s]}30`,borderRadius:8,padding:"14px 16px",textAlign:"center"}}>
              <div style={{fontSize:28,fontWeight:800,color:SEV[s],fontFamily:"'JetBrains Mono',monospace"}}>{n}</div>
              <div style={{fontSize:10,color:SEV[s],fontWeight:700,letterSpacing:"1px",marginTop:2}}>{s}</div>
            </div>})}
          </div>
        </div>
      </div>}

      {/* ── REGULATIONS ── */}
      {tab==="regulations"&&<div style={{animation:"fadeIn .3s ease"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <h1 style={{fontSize:20,fontWeight:800}}>Regulatory Feed</h1>
          <div style={{display:"flex",gap:8}}>
            {[[fSev,setFSev,["ALL","CRITICAL","HIGH","MEDIUM","LOW"],"Severity"],[fSta,setFSta,["ALL","PENDING","IN_PROGRESS","COMPLETED"],"Status"],[fSrc,setFSrc,["ALL",...sources],"Source"]].map(([v,s,o,l])=>
              <select key={l} value={v} onChange={e=>s(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"6px 12px",borderRadius:6,fontSize:12,cursor:"pointer"}}>
                {o.map(x=><option key={x} value={x}>{x==="ALL"?`All ${l}`:x.replace("_"," ")}</option>)}
              </select>)}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {filtered.map(r=><div key={r.id} style={{background:C.card,border:`1px solid ${C.border}`,borderLeft:`3px solid ${SEV[r.severity]}`,borderRadius:10,padding:"16px 20px",animation:"fadeIn .3s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
                  <Badge label={r.id} color={C.muted}/><Badge label={r.source} color={C.accent}/><Badge label={r.severity} color={SEV[r.severity]}/><Badge label={r.status.replace("_"," ")} color={STA[r.status]}/><Badge label={r.date} color={C.muted}/>
                </div>
                <h3 style={{fontSize:14,fontWeight:700,marginBottom:6}}>{r.title}</h3>
                <p style={{fontSize:13,color:C.muted,lineHeight:1.6,maxWidth:700}}>{r.summary}</p>
                {r.url&&<a href={r.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:8,color:C.accent,fontSize:12,fontWeight:700,textDecoration:"none"}}>{I.file} Source circular</a>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:6,marginLeft:20}}>
                <button onClick={()=>setSelectedReg(r)} style={{background:`${C.green}12`,border:`1px solid ${C.green}44`,color:C.green,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:11,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>{I.eye} View Reg</button>
                <button onClick={()=>analyseAI(r)} style={{background:`${C.accent}14`,border:`1px solid ${C.accent}44`,color:C.accent,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:11,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>{I.cpu} Analyse</button>
                <button onClick={()=>genMAPs(r)} style={{background:`${C.purple}14`,border:`1px solid ${C.purple}44`,color:C.purple,padding:"7px 14px",borderRadius:6,cursor:"pointer",fontWeight:700,fontSize:11,whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5}}>{I.target} Gen MAPs</button>
              </div>
            </div>
            {r.maps?.length>0&&<div style={{marginTop:12,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
              <div style={{fontSize:10,color:C.muted,fontWeight:700,letterSpacing:"1px",marginBottom:8}}>MEASURABLE ACTION POINTS ({r.maps.length})</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {r.maps.map((m,i)=><div key={i} style={{background:`${DEPT_C[m.dept]||C.accent}0a`,border:`1px solid ${DEPT_C[m.dept]||C.accent}30`,borderRadius:6,padding:"5px 10px",fontSize:11}}>
                  <span style={{color:DEPT_C[m.dept]||C.accent,fontWeight:700}}>{m.dept}</span>
                  <span style={{color:C.muted,margin:"0 4px"}}>|</span>
                  <span style={{color:C.text}}>{m.task}</span>
                  <button onClick={()=>setSelectedMap({...m,mapIndex:i,regId:r.id,regTitle:r.title,regSource:r.source,regUrl:r.url,regSeverity:r.severity})} style={{marginLeft:8,background:"transparent",border:"none",color:C.accent,cursor:"pointer",fontSize:11,fontWeight:800}}>View</button>
                </div>)}
              </div>
            </div>}
          </div>)}
        </div>
      </div>}

      {/* ── MAPs BOARD ── */}
      {tab==="maps"&&<div style={{animation:"fadeIn .3s ease"}}>
        <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>Measurable Action Points Board</h1>
        <p style={{color:C.muted,fontSize:13,marginBottom:24}}>All actionable tasks auto-assigned to departments across regulations</p>
        {aiLoading&&<div style={{textAlign:"center",padding:40}}><Spinner/></div>}
        {["CRITICAL","HIGH","MEDIUM","LOW"].map(pri=>{
          const tasks=[];regs.forEach(r=>r.maps?.forEach((m,mapIndex)=>{if((m.priority||"MEDIUM")===pri)tasks.push({...m,mapIndex,regId:r.id,regTitle:r.title})}));
          if(!tasks.length)return null;
          return <div key={pri} style={{marginBottom:24}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:SEV[pri]}}/>
              <h3 style={{fontSize:13,fontWeight:800,color:SEV[pri],letterSpacing:".3px"}}>{pri} PRIORITY</h3>
              <span style={{fontSize:11,color:C.muted,fontFamily:"'JetBrains Mono',monospace"}}>{tasks.length} tasks</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
              {tasks.map((m,i)=>{const key=`${m.regId}:${m.mapIndex}`;const validation=m.validation;return <div key={key} style={{background:C.card,border:`1px solid ${m.status==="VALIDATED"?C.green:m.status==="NEEDS_FIX"?C.red:C.border}`,borderTop:`2px solid ${SEV[pri]}`,borderRadius:8,padding:"14px 16px",animation:"fadeIn .3s ease",boxShadow:`0 10px 28px ${C.shadow}`}}>
                <div style={{fontSize:10,color:C.muted,marginBottom:6,fontFamily:"'JetBrains Mono',monospace"}}>{m.regId}</div>
                <div style={{fontSize:13,fontWeight:700,marginBottom:8}}>{m.task}</div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  <Badge label={m.dept} color={DEPT_C[m.dept]||C.accent}/>
                  <Badge label={`Due: ${m.due}`} color={C.muted}/>
                  <Badge label={(m.status||"ASSIGNED").replace("_"," ")} color={m.status==="VALIDATED"?C.green:m.status==="NEEDS_FIX"?C.red:C.amber}/>
                  {m.metric&&<Badge label={m.metric} color={C.purple}/>}
                </div>
                {m.owner_role&&<div style={{fontSize:11,color:C.muted,marginTop:8,display:"flex",alignItems:"center",gap:4}}>{I.user} {m.owner_role}</div>}
                <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
                  <button onClick={()=>setSelectedMap(m)} style={{width:"100%",marginBottom:10,background:`${C.green}10`,border:`1px solid ${C.green}44`,color:C.green,padding:"8px 10px",borderRadius:6,cursor:"pointer",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>{I.eye} View MAP Details</button>
                  <textarea value={evidence[key]??m.evidence??""} onChange={e=>setEvidence(prev=>({...prev,[key]:e.target.value}))} placeholder="Paste completion evidence: approval note, ticket ID, test report, policy link, screenshot reference..."
                    style={{width:"100%",minHeight:72,resize:"vertical",background:C.input,border:`1px solid ${C.border}`,borderRadius:7,color:C.text,padding:"10px 12px",fontSize:12,lineHeight:1.5,fontFamily:"'Inter',sans-serif",outline:"none"}}/>
                  {m.evidence_attachments?.length>0&&<div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>
                    {m.evidence_attachments.map((a,idx)=><a key={idx} href={`${API}${a.url}`} target="_blank" rel="noreferrer" style={{fontSize:11,color:C.accent,textDecoration:"none",border:`1px solid ${C.accent}44`,background:`${C.accent}10`,borderRadius:5,padding:"4px 7px",fontWeight:700}}>
                      {I.file} {a.filename}
                    </a>)}
                  </div>}
                  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,marginTop:10,flexWrap:"wrap"}}>
                    <button onClick={()=>validateMAP(m.regId,m.mapIndex)} disabled={validating[key]} style={{background:m.status==="VALIDATED"?`${C.green}18`:`${C.accent}16`,border:`1px solid ${m.status==="VALIDATED"?C.green:C.accent}55`,color:m.status==="VALIDATED"?C.green:C.accent,padding:"8px 12px",borderRadius:6,cursor:"pointer",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",gap:6}}>
                      {validating[key]?<Spinner/>:<>{m.status==="VALIDATED"?I.lock:I.check} Validate Completion</>}
                    </button>
                    <label style={{background:`${C.purple}12`,border:`1px solid ${C.purple}44`,color:C.purple,padding:"8px 12px",borderRadius:6,cursor:"pointer",fontWeight:800,fontSize:11,display:"flex",alignItems:"center",gap:6}}>
                      {uploading[key]?<Spinner/>:<>{I.upload} Upload SS</>}
                      <input type="file" accept="image/png,image/jpeg,image/webp" style={{display:"none"}} disabled={uploading[key]} onChange={e=>{uploadEvidence(m.regId,m.mapIndex,e.target.files?.[0]);e.target.value=""}}/>
                    </label>
                    {validation&&<span style={{fontSize:11,color:validation.validated?C.green:C.red,fontFamily:"'JetBrains Mono',monospace"}}>{validation.confidence}% confidence</span>}
                  </div>
                  {validation?.reasoning&&<div style={{fontSize:11,color:C.muted,lineHeight:1.5,marginTop:8}}>{validation.reasoning}</div>}
                  {validation?.gaps?.length>0&&<div style={{fontSize:11,color:C.red,lineHeight:1.5,marginTop:6}}>Gaps: {validation.gaps.join(" ")}</div>}
                </div>
              </div>})}
            </div>
          </div>})}
      </div>}

      {/* ── ASSIGNMENTS ── */}
      {tab==="assignments"&&<div style={{animation:"fadeIn .3s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:16,marginBottom:18}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>Assignments Register</h1>
            <p style={{color:C.muted,fontSize:13}}>Single record of every assigned MAP, owner role, review state, evidence, and validation result</p>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
            <select value={aStatus} onChange={e=>setAStatus(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,fontSize:12}}>
              {["ALL","ASSIGNED","IN_PROGRESS","IN_REVIEW","NEEDS_FIX","VALIDATED"].map(x=><option key={x} value={x}>{x==="ALL"?"All Status":x.replace("_"," ")}</option>)}
            </select>
            <select value={aDept} onChange={e=>setADept(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,fontSize:12}}>
              {["ALL",...departments].map(x=><option key={x} value={x}>{x==="ALL"?"All Departments":x}</option>)}
            </select>
            <select value={aRole} onChange={e=>setARole(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,fontSize:12}}>
              {["ALL",...roles].map(x=><option key={x} value={x}>{x==="ALL"?"All Roles":x}</option>)}
            </select>
            <select value={aSort} onChange={e=>setASort(e.target.value)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,padding:"7px 10px",borderRadius:6,fontSize:12}}>
              <option value="priority">Sort Priority</option><option value="status">Sort Status</option><option value="dept">Sort Department</option><option value="role">Sort Role</option><option value="due">Sort Due</option>
            </select>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
          {["ASSIGNED","IN_PROGRESS","IN_REVIEW","NEEDS_FIX","VALIDATED"].map(s=><div key={s} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:12}}>
            <div style={{fontSize:20,fontWeight:900,color:s==="VALIDATED"?C.green:s==="NEEDS_FIX"?C.red:s==="IN_REVIEW"?C.accent:C.amber,fontFamily:"'JetBrains Mono',monospace"}}>{allAssignments.filter(m=>(m.status||"ASSIGNED")===s).length}</div>
            <div style={{fontSize:10,color:C.muted,fontWeight:800,letterSpacing:".8px"}}>{s.replace("_"," ")}</div>
          </div>)}
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {assignmentRows.map(m=><div key={`${m.regId}-${m.mapIndex}`} style={{background:C.card,border:`1px solid ${m.status==="VALIDATED"?C.green:m.status==="NEEDS_FIX"?C.red:C.border}`,borderLeft:`4px solid ${SEV[m.priority]||C.accent}`,borderRadius:9,padding:16,display:"grid",gridTemplateColumns:"minmax(0,1fr) 320px",gap:18,alignItems:"start",boxShadow:`0 10px 24px ${C.shadow}`}}>
            <div style={{minWidth:0}}>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:9}}>
                <Badge label={m.regId} color={C.muted}/>
                <Badge label={m.regSource||"Source"} color={C.accent}/>
                <Badge label={m.priority||"MEDIUM"} color={SEV[m.priority]||C.accent}/>
              </div>
              <div style={{fontSize:13,fontWeight:900,color:C.text,lineHeight:1.35,marginBottom:5}}>{m.task}</div>
              <div style={{fontSize:12,color:C.muted,lineHeight:1.5,marginBottom:8}}>{m.regTitle}</div>
              <div style={{fontSize:11,color:C.muted,lineHeight:1.55}}>Metric: <span style={{color:C.text}}>{m.metric||m.acceptance_criteria||"Evidence reviewed by owner"}</span></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"stretch"}}>
              <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:7,padding:10}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:".8px",marginBottom:4}}>DEPARTMENT</div>
                <div style={{fontSize:12,fontWeight:900,color:DEPT_C[m.dept]||C.accent}}>{m.dept}</div>
              </div>
              <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:7,padding:10}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:".8px",marginBottom:4}}>OWNER</div>
                <div style={{fontSize:12,fontWeight:800,color:C.text}}>{m.owner_role||"Owner"}</div>
              </div>
              <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:7,padding:10}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:".8px",marginBottom:4}}>STATUS</div>
                <Badge label={(m.status||"ASSIGNED").replace("_"," ")} color={m.status==="VALIDATED"?C.green:m.status==="NEEDS_FIX"?C.red:m.status==="IN_REVIEW"?C.accent:C.amber}/>
              </div>
              <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:7,padding:10}}>
                <div style={{fontSize:9,color:C.muted,fontWeight:900,letterSpacing:".8px",marginBottom:4}}>DUE</div>
                <div style={{fontSize:12,fontWeight:800,color:C.text}}>{m.due||"TBD"}</div>
              </div>
              <button onClick={()=>setSelectedMap(m)} style={{gridColumn:"1/-1",background:`${C.accent}12`,border:`1px solid ${C.accent}44`,color:C.accent,borderRadius:7,padding:"9px 12px",cursor:"pointer",fontSize:12,fontWeight:900,display:"flex",alignItems:"center",gap:6,justifyContent:"center"}}>{I.eye} View Complete MAP</button>
            </div>
          </div>)}
          {!assignmentRows.length&&<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:30,textAlign:"center",color:C.muted,fontSize:13}}>No assignments match the selected filters.</div>}
        </div>
      </div>}

      {/* ── AI ANALYSIS ── */}
      {tab==="analysis"&&<div style={{animation:"fadeIn .3s ease"}}>
        <h1 style={{fontSize:20,fontWeight:800,marginBottom:6}}>AI Regulatory Analysis</h1>
        {!selected&&<div style={{background:C.card,border:`1px dashed ${C.border}`,borderRadius:10,padding:40,textAlign:"center",color:C.muted}}>
          <div style={{marginBottom:12,color:C.accent}}>{I.cpu}</div>
          <div style={{fontSize:14}}>Select a regulation from the <strong>Regulations</strong> tab and click <strong>Analyse</strong></div>
        </div>}
        {selected&&<div>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:18,marginBottom:16}}>
            <div style={{display:"flex",gap:6,marginBottom:8}}><Badge label={selected.id} color={C.muted}/><Badge label={selected.source} color={C.accent}/><Badge label={selected.severity} color={SEV[selected.severity]}/></div>
            <h3 style={{fontSize:15,fontWeight:700}}>{selected.title}</h3>
          </div>
          {aiLoading&&<div style={{padding:40,textAlign:"center"}}><Spinner/></div>}
          {aiOutput&&!aiOutput.error&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20,gridColumn:"1/-1",display:"flex",alignItems:"center",gap:24}}>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:44,fontWeight:900,fontFamily:"'JetBrains Mono',monospace",color:aiOutput.risk_score>70?C.red:aiOutput.risk_score>40?C.amber:C.green}}>{aiOutput.risk_score}</div>
                <div style={{fontSize:10,color:C.muted,letterSpacing:"1px",fontWeight:600}}>RISK SCORE</div>
              </div>
              <div style={{flex:1}}>
                <div style={{marginBottom:8,fontSize:13,fontWeight:600}}>Compliance Deadline Assessment</div>
                <div style={{fontSize:13,color:C.muted,lineHeight:1.6}}>{aiOutput.compliance_deadline_assessment}</div>
                <div style={{marginTop:12,fontSize:13,fontWeight:600}}>Penalty Risk</div>
                <div style={{fontSize:13,color:C.red}}>{aiOutput.penalty_risk}</div>
              </div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
              <h4 style={{fontSize:12,fontWeight:700,marginBottom:12,color:C.accent,display:"flex",alignItems:"center",gap:6}}>{I.pin} Key Obligations</h4>
              {aiOutput.key_obligations?.map((o,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:8,paddingLeft:12,borderLeft:`2px solid ${C.accent}`}}>{o}</div>)}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
              <h4 style={{fontSize:12,fontWeight:700,marginBottom:12,color:C.green,display:"flex",alignItems:"center",gap:6}}>{I.check} Recommended Actions</h4>
              {aiOutput.recommended_actions?.map((a,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:8,paddingLeft:12,borderLeft:`2px solid ${C.green}`}}>{a}</div>)}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
              <h4 style={{fontSize:12,fontWeight:700,marginBottom:12,color:C.purple,display:"flex",alignItems:"center",gap:6}}>{I.building} Impacted Departments</h4>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{aiOutput.impacted_departments?.map((d,i)=><Badge key={i} label={d} color={DEPT_C[d]||C.purple}/>)}</div>
              <div style={{marginTop:14,fontSize:13}}><span style={{color:C.muted}}>Estimated Effort: </span><span style={{fontWeight:700,color:C.amber}}>{aiOutput.estimated_effort}</span></div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,padding:20}}>
              <h4 style={{fontSize:12,fontWeight:700,marginBottom:12,color:C.amber,display:"flex",alignItems:"center",gap:6}}>{I.book} Precedent Regulations</h4>
              {aiOutput.precedent_regulations?.map((p,i)=><div key={i} style={{fontSize:12,color:C.muted,marginBottom:8,paddingLeft:12,borderLeft:`2px solid ${C.amber}`}}>{p}</div>)}
            </div>
          </div>}
          {aiOutput?.error&&<div style={{background:`${C.red}12`,border:`1px solid ${C.red}44`,borderRadius:8,padding:16,color:C.red,fontSize:13}}>{aiOutput.error}</div>}
        </div>}
      </div>}

      {/* ── CHAT ── */}
      {tab==="chat"&&<div style={{animation:"fadeIn .3s ease",display:"flex",flexDirection:"column",height:"calc(100vh - 180px)"}}>
        <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>Compliance Intelligence Chat</h1>
        <p style={{color:C.muted,fontSize:13,marginBottom:16}}>Ask about RBI, SEBI, IFSCA regulations, compliance obligations, penalties, and more</p>
        {chatHistory.length===0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:20}}>
          {["What are the key obligations under the latest RBI KYC amendment?","Which departments are most impacted by current regulations?","What is the penalty for non-compliance with DPDP Act?","Summarise all CRITICAL regulations in the system"].map(q=>
            <button key={q} onClick={()=>setChatInput(q)} style={{background:`${C.accent}08`,border:`1px solid ${C.border}`,color:C.muted,padding:"8px 14px",borderRadius:20,cursor:"pointer",fontSize:12,transition:"all .15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accent;e.currentTarget.style.color=C.accent}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted}}>{q}</button>)}
        </div>}
        <div style={{flex:1,overflowY:"auto",display:"flex",flexDirection:"column",gap:12,padding:"4px 0",marginBottom:14}}>
          {chatHistory.map((m,i)=><div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",animation:"fadeIn .2s ease"}}>
            {m.role==="assistant"&&<div style={{width:28,height:28,borderRadius:6,background:`${C.accent}18`,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",marginRight:10,flexShrink:0,color:C.accent}}>{I.cpu}</div>}
            <div style={{maxWidth:"70%",padding:"12px 16px",borderRadius:10,fontSize:13,lineHeight:1.7,background:m.role==="user"?`${C.accent}18`:C.card,border:`1px solid ${m.role==="user"?`${C.accent}44`:C.border}`,color:C.text,whiteSpace:"pre-wrap"}}>{m.content}</div>
          </div>)}
          {chatLoading&&<div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:28,height:28,borderRadius:6,background:`${C.accent}18`,border:`1px solid ${C.accent}44`,display:"flex",alignItems:"center",justifyContent:"center",color:C.accent}}>{I.cpu}</div><Spinner/></div>}
          <div ref={chatEnd}/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <input value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendChat()}
            placeholder="Ask about regulations, compliance deadlines, penalties..."
            style={{flex:1,background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 16px",color:C.text,fontSize:13,fontFamily:"'Inter',sans-serif",transition:"border-color .15s",outline:"none"}}
            onFocus={e=>e.target.style.borderColor=C.accent} onBlur={e=>e.target.style.borderColor=C.border}/>
          <button onClick={sendChat} disabled={chatLoading} style={{background:C.accent,border:"none",color:"#000",padding:"12px 18px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>{I.send} Send</button>
        </div>
      </div>}

      {/* ── AUDIT LOG ── */}
      {tab==="audit"&&<div style={{animation:"fadeIn .3s ease"}}>
        <h1 style={{fontSize:20,fontWeight:800,marginBottom:4}}>Immutable Audit Trail</h1>
        <p style={{color:C.muted,fontSize:13,marginBottom:20}}>Every compliance action, MAP assignment, and validation is logged with timestamp and actor</p>
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {[
            {time:"2025-05-11 08:32:11",action:"REGULATION FETCHED",detail:"RBI Master Direction KYC Amendment 2025 ingested via API",actor:"SYSTEM",type:"info"},
            {time:"2025-05-11 08:32:15",action:"MAPs GENERATED",detail:"3 MAPs auto-assigned for RBI-2025-001 via AI engine",actor:"AI-AGENT",type:"success"},
            {time:"2025-05-11 08:33:01",action:"MAP ASSIGNED",detail:"Compliance Dept: Update KYC policy documentation — Due 2025-04-15",actor:"AI-AGENT",type:"success"},
            {time:"2025-05-10 14:12:45",action:"VALIDATION TRIGGERED",detail:"IFSCA-2025-003 AML/CFT compliance validated by Compliance Dept",actor:"USER",type:"success"},
            {time:"2025-05-10 11:05:22",action:"REGULATION CLASSIFIED",detail:"SEBI-2025-012 severity escalated to CRITICAL by risk engine",actor:"AI-AGENT",type:"warning"},
            {time:"2025-05-09 16:41:03",action:"ALERT DISPATCHED",detail:"Email alert sent to IT Security for VAPT deadline (2025-05-15)",actor:"SYSTEM",type:"info"},
            {time:"2025-05-09 09:15:00",action:"SYSTEM SYNC",detail:"Live regulation feed synced: 5 regulations processed, 0 errors",actor:"SYSTEM",type:"info"},
          ].map((l,i)=><div key={i} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,padding:"12px 18px",display:"flex",gap:16,alignItems:"flex-start",animation:"fadeIn .3s ease"}}>
            <div style={{width:7,height:7,borderRadius:"50%",marginTop:6,flexShrink:0,background:l.type==="success"?C.green:l.type==="warning"?C.amber:C.accent}}/>
            <div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:C.muted,flexShrink:0,paddingTop:2,minWidth:130}}>{l.time}</div>
            <div style={{flex:1}}>
              <span style={{fontWeight:700,fontSize:12}}>{l.action}</span>
              <span style={{fontSize:12,color:C.muted,marginLeft:8}}>— {l.detail}</span>
            </div>
            <Badge label={l.actor} color={l.actor==="AI-AGENT"?C.purple:l.actor==="SYSTEM"?C.accent:C.green}/>
          </div>)}
        </div>
      </div>}
    </main>
    {selectedMap&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setSelectedMap(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:"min(920px,96vw)",maxHeight:"88vh",overflowY:"auto",boxShadow:`0 24px 70px ${C.shadow}`}}>
        <div style={{position:"sticky",top:0,background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 20px",display:"flex",justifyContent:"space-between",gap:16,alignItems:"flex-start"}}>
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <Badge label={selectedMap.regId} color={C.muted}/><Badge label={selectedMap.dept} color={DEPT_C[selectedMap.dept]||C.accent}/><Badge label={(selectedMap.status||"ASSIGNED").replace("_"," ")} color={selectedMap.status==="VALIDATED"?C.green:selectedMap.status==="NEEDS_FIX"?C.red:C.amber}/><Badge label={selectedMap.priority||"MEDIUM"} color={SEV[selectedMap.priority]||C.accent}/>
            </div>
            <h2 style={{fontSize:18,fontWeight:900,lineHeight:1.3}}>{selectedMap.task}</h2>
            <p style={{fontSize:12,color:C.muted,marginTop:5}}>{selectedMap.regTitle}</p>
          </div>
          <button onClick={()=>setSelectedMap(null)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,width:32,height:32,cursor:"pointer",fontWeight:900}}>x</button>
        </div>
        <div style={{padding:20,display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{gridColumn:"1/-1",background:C.subtle,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
              <div><div style={{fontSize:10,color:C.muted,fontWeight:800}}>OWNER ROLE</div><div style={{fontSize:13,fontWeight:800}}>{selectedMap.owner_role||"Department Owner"}</div></div>
              <div><div style={{fontSize:10,color:C.muted,fontWeight:800}}>DUE</div><div style={{fontSize:13,fontWeight:800}}>{selectedMap.due||"TBD"}</div></div>
              <div><div style={{fontSize:10,color:C.muted,fontWeight:800}}>SOURCE</div><div style={{fontSize:13,fontWeight:800}}>{selectedMap.regSource||"Regulator"}</div></div>
              <div><div style={{fontSize:10,color:C.muted,fontWeight:800}}>VALIDATION</div><div style={{fontSize:13,fontWeight:800,color:selectedMap.validation?.validated?C.green:C.muted}}>{selectedMap.validation?`${selectedMap.validation.confidence}% confidence`:"Not validated"}</div></div>
            </div>
          </div>
          <DetailList title="Exact Steps To Follow" items={selectedMap.exact_steps} color={C.accent}/>
          <DetailList title="Evidence Required" items={selectedMap.evidence_required} color={C.purple}/>
          <DetailList title="Review Checklist" items={selectedMap.review_checklist} color={C.green}/>
          <div style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
            <h4 style={{fontSize:12,fontWeight:800,color:C.amber,marginBottom:10}}>Acceptance Criteria</h4>
            <div style={{fontSize:12,lineHeight:1.6,color:C.text}}>{selectedMap.acceptance_criteria||selectedMap.metric}</div>
            {selectedMap.regUrl&&<a href={selectedMap.regUrl} target="_blank" rel="noreferrer" style={{display:"inline-flex",marginTop:12,color:C.accent,fontSize:12,fontWeight:800,textDecoration:"none"}}>Open source circular</a>}
          </div>
          {selectedMap.evidence&&<div style={{gridColumn:"1/-1",background:C.subtle,border:`1px solid ${C.border}`,borderRadius:8,padding:14}}>
            <h4 style={{fontSize:12,fontWeight:800,color:C.text,marginBottom:8}}>Submitted Evidence</h4>
            <pre style={{whiteSpace:"pre-wrap",fontSize:12,lineHeight:1.55,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{selectedMap.evidence}</pre>
          </div>}
        </div>
      </div>
    </div>}

    {selectedReg&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setSelectedReg(null)}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:10,width:"min(820px,96vw)",maxHeight:"86vh",overflowY:"auto",boxShadow:`0 24px 70px ${C.shadow}`}}>
        <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 20px",display:"flex",justifyContent:"space-between",gap:16}}>
          <div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}><Badge label={selectedReg.id} color={C.muted}/><Badge label={selectedReg.source} color={C.accent}/><Badge label={selectedReg.severity} color={SEV[selectedReg.severity]}/><Badge label={selectedReg.status.replace("_"," ")} color={STA[selectedReg.status]||C.amber}/></div>
            <h2 style={{fontSize:18,fontWeight:900,lineHeight:1.3}}>{selectedReg.title}</h2>
          </div>
          <button onClick={()=>setSelectedReg(null)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.text,borderRadius:6,width:32,height:32,cursor:"pointer",fontWeight:900}}>x</button>
        </div>
        <div style={{padding:20}}>
          <div style={{fontSize:13,color:C.muted,lineHeight:1.7,marginBottom:16}}>{selectedReg.summary}</div>
          {selectedReg.url&&<a href={selectedReg.url} target="_blank" rel="noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,color:C.accent,fontSize:13,fontWeight:800,textDecoration:"none",marginBottom:18}}>{I.file} Open official/source page</a>}
          <h3 style={{fontSize:13,fontWeight:900,marginBottom:10}}>Generated MAPs</h3>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {(selectedReg.maps||[]).map((m,i)=><button key={i} onClick={()=>{setSelectedMap({...m,mapIndex:i,regId:selectedReg.id,regTitle:selectedReg.title,regSource:selectedReg.source,regUrl:selectedReg.url,regSeverity:selectedReg.severity});setSelectedReg(null)}} style={{background:C.subtle,border:`1px solid ${C.border}`,borderRadius:8,padding:12,textAlign:"left",cursor:"pointer",color:C.text}}>
              <div style={{display:"flex",gap:6,marginBottom:6}}><Badge label={m.dept} color={DEPT_C[m.dept]||C.accent}/><Badge label={(m.status||"ASSIGNED").replace("_"," ")} color={m.status==="VALIDATED"?C.green:m.status==="NEEDS_FIX"?C.red:C.amber}/></div>
              <div style={{fontSize:13,fontWeight:800}}>{m.task}</div>
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>{m.metric}</div>
            </button>)}
          </div>
        </div>
      </div>
    </div>}
  </div>;
}
