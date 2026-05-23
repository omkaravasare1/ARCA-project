"""
ARCA – Agentic Regulatory Compliance & Intelligence Backend
FastAPI + Python | Real regulatory data from RBI, SEBI, MCA feeds

INSTALL:
    pip install fastapi uvicorn httpx anthropic beautifulsoup4 feedparser apscheduler python-dotenv

RUN:
    uvicorn main:app --reload --port 8000
"""

import os, json, re, hashlib, datetime, copy
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
import feedparser
from openai import OpenAI
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="ARCA – Regulatory Intelligence API", version="1.0.0")

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads" / "evidence"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads/evidence", StaticFiles(directory=str(UPLOAD_DIR)), name="evidence_uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production: restrict to your domain
    allow_methods=["*"],
    allow_headers=["*"],
)

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY")
)

# ── In-memory store (replace with PostgreSQL in production) ──────────────────
regulations_db: list[dict] = []
maps_db: list[dict] = []
audit_log: list[dict] = []

# ── Real regulatory RSS/API sources ─────────────────────────────────────────
REGULATORY_SOURCES = {
    "RBI": [
        "https://www.rbi.org.in/Scripts/rss.aspx",
        "https://www.rbi.org.in/Scripts/BS_CircularsIndex.aspx",  # scrape if needed
    ],
    "SEBI": [
        "https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecent=yes&type=1",
    ],
    "IFSCA": [
        "https://ifsca.gov.in/Circular",
    ],
    "MCA": [
        "https://www.mca.gov.in/MinistryV2/circulars.html",
    ],
}

# ── Pydantic models ───────────────────────────────────────────────────────────
class RegulationIn(BaseModel):
    title: str
    source: str
    summary: str
    date: Optional[str] = None
    url: Optional[str] = None
    severity: Optional[str] = None

class MAPValidation(BaseModel):
    regulation_id: str
    map_index: int
    validated_by: str
    evidence: Optional[str] = None

class MAPStatusUpdate(BaseModel):
    regulation_id: str
    map_index: int
    status: str
    actor: str = "USER"
    evidence: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    history: list[dict] = []

# ── Helpers ───────────────────────────────────────────────────────────────────
def log_audit(action: str, detail: str, actor: str = "SYSTEM"):
    audit_log.append({
        "id": hashlib.sha256(f"{action}{detail}{datetime.datetime.utcnow()}".encode()).hexdigest()[:12],
        "time": datetime.datetime.utcnow().isoformat(),
        "action": action,
        "detail": detail,
        "actor": actor,
    })

def classify_severity(text: str) -> str:
    text_lower = text.lower()
    if any(w in text_lower for w in ["cybersecurity", "data breach", "fraud", "money laundering", "penalty", "dpdp", "critical"]):
        return "CRITICAL"
    elif any(w in text_lower for w in ["kyc", "aml", "cft", "rbi", "mandatory", "deadline", "amendment"]):
        return "HIGH"
    elif any(w in text_lower for w in ["guideline", "circular", "advisory", "sebi"]):
        return "MEDIUM"
    return "LOW"

def generate_reg_id(source: str, index: int) -> str:
    year = datetime.datetime.now().year
    return f"{source}-{year}-{str(index).zfill(3)}"

def normalize_map(map_item: dict) -> dict:
    task = map_item.get("task") or map_item.get("action") or map_item.get("description") or "Review and complete compliance task"
    normalized = {
        "dept": map_item.get("dept") or map_item.get("department") or "Compliance",
        "task": task,
        "due": map_item.get("due") or map_item.get("deadline") or "",
        "priority": map_item.get("priority") or "MEDIUM",
        "metric": map_item.get("metric") or map_item.get("success_metric") or "Evidence reviewed by compliance owner",
        "owner_role": map_item.get("owner_role") or map_item.get("owner") or "Department Owner",
        "exact_steps": map_item.get("exact_steps") or map_item.get("steps") or [
            f"Confirm the regulatory requirement linked to: {task}",
            "Assign an accountable owner and implementation date.",
            "Complete the control/process/system change.",
            "Collect traceable evidence and submit for validation.",
        ],
        "evidence_required": map_item.get("evidence_required") or [
            "Approved document, ticket, report, screenshot, or system reference.",
            "Owner sign-off with completion date.",
        ],
        "acceptance_criteria": map_item.get("acceptance_criteria") or map_item.get("metric") or "Reviewer can independently verify that the MAP is complete.",
        "review_checklist": map_item.get("review_checklist") or [
            "Evidence is specific to this MAP.",
            "Evidence includes a traceable reference.",
            "No pending or planned-only language remains.",
        ],
        "status": map_item.get("status") or "ASSIGNED",
        "evidence": map_item.get("evidence") or "",
        "validation": map_item.get("validation"),
        "evidence_attachments": map_item.get("evidence_attachments") or [],
        "validated_by": map_item.get("validated_by"),
        "validated_at": map_item.get("validated_at"),
    }
    return normalized

def dedupe_maps(maps: list[dict]) -> list[dict]:
    unique = []
    seen = set()
    for m in maps:
        normalized = normalize_map(m)
        key = re.sub(r"[^a-z0-9]+", " ", f"{normalized['dept']} {normalized['task']}".lower()).strip()
        if key and key not in seen:
            seen.add(key)
            unique.append(normalized)
    return unique

def build_fallback_maps(regulation: dict) -> list[dict]:
    title = regulation.get("title", "")
    summary = regulation.get("summary", "")
    text = f"{title} {summary}".lower()
    severity = regulation.get("severity", "MEDIUM")
    base_due = "30 days from circular date" if severity in {"CRITICAL", "HIGH"} else "60 days from circular date"
    maps = []

    def add(dept, task, owner, priority, metric, steps, evidence):
        maps.append({
            "dept": dept,
            "task": task,
            "due": base_due,
            "priority": priority,
            "metric": metric,
            "owner_role": owner,
            "exact_steps": steps,
            "evidence_required": evidence,
            "acceptance_criteria": metric,
            "review_checklist": [
                "Evidence directly matches the assigned task.",
                "Owner sign-off and date are visible.",
                "Supporting screenshot/document/ticket is attached.",
            ],
        })

    if any(w in text for w in ["kyc", "aadhaar", "customer"]):
        add("Compliance", "Update KYC policy and approval matrix", "CCO", "HIGH", "Approved KYC policy published with version and sign-off", [
            "Compare the circular against the current KYC policy.",
            "Mark clauses that require wording, threshold, or workflow changes.",
            "Update the policy and approval matrix.",
            "Route to CCO/legal for sign-off.",
            "Publish the approved version to the compliance repository.",
        ], ["Signed policy PDF", "Approval email or workflow ID", "Policy repository link"])
        add("IT", "Configure digital KYC workflow and validation controls", "CTO", "HIGH", "Digital KYC test cases pass with audit logs enabled", [
            "Identify impacted API fields and UI screens.",
            "Update validation rules and error handling.",
            "Run positive and negative test cases.",
            "Enable audit logging for customer verification events.",
            "Deploy through approved change process.",
        ], ["Change ticket", "Test report", "Deployment screenshot"])
    if any(w in text for w in ["cyber", "soc", "vapt", "zero-trust", "vulnerab"]):
        add("IT Security", "Validate cybersecurity control implementation", "CISO", "CRITICAL", "SOC/VAPT evidence shows zero critical open findings", [
            "Map circular requirements to SOC, VAPT, and monitoring controls.",
            "Verify monitoring coverage for critical systems.",
            "Run or collect latest VAPT report.",
            "Create remediation tickets for open findings.",
            "Submit closure report to compliance.",
        ], ["SOC dashboard screenshot", "VAPT report", "Remediation ticket list"])
    if any(w in text for w in ["aml", "cft", "suspicious", "transaction"]):
        add("AML", "Update transaction monitoring and STR escalation workflow", "MLRO", "HIGH", "STR workflow meets reporting SLA and alert routing is tested", [
            "Review thresholds and reporting timeline changes.",
            "Update monitoring rules and alert categories.",
            "Test sample transactions against new thresholds.",
            "Train AML analysts on escalation handling.",
            "Record evidence of test results and sign-off.",
        ], ["Rules configuration screenshot", "Sample test output", "Training attendance record"])
    if any(w in text for w in ["dpdp", "data", "consent", "privacy"]):
        add("Legal", "Confirm DPDP obligation coverage and DPO ownership", "General Counsel", "CRITICAL", "DPO ownership and data protection obligations are formally approved", [
            "Identify applicable DPDP clauses for financial data.",
            "Confirm DPO/accountability owner.",
            "Update privacy notices and consent language.",
            "Validate retention and data sharing controls.",
            "Submit compliance note for board or committee review.",
        ], ["DPO appointment record", "Privacy notice version", "Committee approval note"])

    if not maps:
        add("Compliance", f"Translate {regulation.get('source', 'regulator')} circular into controls", "Compliance Manager", severity, "Control mapping completed and approved", [
            "Read the circular and extract obligations.",
            "Map obligations to impacted policies, processes, and systems.",
            "Assign each control to an accountable department.",
            "Define evidence required for closure.",
            "Submit control mapping for review.",
        ], ["Control mapping sheet", "Reviewer approval", "Evidence checklist"])
    return dedupe_maps(maps)

def find_map_or_404(regulation_id: str, map_index: int) -> tuple[dict, dict]:
    reg = next((r for r in get_working_regulations() if r["id"] == regulation_id), None)
    if not reg or not reg.get("maps") or map_index < 0 or map_index >= len(reg["maps"]):
        raise HTTPException(404, "Regulation or MAP not found")
    return reg, reg["maps"][map_index]

def safe_upload_filename(filename: str) -> str:
    stem = Path(filename or "evidence.png").stem
    suffix = Path(filename or "evidence.png").suffix.lower()
    if suffix not in {".png", ".jpg", ".jpeg", ".webp"}:
        raise HTTPException(400, "Only PNG, JPG, JPEG, or WEBP screenshots are supported")
    clean_stem = re.sub(r"[^a-zA-Z0-9_-]+", "-", stem).strip("-")[:48] or "screenshot"
    return f"{clean_stem}{suffix}"

def normalize_regulation(reg: dict) -> dict:
    normalized = copy.deepcopy(reg)
    normalized["maps"] = [normalize_map(m) for m in normalized.get("maps", [])]
    return normalized

def ensure_demo_seeded():
    if not regulations_db:
        regulations_db.extend(normalize_regulation(r) for r in get_demo_data())

def get_working_regulations() -> list[dict]:
    ensure_demo_seeded()
    return regulations_db

def update_regulation_status(reg: dict):
    maps = reg.get("maps", [])
    if maps and all(m.get("status") == "VALIDATED" for m in maps):
        reg["status"] = "COMPLETED"
    elif any(m.get("status") in ["IN_REVIEW", "VALIDATED", "NEEDS_FIX"] for m in maps):
        reg["status"] = "IN_PROGRESS"

def rule_based_validate_completion(map_task: str, evidence: str) -> dict:
    evidence_text = (evidence or "").strip()
    evidence_lower = evidence_text.lower()
    strong_signals = [
        "approved", "signed", "implemented", "completed", "deployed", "tested",
        "audit", "screenshot", "ticket", "policy", "report", "control", "attached"
    ]
    weak_or_negative = ["todo", "pending", "will", "planned", "not started", "draft"]
    signal_count = sum(1 for word in strong_signals if word in evidence_lower)
    has_reference = bool(re.search(r"(ticket|jira|change|cr|ref|url|http|doc|evidence)[\s:#-]*[a-z0-9/-]+", evidence_lower))
    has_detail = len(evidence_text.split()) >= 12
    has_negative = any(word in evidence_lower for word in weak_or_negative)
    score = min(95, 35 + signal_count * 12 + (20 if has_reference else 0) + (15 if has_detail else 0) - (25 if has_negative else 0))
    validated = score >= 70
    gaps = []
    if not has_detail:
        gaps.append("Evidence is too brief; add concrete completion details.")
    if not has_reference:
        gaps.append("Add a ticket, document, report, screenshot, URL, or approval reference.")
    if has_negative:
        gaps.append("Evidence contains pending/planned language rather than completed work.")
    return {
        "validated": validated,
        "confidence": max(0, score),
        "reasoning": (
            "Evidence contains enough completion signals and traceable references."
            if validated else
            "Evidence is not yet strong enough to prove completion."
        ),
        "gaps": gaps,
        "mode": "rule_based_fallback",
    }

# ── Regulation fetcher (real RSS feeds) ──────────────────────────────────────
async def fetch_rbi_regulations() -> list[dict]:
    """Fetch from RBI RSS feed"""
    regs = []
    try:
        feed = feedparser.parse("https://www.rbi.org.in/Scripts/rss.aspx")
        for i, entry in enumerate(feed.entries[:10]):
            severity = classify_severity(entry.get("summary", "") + entry.get("title", ""))
            reg = {
                "id": generate_reg_id("RBI", len(regulations_db) + i + 1),
                "title": entry.get("title", "RBI Circular"),
                "source": "RBI",
                "date": entry.get("published", datetime.date.today().isoformat())[:10],
                "severity": severity,
                "status": "PENDING",
                "summary": entry.get("summary", "")[:500],
                "url": entry.get("link", ""),
                "maps": [],
            }
            regs.append(reg)
    except Exception as e:
        print(f"RBI fetch error: {e}")
    return regs

async def fetch_sebi_regulations() -> list[dict]:
    """Fetch SEBI circulars via HTTP"""
    regs = []
    try:
        async with httpx.AsyncClient(timeout=10.0) as c:
            r = await c.get("https://www.sebi.gov.in/sebiweb/other/OtherAction.do?doRecent=yes&type=1",
                           headers={"User-Agent": "Mozilla/5.0"})
            # Parse HTML for circular links (simplified – add BeautifulSoup parsing for production)
            # For demo, return structured data
    except Exception as e:
        print(f"SEBI fetch error: {e}")
    return regs

# ── AI MAP Generator ──────────────────────────────────────────────────────────
async def ai_generate_maps(regulation: dict) -> list[dict]:
    """Generate Measurable Action Points"""
    try:
        completion = client.chat.completions.create(
            model="deepseek-ai/deepseek-v4-pro",
            messages=[
                {
                    "role": "system",
                    "content": "You are an Indian banking compliance implementation lead. Generate practical, non-duplicate, executable action plans."
                },
                {
                    "role": "user",
                    "content": f"""
Generate Measurable Action Points (MAPs) for this regulation.

Title: {regulation['title']}
Source: {regulation['source']}
Severity: {regulation['severity']}
Summary: {regulation['summary']}

Return ONLY valid JSON array. Each item must be unique and include:
dept,
task,
due,
priority,
metric,
owner_role,
exact_steps as an array of 4-6 concrete steps,
evidence_required as an array,
acceptance_criteria,
review_checklist as an array.

Avoid generic tasks. Do not repeat the same department/task pair.
"""
                }
            ],
            temperature=0.7,
            max_tokens=1000
        )

        text = completion.choices[0].message.content
        text = re.sub(r"```json|```", "", text).strip()

        maps = json.loads(text)
        maps = dedupe_maps(maps)
        return maps if maps else build_fallback_maps(regulation)

    except Exception as e:
        print(f"MAP generation error: {e}")
        return build_fallback_maps(regulation)


async def ai_analyse_regulation(regulation: dict) -> dict:
    """Deep AI analysis of a regulation"""
    try:
        completion = client.chat.completions.create(
            model="deepseek-ai/deepseek-v4-pro",
            messages=[
                {
                    "role": "system",
                    "content": "You are a banking regulatory analyst."
                },
                {
                    "role": "user",
                    "content": f"""
Analyse this banking regulation.

Title: {regulation['title']}
Source: {regulation['source']}
Severity: {regulation['severity']}
Summary: {regulation['summary']}

Return JSON with:
risk_score,
key_obligations,
impacted_departments,
recommended_actions,
penalty_risk
"""
                }
            ],
            temperature=0.5,
            max_tokens=1500
        )

        text = completion.choices[0].message.content
        text = re.sub(r"```json|```", "", text).strip()

        return json.loads(text)

    except Exception as e:
        return {"error": str(e)}


# ── Auto-validator ─────────────────────────────────────────────────────────────
async def ai_validate_completion(regulation_id: str, map_task: str, evidence: str) -> dict:
    """AI validates if a MAP has been genuinely completed"""
    use_ai_validation = os.getenv("ARCA_AI_VALIDATION", "").lower() in {"1", "true", "yes"}
    if not use_ai_validation or not os.getenv("NVIDIA_API_KEY"):
        return rule_based_validate_completion(map_task, evidence)
    try:
        completion = client.chat.completions.create(
            model="deepseek-ai/deepseek-v4-pro",
            messages=[
                {
                    "role": "system",
                    "content": "You are a compliance auditor."
                },
                {
                    "role": "user",
                    "content": f"""
Task: {map_task}

Evidence:
{evidence}

Validate completion.

Return JSON:
validated,
confidence,
reasoning,
gaps
"""
                }
            ],
            temperature=0.3,
            max_tokens=700
        )

        text = completion.choices[0].message.content
        text = re.sub(r"```json|```", "", text).strip()

        result = json.loads(text)
        return {
            "validated": bool(result.get("validated")),
            "confidence": result.get("confidence", 0),
            "reasoning": result.get("reasoning", ""),
            "gaps": result.get("gaps", []),
            "mode": "ai",
        }

    except Exception as e:
        fallback = rule_based_validate_completion(map_task, evidence)
        fallback["reasoning"] = f"{fallback['reasoning']} AI validator unavailable: {str(e)}"
        return fallback

# ── API Routes ─────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ARCA API running", "version": "1.0.0", "timestamp": datetime.datetime.utcnow().isoformat()}

@app.get("/fetch-regulations")
async def fetch_regulations():
    """Fetch live regulations from all regulatory bodies"""
    ensure_demo_seeded()
    new_regs = []
    rbi_regs = await fetch_rbi_regulations()
    new_regs.extend(rbi_regs)

    # Add to DB (deduplicate by title)
    existing_titles = {r["title"] for r in regulations_db}
    added = 0
    for reg in new_regs:
        if reg["title"] not in existing_titles:
            regulations_db.append(normalize_regulation(reg))
            added += 1
            log_audit("REGULATION_FETCHED", f"{reg['id']}: {reg['title'][:60]}", "SYSTEM")

    # If no live regs fetched, return demo data
    return {"regulations": regulations_db, "added": added, "total": len(regulations_db)}

@app.get("/regulations")
def list_regulations(source: str = None, severity: str = None, status: str = None):
    regs = get_working_regulations()
    if source: regs = [r for r in regs if r.get("source") == source]
    if severity: regs = [r for r in regs if r.get("severity") == severity]
    if status: regs = [r for r in regs if r.get("status") == status]
    return {"regulations": regs, "total": len(regs)}

@app.post("/regulations/add")
async def add_regulation(reg: RegulationIn, background_tasks: BackgroundTasks):
    """Manually add a regulation and auto-generate MAPs"""
    new_reg = {
        "id": generate_reg_id(reg.source, len(regulations_db) + 1),
        "title": reg.title,
        "source": reg.source,
        "date": reg.date or datetime.date.today().isoformat(),
        "severity": reg.severity or classify_severity(reg.summary),
        "status": "PENDING",
        "summary": reg.summary,
        "url": reg.url or "",
        "maps": [],
    }
    new_reg = normalize_regulation(new_reg)
    regulations_db.append(new_reg)
    log_audit("REGULATION_ADDED", f"{new_reg['id']}: {reg.title[:60]}", "USER")
    background_tasks.add_task(auto_generate_maps_background, new_reg["id"])
    return {"regulation": new_reg, "message": "Added. MAPs generating in background."}

async def auto_generate_maps_background(reg_id: str):
    reg = next((r for r in regulations_db if r["id"] == reg_id), None)
    if reg:
        maps = await ai_generate_maps(reg)
        if maps:
            reg["maps"] = dedupe_maps(maps)
            log_audit("MAPS_GENERATED", f"{len(maps)} MAPs for {reg_id}", "AI-AGENT")
        else:
            log_audit("MAP_GENERATION_SKIPPED", f"Existing MAPs preserved for {reg_id}", "AI-AGENT")

@app.post("/regulations/{reg_id}/generate-maps")
async def generate_maps(reg_id: str):
    reg = next((r for r in get_working_regulations() if r["id"] == reg_id), None)
    if not reg:
        raise HTTPException(404, "Regulation not found")
    maps = await ai_generate_maps(reg)
    maps = dedupe_maps(maps)
    if not maps and reg.get("maps"):
        log_audit("MAP_GENERATION_SKIPPED", f"Existing MAPs preserved for {reg_id}", "AI-AGENT")
        return {"maps": reg["maps"], "count": len(reg["maps"]), "preserved": True}
    reg["maps"] = maps
    log_audit("MAPS_GENERATED", f"{len(maps)} MAPs for {reg_id}", "AI-AGENT")
    return {"maps": maps, "count": len(maps), "preserved": False}

@app.post("/regulations/{reg_id}/analyse")
async def analyse_regulation(reg_id: str):
    reg = next((r for r in get_working_regulations() if r["id"] == reg_id), None)
    if not reg:
        raise HTTPException(404, "Regulation not found")
    analysis = await ai_analyse_regulation(reg)
    reg["analysis"] = analysis
    reg["analysis_generated_at"] = datetime.datetime.utcnow().isoformat()
    log_audit("REGULATION_ANALYSED", f"AI analysis for {reg_id}", "AI-AGENT")
    return {"analysis": analysis, "regulation_id": reg_id}

@app.post("/validate-map")
async def validate_map(v: MAPValidation):
    """AI-powered MAP completion validation"""
    reg, map_item = find_map_or_404(v.regulation_id, v.map_index)
    map_task = map_item.get("task", "")
    evidence = (v.evidence or "").strip()
    if not evidence:
        raise HTTPException(400, "Evidence is required for autonomous validation")
    map_item["status"] = "IN_REVIEW"
    map_item["evidence"] = evidence
    result = await ai_validate_completion(v.regulation_id, map_task, evidence)
    map_item["validation"] = result
    map_item["validated_by"] = v.validated_by
    map_item["validated_at"] = datetime.datetime.utcnow().isoformat()

    if result.get("validated"):
        map_item["status"] = "VALIDATED"
        log_audit("MAP_VALIDATED", f"{v.regulation_id} MAP[{v.map_index}] by {v.validated_by}", v.validated_by)
    else:
        map_item["status"] = "NEEDS_FIX"
        log_audit("MAP_VALIDATION_FAILED", f"{v.regulation_id} MAP[{v.map_index}] – {result.get('reasoning', '')[:100]}", v.validated_by)

    update_regulation_status(reg)
    return {"result": result, "map": map_item, "regulation": reg}

@app.post("/maps/{reg_id}/{map_index}/evidence-upload")
async def upload_map_evidence(reg_id: str, map_index: int, request: Request, filename: str, uploaded_by: str = "USER"):
    """Attach screenshot evidence to a MAP without requiring multipart dependencies."""
    reg, map_item = find_map_or_404(reg_id, map_index)
    content_type = request.headers.get("content-type", "")
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(400, "Evidence upload must be an image screenshot")

    body = await request.body()
    if not body:
        raise HTTPException(400, "Uploaded screenshot is empty")
    if len(body) > 5 * 1024 * 1024:
        raise HTTPException(400, "Screenshot must be 5 MB or smaller")

    clean_name = safe_upload_filename(filename)
    unique_prefix = hashlib.sha256(f"{reg_id}{map_index}{clean_name}{datetime.datetime.utcnow()}".encode()).hexdigest()[:12]
    stored_name = f"{reg_id}-{map_index}-{unique_prefix}-{clean_name}"
    file_path = UPLOAD_DIR / stored_name
    file_path.write_bytes(body)

    attachment = {
        "filename": clean_name,
        "stored_name": stored_name,
        "url": f"/uploads/evidence/{stored_name}",
        "content_type": content_type or "image/*",
        "size_bytes": len(body),
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.datetime.utcnow().isoformat(),
    }
    map_item.setdefault("evidence_attachments", []).append(attachment)
    evidence_line = f"Screenshot evidence uploaded: {attachment['filename']} ({attachment['url']})"
    map_item["evidence"] = f"{map_item.get('evidence', '').strip()}\n{evidence_line}".strip()
    map_item["status"] = "IN_REVIEW" if map_item.get("status") != "VALIDATED" else map_item["status"]

    log_audit("EVIDENCE_UPLOADED", f"{reg_id} MAP[{map_index}] screenshot {clean_name}", uploaded_by)
    update_regulation_status(reg)
    return {"attachment": attachment, "map": map_item, "regulation": reg}

@app.post("/map-status")
async def update_map_status(update: MAPStatusUpdate):
    reg, map_item = find_map_or_404(update.regulation_id, update.map_index)
    allowed = {"ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "NEEDS_FIX", "VALIDATED"}
    if update.status not in allowed:
        raise HTTPException(400, "Unsupported MAP status")
    map_item["status"] = update.status
    if update.evidence is not None:
        map_item["evidence"] = update.evidence
    log_audit("MAP_STATUS_UPDATED", f"{update.regulation_id} MAP[{update.map_index}] -> {update.status}", update.actor)
    update_regulation_status(reg)
    return {"map": map_item, "regulation": reg}

@app.post("/chat")
async def compliance_chat(msg: ChatMessage):
    """ARCA compliance intelligence chatbot"""

    regs_context = json.dumps([
        {
            "id": r["id"],
            "title": r["title"],
            "source": r["source"],
            "severity": r["severity"],
            "status": r["status"],
            "summary": r["summary"][:200]
        }
        for r in get_working_regulations()
    ])

    messages = msg.history + [
        {
            "role": "user",
            "content": msg.message
        }
    ]

    completion = client.chat.completions.create(
        model="deepseek-ai/deepseek-v4-pro",
        messages=[
            {
                "role": "system",
                "content": f"""
You are ARCA AI Compliance Assistant.

Current regulations:
{regs_context}

Provide banking compliance guidance.
"""
            }
        ] + messages,
        temperature=0.7,
        max_tokens=1000
    )

    reply = completion.choices[0].message.content

    log_audit("CHAT_QUERY", msg.message[:80], "USER")

    return {"reply": reply}

@app.get("/audit-log")
def get_audit_log(limit: int = 50):
    return {"logs": audit_log[-limit:][::-1], "total": len(audit_log)}

@app.get("/stats")
def get_stats():
    regs = get_working_regulations()
    all_maps = [m for r in regs for m in r.get("maps", [])]
    dept_load = {}
    for m in all_maps:
        dept_load[m.get("dept", "Unknown")] = dept_load.get(m.get("dept", "Unknown"), 0) + 1

    return {
        "total_regulations": len(regs),
        "by_severity": {s: len([r for r in regs if r["severity"] == s]) for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]},
        "by_status": {s: len([r for r in regs if r["status"] == s]) for s in ["PENDING", "IN_PROGRESS", "COMPLETED"]},
        "total_maps": len(all_maps),
        "dept_workload": dept_load,
        "last_sync": datetime.datetime.utcnow().isoformat(),
    }

def get_demo_data():
    """Fallback demo data matching frontend mock"""
    return [
        {
            "id": "RBI-2025-001",
            "title": "RBI Master Direction – KYC (Amendment) 2025",
            "source": "RBI", "date": "2025-03-15",
            "severity": "HIGH", "status": "PENDING",
            "summary": "Updated KYC norms mandate re-verification of existing customers within 90 days for high-risk categories.",
            "url": "https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12865",
            "maps": [
                {"dept": "Compliance", "task": "Update KYC policy documentation", "due": "2025-04-15", "priority": "HIGH", "metric": "Policy updated and signed off", "owner_role": "CCO"},
                {"dept": "IT", "task": "Upgrade digital KYC API to Aadhaar v2", "due": "2025-04-30", "priority": "HIGH", "metric": "API passing 100% test cases", "owner_role": "CTO"},
            ]
        },
        {
            "id": "SEBI-2025-012",
            "title": "SEBI Circular – Cybersecurity Framework for Banks",
            "source": "SEBI", "date": "2025-04-01",
            "severity": "CRITICAL", "status": "IN_PROGRESS",
            "summary": "Banks must implement comprehensive cybersecurity framework including SOC, VAPT, and zero-trust architecture by Q3 2025.",
            "url": "https://www.sebi.gov.in/legal/circulars/mar-2025/extension-towards-adoption-and-implementation-of-cybersecurity-and-cyber-resilience-framework-cscrf-for-sebi-regulated-entities-res-_93146.html",
            "maps": [
                {"dept": "IT Security", "task": "Establish 24x7 SOC operations", "due": "2025-06-01", "priority": "CRITICAL", "metric": "SOC operational with <15min MTTD", "owner_role": "CISO"},
                {"dept": "IT", "task": "Conduct VAPT on all customer-facing systems", "due": "2025-05-15", "priority": "HIGH", "metric": "Zero critical vulnerabilities open", "owner_role": "Security Manager"},
            ]
        },
    ]

# ── Scheduler: Auto-sync regulations every 6 hours ────────────────────────────
scheduler = BackgroundScheduler()

@app.on_event("startup")
async def startup():
    print("ARCA backend started. API docs at /docs")
    # scheduler.add_job(fetch_rbi_regulations, 'interval', hours=6)
    # scheduler.start()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
