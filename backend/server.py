from fastapi import FastAPI, APIRouter, HTTPException, Depends, Response, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import httpx
import json
import asyncio
import base64
import resend
from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
mongo_client = AsyncIOMotorClient(mongo_url)
db = mongo_client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---- HELPERS ----

def generate_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

async def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization", "")
    session_token = None
    if auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
    else:
        session_token = request.cookies.get("session_token")

    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    session = await db.user_sessions.find_one({"session_token": session_token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def create_notification(user_id: str, notif_type: str, title: str, message: str, link: str = None, data: dict = None):
    notif = {
        "notif_id": generate_id("notif_"),
        "user_id": user_id,
        "type": notif_type,
        "title": title,
        "message": message,
        "link": link,
        "data": data or {},
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notif)
    return notif

async def send_email_notification(to: str, subject: str, html: str):
    api_key = os.environ.get("RESEND_API_KEY", "")
    sender = os.environ.get("SENDER_EMAIL", "noreply@renergizr.com")
    if not api_key or api_key.startswith("re_placeholder"):
        logger.info(f"Email skipped (no RESEND_API_KEY configured): to={to}, subject={subject}")
        return
    resend.api_key = api_key
    try:
        params = {"from": sender, "to": [to], "subject": subject, "html": html}
        await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f"Email sent to {to}: {subject}")
    except Exception as e:
        logger.error(f"Email failed to {to}: {e}")

def email_base_html(title: str, body: str) -> str:
    return f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#020617;color:#e2e8f0;padding:32px;border-radius:8px;border:1px solid #1e293b">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:24px">
        <div style="width:24px;height:24px;background:#0ea5e9;border-radius:4px;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-weight:900;font-size:14px">R</span>
        </div>
        <span style="font-weight:900;font-size:16px;color:white;letter-spacing:1px">RENERGIZR</span>
      </div>
      <h2 style="color:#0ea5e9;margin-bottom:16px;font-size:20px">{title}</h2>
      {body}
      <hr style="border:none;border-top:1px solid #1e293b;margin:24px 0" />
      <p style="color:#64748b;font-size:11px">Renergizr Industries Pvt. Ltd. · B2B Energy Trading Platform · India</p>
    </div>
    """

# ---- MODELS ----

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str
    company: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class GoogleSessionRequest(BaseModel):
    session_id: str
    role: Optional[str] = "client"

class RFQCreate(BaseModel):
    title: str
    description: str
    energy_type: str
    quantity_mw: float
    delivery_location: str
    start_date: str
    end_date: str
    price_ceiling: Optional[float] = None
    specs: Optional[Dict] = {}
    logistics: Optional[Dict] = {}
    financial_terms: Optional[Dict] = {}
    add_on_services: Optional[List[str]] = []

class RFQStatusUpdate(BaseModel):
    status: str

class BidCreate(BaseModel):
    price_per_unit: float
    quantity_mw: float
    delivery_timeline: str
    specs: Optional[Dict] = {}
    notes: Optional[str] = None

class BidStatusUpdate(BaseModel):
    status: str

class AwardBid(BaseModel):
    contract_terms: Optional[str] = None
    delivery_milestones: Optional[List[str]] = []
    payment_schedule: Optional[str] = None

class ContractResponseRequest(BaseModel):
    accept: bool
    notes: Optional[str] = None

class DocumentUpload(BaseModel):
    doc_type: str
    filename: str
    data_base64: str
    size_bytes: Optional[int] = None

class VendorProfileUpdate(BaseModel):
    company_name: str
    description: Optional[str] = None
    energy_types: Optional[List[str]] = []
    capacity_mw: Optional[float] = None
    certifications: Optional[List[str]] = []
    carbon_credits: Optional[float] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    regulatory_docs: Optional[List[str]] = []

class AdminUserUpdate(BaseModel):
    role: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: Optional[bool] = None

# ---- AUTH ENDPOINTS ----

@api_router.post("/auth/register")
async def register(data: RegisterRequest, response: Response):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = generate_id("usr_")
    user = {
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "company": data.company,
        "picture": None,
        "password_hash": hash_password(data.password),
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)

    if data.role == "vendor":
        await db.vendor_profiles.insert_one({
            "vendor_id": generate_id("vnd_"),
            "user_id": user_id,
            "company_name": data.company or data.name,
            "description": "",
            "energy_types": [],
            "capacity_mw": 0,
            "certifications": [],
            "regulatory_docs": [],
            "carbon_credits": 0,
            "verification_status": "pending",
            "contact_email": data.email,
            "contact_phone": "",
            "website": "",
            "location": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    session_token = generate_id("sess_")
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/")
    return_user = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"user": return_user, "session_token": session_token}

@api_router.post("/auth/login")
async def login(data: LoginRequest, response: Response):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not user.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    session_token = generate_id("sess_")
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/")
    return_user = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"user": return_user, "session_token": session_token}

@api_router.post("/auth/google/session")
async def google_session(data: GoogleSessionRequest, response: Response):
    async with httpx.AsyncClient() as hclient:
        resp = await hclient.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": data.session_id}
        )
        if resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid Google session")
        g_data = resp.json()

    email = g_data["email"]
    name = g_data.get("name", email)
    picture = g_data.get("picture")
    session_token = g_data.get("session_token")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user_id = generate_id("usr_")
        user = {
            "user_id": user_id,
            "email": email,
            "name": name,
            "role": data.role,
            "company": None,
            "picture": picture,
            "password_hash": None,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(user)

        if data.role == "vendor":
            await db.vendor_profiles.insert_one({
                "vendor_id": generate_id("vnd_"),
                "user_id": user_id,
                "company_name": name,
                "description": "",
                "energy_types": [],
                "capacity_mw": 0,
                "certifications": [],
                "regulatory_docs": [],
                "carbon_credits": 0,
                "verification_status": "pending",
                "contact_email": email,
                "contact_phone": "",
                "website": "",
                "location": "",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
    else:
        user_id = user["user_id"]
        await db.users.update_one({"email": email}, {"$set": {"picture": picture, "name": name}})
        user = await db.users.find_one({"user_id": user_id}, {"_id": 0})

    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": (datetime.now(timezone.utc) + timedelta(days=7)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(key="session_token", value=session_token, httponly=True, secure=True, samesite="none", path="/")
    return_user = {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}
    return {"user": return_user, "session_token": session_token}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return {k: v for k, v in user.items() if k not in ["_id", "password_hash"]}

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    session_token = request.cookies.get("session_token")
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        session_token = auth_header[7:]
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    response.delete_cookie("session_token", path="/", samesite="none", secure=True)
    return {"message": "Logged out"}

# ---- RFQ ENDPOINTS ----

@api_router.post("/rfqs")
async def create_rfq(data: RFQCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] not in ["client", "admin"]:
        raise HTTPException(status_code=403, detail="Only clients can create RFQs")

    rfq_id = generate_id("rfq_")
    rfq = {
        "rfq_id": rfq_id,
        "client_id": user["user_id"],
        "client_name": user["name"],
        "client_company": user.get("company", ""),
        "title": data.title,
        "description": data.description,
        "energy_type": data.energy_type,
        "quantity_mw": data.quantity_mw,
        "delivery_location": data.delivery_location,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "price_ceiling": data.price_ceiling,
        "specs": data.specs,
        "logistics": data.logistics,
        "financial_terms": data.financial_terms,
        "add_on_services": data.add_on_services,
        "status": "open",
        "bid_count": 0,
        "ai_analysis_summary": None,
        "best_bid_id": None,
        "awarded_bid_id": None,
        "contract_id": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.rfqs.insert_one(rfq)
    return {k: v for k, v in rfq.items() if k != "_id"}

@api_router.get("/rfqs")
async def list_rfqs(request: Request, status: Optional[str] = None, energy_type: Optional[str] = None):
    user = await get_current_user(request)
    query = {}
    if user["role"] == "client":
        query["client_id"] = user["user_id"]
        if status:
            query["status"] = status
    elif user["role"] == "vendor":
        query["status"] = {"$in": ["open"]}
    else:
        if status:
            query["status"] = status
    if energy_type:
        query["energy_type"] = energy_type
    rfqs = await db.rfqs.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return rfqs

@api_router.get("/rfqs/{rfq_id}")
async def get_rfq(rfq_id: str, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq

@api_router.patch("/rfqs/{rfq_id}/status")
async def update_rfq_status(rfq_id: str, data: RFQStatusUpdate, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {"status": data.status, "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"message": "Status updated"}

@api_router.post("/rfqs/{rfq_id}/close-bidding")
async def close_bidding(rfq_id: str, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if rfq["status"] != "open":
        raise HTTPException(status_code=400, detail="RFQ is not open for bidding")

    await db.rfqs.update_one(
        {"rfq_id": rfq_id},
        {"$set": {"status": "bidding_closed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # Notify all vendors who bid
    bids = await db.bids.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(200)
    for bid in bids:
        await create_notification(
            bid["vendor_id"], "rfq_closed", "Bidding Period Closed",
            f"The bidding period for '{rfq['title']}' has closed. The client is reviewing bids.",
            link=f"/vendor/rfqs/{rfq_id}"
        )

    return {"message": "Bidding closed", "status": "bidding_closed"}

# ---- BID ENDPOINTS ----

@api_router.post("/rfqs/{rfq_id}/bids")
async def submit_bid(rfq_id: str, data: BidCreate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can submit bids")
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["status"] != "open":
        raise HTTPException(status_code=400, detail="RFQ is not open for bids")
    existing = await db.bids.find_one({"rfq_id": rfq_id, "vendor_id": user["user_id"]}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a bid for this RFQ")

    vendor_profile = await db.vendor_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    bid_id = generate_id("bid_")
    bid = {
        "bid_id": bid_id,
        "rfq_id": rfq_id,
        "vendor_id": user["user_id"],
        "vendor_name": user["name"],
        "vendor_company": vendor_profile.get("company_name", user["name"]) if vendor_profile else user["name"],
        "vendor_location": vendor_profile.get("location", "") if vendor_profile else "",
        "vendor_verification": vendor_profile.get("verification_status", "pending") if vendor_profile else "pending",
        "price_per_unit": data.price_per_unit,
        "quantity_mw": data.quantity_mw,
        "delivery_timeline": data.delivery_timeline,
        "specs": data.specs,
        "notes": data.notes,
        "ai_score": None,
        "ai_analysis": None,
        "status": "submitted",
        "contract_id": None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.bids.insert_one(bid)
    await db.rfqs.update_one({"rfq_id": rfq_id}, {"$inc": {"bid_count": 1}})

    # Notify client about new bid
    await create_notification(
        rfq["client_id"], "new_bid", "New Bid Received",
        f"{bid['vendor_company']} submitted a bid of ₹{bid['price_per_unit']}/kWh for '{rfq['title']}'.",
        link=f"/client/rfqs/{rfq_id}",
        data={"bid_id": bid_id, "rfq_id": rfq_id}
    )

    # Send email to client
    client_user = await db.users.find_one({"user_id": rfq["client_id"]}, {"_id": 0})
    if client_user:
        body = f"""<p>Dear {rfq['client_name']},</p>
        <p>A new bid has been received for your RFQ <strong style="color:#0ea5e9">{rfq['title']}</strong>:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Vendor</td><td style="padding:8px;color:#e2e8f0;border-bottom:1px solid #1e293b">{bid['vendor_company']}</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Price</td><td style="padding:8px;color:#0ea5e9;border-bottom:1px solid #1e293b">₹{bid['price_per_unit']}/kWh</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Quantity</td><td style="padding:8px;color:#e2e8f0;border-bottom:1px solid #1e293b">{bid['quantity_mw']} MW</td></tr>
          <tr><td style="padding:8px;color:#64748b">Timeline</td><td style="padding:8px;color:#e2e8f0">{bid['delivery_timeline']}</td></tr>
        </table>
        <p>Log in to Renergizr to review and compare all bids.</p>"""
        await send_email_notification(client_user["email"], f"New Bid: {rfq['title']}", email_base_html(f"New Bid on {rfq['title']}", body))

    return {k: v for k, v in bid.items() if k != "_id"}

@api_router.get("/rfqs/{rfq_id}/bids")
async def get_rfq_bids(rfq_id: str, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if user["role"] == "vendor":
        bids = await db.bids.find({"rfq_id": rfq_id, "vendor_id": user["user_id"]}, {"_id": 0}).to_list(1)
    else:
        if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Not authorized")
        bids = await db.bids.find({"rfq_id": rfq_id}, {"_id": 0}).sort("ai_score", -1).to_list(200)
    return bids

@api_router.post("/rfqs/{rfq_id}/bids/ai-rank")
async def ai_rank_bids(rfq_id: str, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    bids = await db.bids.find({"rfq_id": rfq_id}, {"_id": 0}).to_list(200)
    if not bids:
        raise HTTPException(status_code=400, detail="No bids to rank")

    rfq_summary = {
        "title": rfq["title"],
        "energy_type": rfq["energy_type"],
        "quantity_mw": rfq["quantity_mw"],
        "delivery_location": rfq["delivery_location"],
        "price_ceiling": rfq.get("price_ceiling"),
        "start_date": rfq["start_date"],
        "end_date": rfq["end_date"],
        "specs": rfq.get("specs", {}),
        "financial_terms": rfq.get("financial_terms", {})
    }

    bids_summary = [
        {
            "bid_id": b["bid_id"],
            "vendor": b["vendor_company"],
            "price_per_unit": b["price_per_unit"],
            "quantity_mw": b["quantity_mw"],
            "delivery_timeline": b["delivery_timeline"],
            "notes": b.get("notes", ""),
            "specs": b.get("specs", {})
        }
        for b in bids
    ]

    prompt = f"""You are an expert energy procurement analyst for a B2B energy trading platform.

RFQ Requirements:
{json.dumps(rfq_summary, indent=2)}

Vendor Bids Received:
{json.dumps(bids_summary, indent=2)}

Analyze each bid and provide:
1. A score from 0-100 (higher = better match)
2. Key strengths of the bid
3. Gap analysis (what is missing or concerning vs requirements)
4. A short recommendation

Respond ONLY with valid JSON in exactly this format:
{{
  "rankings": [
    {{
      "bid_id": "bid_id_here",
      "score": 85,
      "strengths": ["competitive price", "meets quantity requirement"],
      "gaps": ["delivery timeline is longer than needed"],
      "recommendation": "Strong candidate - competitive pricing and full quantity coverage"
    }}
  ],
  "summary": "Overall market analysis summary in 2-3 sentences",
  "best_bid_id": "bid_id_here"
}}"""

    try:
        chat = LlmChat(
            api_key=os.environ.get("EMERGENT_LLM_KEY"),
            session_id=f"ai_rank_{rfq_id}_{uuid.uuid4().hex[:8]}",
            system_message="You are an expert energy procurement analyst. Always respond with valid JSON only, no markdown."
        ).with_model("anthropic", "claude-haiku-4-5-20251001")

        response_text = await chat.send_message(UserMessage(text=prompt))

        clean = response_text.strip()
        if "```" in clean:
            start = clean.find("{")
            end = clean.rfind("}") + 1
            clean = clean[start:end]
        ai_result = json.loads(clean)
    except Exception as e:
        logger.error(f"AI ranking error: {e}")
        ai_result = {
            "rankings": [{"bid_id": b["bid_id"], "score": 50, "strengths": [], "gaps": [], "recommendation": "Manual review required"} for b in bids],
            "summary": "AI analysis unavailable. Please review bids manually.",
            "best_bid_id": bids[0]["bid_id"] if bids else None
        }

    for ranking in ai_result.get("rankings", []):
        await db.bids.update_one(
            {"bid_id": ranking["bid_id"]},
            {"$set": {
                "ai_score": ranking.get("score"),
                "ai_analysis": {
                    "strengths": ranking.get("strengths", []),
                    "gaps": ranking.get("gaps", []),
                    "recommendation": ranking.get("recommendation", "")
                }
            }}
        )

    await db.rfqs.update_one(
        {"rfq_id": rfq_id},
        {"$set": {"ai_analysis_summary": ai_result.get("summary"), "best_bid_id": ai_result.get("best_bid_id")}}
    )
    return ai_result

@api_router.patch("/rfqs/{rfq_id}/bids/{bid_id}/shortlist")
async def toggle_shortlist_bid(rfq_id: str, bid_id: str, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    bid = await db.bids.find_one({"bid_id": bid_id}, {"_id": 0})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    if bid["status"] in ["accepted", "rejected", "contract_signed", "contract_declined"]:
        raise HTTPException(status_code=400, detail="Cannot change status of a finalized bid")

    new_status = "submitted" if bid["status"] == "shortlisted" else "shortlisted"
    await db.bids.update_one({"bid_id": bid_id}, {"$set": {"status": new_status}})

    if new_status == "shortlisted":
        await create_notification(
            bid["vendor_id"], "bid_shortlisted", "Your Bid Was Shortlisted!",
            f"Great news! Your bid for '{rfq['title']}' has been shortlisted by the client.",
            link=f"/vendor/rfqs/{rfq_id}"
        )

    return {"message": f"Bid {new_status}", "status": new_status}

@api_router.patch("/rfqs/{rfq_id}/bids/{bid_id}/status")
async def update_bid_status(rfq_id: str, bid_id: str, data: BidStatusUpdate, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    await db.bids.update_one({"bid_id": bid_id}, {"$set": {"status": data.status}})
    if data.status == "accepted":
        await db.rfqs.update_one({"rfq_id": rfq_id}, {"$set": {"status": "awarded", "awarded_bid_id": bid_id}})
    return {"message": "Bid status updated"}

@api_router.post("/rfqs/{rfq_id}/award/{bid_id}")
async def award_contract(rfq_id: str, bid_id: str, data: AwardBid, request: Request):
    user = await get_current_user(request)
    rfq = await db.rfqs.find_one({"rfq_id": rfq_id}, {"_id": 0})
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq["client_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    if rfq["status"] not in ["open", "bidding_closed"]:
        raise HTTPException(status_code=400, detail="RFQ is not in a state to award")

    bid = await db.bids.find_one({"bid_id": bid_id}, {"_id": 0})
    if not bid:
        raise HTTPException(status_code=404, detail="Bid not found")

    contract_id = generate_id("con_")
    # Estimate total value: price * quantity * 8760 hours/year (approximate annual MWh)
    approx_annual_mwh = bid["quantity_mw"] * 8760 * 0.25  # 25% capacity factor
    total_value = round(bid["price_per_unit"] * approx_annual_mwh * 1000, 2)  # kWh to MWh conversion

    contract = {
        "contract_id": contract_id,
        "rfq_id": rfq_id,
        "rfq_title": rfq["title"],
        "bid_id": bid_id,
        "client_id": rfq["client_id"],
        "client_name": rfq["client_name"],
        "client_company": rfq.get("client_company", ""),
        "vendor_id": bid["vendor_id"],
        "vendor_name": bid["vendor_name"],
        "vendor_company": bid["vendor_company"],
        "energy_type": rfq["energy_type"],
        "quantity_mw": rfq["quantity_mw"],
        "price_per_unit": bid["price_per_unit"],
        "estimated_annual_value_inr": total_value,
        "delivery_location": rfq["delivery_location"],
        "start_date": rfq["start_date"],
        "end_date": rfq["end_date"],
        "delivery_timeline": bid["delivery_timeline"],
        "contract_terms": data.contract_terms or "Standard RERC/CERC terms apply. Governed by Indian Electricity Act 2003 and applicable MNRE regulations.",
        "delivery_milestones": data.delivery_milestones or [],
        "payment_schedule": data.payment_schedule or "Net 30 days from invoice date",
        "status": "pending_vendor_acceptance",
        "vendor_response": None,
        "vendor_notes": None,
        "responded_at": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.contracts.insert_one(contract)

    # Update RFQ status
    await db.rfqs.update_one(
        {"rfq_id": rfq_id},
        {"$set": {"status": "awarded", "awarded_bid_id": bid_id, "contract_id": contract_id, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    # Accept winner bid
    await db.bids.update_one({"bid_id": bid_id}, {"$set": {"status": "accepted", "contract_id": contract_id}})
    # Reject all other bids
    await db.bids.update_many(
        {"rfq_id": rfq_id, "bid_id": {"$ne": bid_id}, "status": {"$nin": ["accepted"]}},
        {"$set": {"status": "rejected"}}
    )

    # Notify winning vendor
    await create_notification(
        bid["vendor_id"], "contract_awarded", "Contract Awarded to You!",
        f"Congratulations! You have been awarded the contract for '{rfq['title']}'. Please review and accept.",
        link=f"/vendor/rfqs/{rfq_id}",
        data={"contract_id": contract_id}
    )

    # Notify other vendors
    other_bids = await db.bids.find({"rfq_id": rfq_id, "bid_id": {"$ne": bid_id}}, {"_id": 0}).to_list(200)
    for ob in other_bids:
        await create_notification(
            ob["vendor_id"], "bid_rejected", "Bid Not Selected",
            f"Your bid for '{rfq['title']}' was not selected this time. Thank you for participating.",
            link=f"/vendor/rfqs/{rfq_id}"
        )

    # Email winning vendor
    vendor_user = await db.users.find_one({"user_id": bid["vendor_id"]}, {"_id": 0})
    if vendor_user:
        body = f"""<p>Dear {bid['vendor_name']},</p>
        <p>Congratulations! Your bid has been selected and a contract has been created for:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">RFQ</td><td style="padding:8px;color:#e2e8f0;border-bottom:1px solid #1e293b">{rfq['title']}</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Energy Type</td><td style="padding:8px;color:#e2e8f0;border-bottom:1px solid #1e293b">{rfq['energy_type'].replace('_',' ').title()}</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Quantity</td><td style="padding:8px;color:#e2e8f0;border-bottom:1px solid #1e293b">{rfq['quantity_mw']} MW</td></tr>
          <tr><td style="padding:8px;color:#64748b;border-bottom:1px solid #1e293b">Price</td><td style="padding:8px;color:#0ea5e9;border-bottom:1px solid #1e293b">₹{bid['price_per_unit']}/kWh</td></tr>
          <tr><td style="padding:8px;color:#64748b">Location</td><td style="padding:8px;color:#e2e8f0">{rfq['delivery_location']}</td></tr>
        </table>
        <p>Please log in to Renergizr to <strong>review and accept the contract</strong> within 48 hours.</p>"""
        await send_email_notification(vendor_user["email"], f"Contract Awarded: {rfq['title']}", email_base_html("You've Been Awarded a Contract!", body))

    return {k: v for k, v in contract.items() if k != "_id"}

# ---- CONTRACT ENDPOINTS ----

@api_router.get("/contracts")
async def get_contracts(request: Request):
    user = await get_current_user(request)
    if user["role"] == "client":
        contracts = await db.contracts.find({"client_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    elif user["role"] == "vendor":
        contracts = await db.contracts.find({"vendor_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    else:
        contracts = await db.contracts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return contracts

@api_router.get("/contracts/{contract_id}")
async def get_contract(contract_id: str, request: Request):
    user = await get_current_user(request)
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract["client_id"] != user["user_id"] and contract["vendor_id"] != user["user_id"] and user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    return contract

@api_router.post("/contracts/{contract_id}/respond")
async def respond_to_contract(contract_id: str, data: ContractResponseRequest, request: Request):
    user = await get_current_user(request)
    contract = await db.contracts.find_one({"contract_id": contract_id}, {"_id": 0})
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
    if contract["vendor_id"] != user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    if contract["status"] != "pending_vendor_acceptance":
        raise HTTPException(status_code=400, detail="Contract already responded to")

    new_status = "active" if data.accept else "vendor_declined"
    await db.contracts.update_one(
        {"contract_id": contract_id},
        {"$set": {
            "status": new_status,
            "vendor_response": "accepted" if data.accept else "declined",
            "vendor_notes": data.notes,
            "responded_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )

    bid_status = "contract_signed" if data.accept else "contract_declined"
    await db.bids.update_one({"bid_id": contract["bid_id"]}, {"$set": {"status": bid_status}})

    action = "accepted" if data.accept else "declined"
    await create_notification(
        contract["client_id"], "contract_response", f"Contract {action.capitalize()} by Vendor",
        f"{contract['vendor_company']} has {action} the contract for '{contract['rfq_title']}' ({contract['energy_type']}, {contract['quantity_mw']} MW).",
        link=f"/client/rfqs/{contract['rfq_id']}"
    )

    # Email client
    client_user = await db.users.find_one({"user_id": contract["client_id"]}, {"_id": 0})
    if client_user:
        if data.accept:
            body = f"""<p>Dear {contract['client_name']},</p>
            <p><strong style="color:#10b981">{contract['vendor_company']}</strong> has accepted the contract for <strong style="color:#0ea5e9">{contract['rfq_title']}</strong>.</p>
            <p>The contract is now <strong>Active</strong>. Energy delivery will proceed as per agreed terms.</p>
            {'<p>Vendor notes: ' + data.notes + '</p>' if data.notes else ''}"""
            await send_email_notification(client_user["email"], f"Contract Accepted: {contract['rfq_title']}", email_base_html("Contract Accepted!", body))
        else:
            body = f"""<p>Dear {contract['client_name']},</p>
            <p>{contract['vendor_company']} has declined the contract for <strong style="color:#0ea5e9">{contract['rfq_title']}</strong>.</p>
            {'<p>Reason: ' + data.notes + '</p>' if data.notes else ''}
            <p>Please log in to Renergizr to review other bids and award the contract to an alternative vendor.</p>"""
            await send_email_notification(client_user["email"], f"Contract Declined: {contract['rfq_title']}", email_base_html("Contract Declined by Vendor", body))

    return {"message": f"Contract {action}", "status": new_status}

# ---- VENDOR PROFILE & DOCUMENTS ----

@api_router.get("/vendor/profile")
async def get_vendor_profile(request: Request):
    user = await get_current_user(request)
    profile = await db.vendor_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.put("/vendor/profile")
async def update_vendor_profile(data: VendorProfileUpdate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can update profiles")
    update_data = data.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.vendor_profiles.update_one({"user_id": user["user_id"]}, {"$set": update_data}, upsert=True)
    profile = await db.vendor_profiles.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return profile

@api_router.post("/vendor/documents/upload")
async def upload_document(data: DocumentUpload, request: Request):
    user = await get_current_user(request)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can upload documents")

    try:
        base64.b64decode(data.data_base64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    doc_id = generate_id("doc_")
    doc = {
        "doc_id": doc_id,
        "user_id": user["user_id"],
        "doc_type": data.doc_type,
        "filename": data.filename,
        "data_base64": data.data_base64,
        "size_bytes": data.size_bytes or 0,
        "status": "uploaded",
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }
    await db.vendor_documents.replace_one(
        {"user_id": user["user_id"], "doc_type": data.doc_type},
        doc, upsert=True
    )

    # Mark doc type in vendor profile
    await db.vendor_profiles.update_one(
        {"user_id": user["user_id"]},
        {"$addToSet": {"regulatory_docs": data.doc_type}}
    )

    result = {k: v for k, v in doc.items() if k not in ["_id", "data_base64"]}
    return result

@api_router.get("/vendor/documents")
async def get_vendor_documents(request: Request):
    user = await get_current_user(request)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can view documents")
    docs = await db.vendor_documents.find({"user_id": user["user_id"]}, {"_id": 0, "data_base64": 0}).to_list(50)
    return docs

@api_router.get("/vendor/bids")
async def get_my_bids(request: Request):
    user = await get_current_user(request)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendors can view their bids")
    bids = await db.bids.find({"vendor_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(200)
    enriched = []
    for bid in bids:
        rfq = await db.rfqs.find_one({"rfq_id": bid["rfq_id"]}, {"_id": 0, "title": 1, "energy_type": 1, "delivery_location": 1, "status": 1, "quantity_mw": 1})
        contract = None
        if bid.get("contract_id"):
            contract = await db.contracts.find_one({"contract_id": bid["contract_id"]}, {"_id": 0})
        enriched.append({**bid, "rfq": rfq, "contract": contract})
    return enriched

# ---- NOTIFICATIONS ----

@api_router.get("/notifications")
async def get_notifications(request: Request):
    user = await get_current_user(request)
    notifs = await db.notifications.find({"user_id": user["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    unread = await db.notifications.count_documents({"user_id": user["user_id"], "read": False})
    return {"notifications": notifs, "unread_count": unread}

@api_router.patch("/notifications/{notif_id}/read")
async def mark_notification_read(notif_id: str, request: Request):
    user = await get_current_user(request)
    await db.notifications.update_one({"notif_id": notif_id, "user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"message": "Marked as read"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(request: Request):
    user = await get_current_user(request)
    await db.notifications.update_many({"user_id": user["user_id"]}, {"$set": {"read": True}})
    return {"message": "All notifications marked as read"}

# ---- ADMIN ENDPOINTS ----

@api_router.get("/admin/users")
async def admin_list_users(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(500)
    return users

@api_router.patch("/admin/users/{target_user_id}")
async def admin_update_user(target_user_id: str, data: AdminUserUpdate, request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data")
    await db.users.update_one({"user_id": target_user_id}, {"$set": update_data})
    if "verification_status" in update_data:
        await db.vendor_profiles.update_one({"user_id": target_user_id}, {"$set": {"verification_status": update_data["verification_status"]}})
        # Send notification to vendor
        status = update_data["verification_status"]
        if status == "verified":
            await create_notification(
                target_user_id, "vendor_verified", "Profile Verified!",
                "Your vendor profile has been verified by Renergizr. You now have full access to bid on all RFQs.",
            )
            target_user = await db.users.find_one({"user_id": target_user_id}, {"_id": 0})
            if target_user:
                body = f"""<p>Dear {target_user['name']},</p>
                <p>Your vendor profile on Renergizr has been <strong style="color:#10b981">verified</strong>!</p>
                <p>You now have full marketplace access and can bid on all open RFQs. Your CCTS certification status is visible to buyers.</p>"""
                await send_email_notification(target_user["email"], "Vendor Profile Verified - Renergizr", email_base_html("Profile Verified!", body))
        elif status == "rejected":
            await create_notification(
                target_user_id, "vendor_rejected", "Verification Update",
                "Your vendor profile verification requires additional documentation. Please update your compliance documents.",
            )
    return {"message": "User updated"}

@api_router.get("/admin/vendors")
async def admin_list_vendors(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    vendors = await db.vendor_profiles.find({}, {"_id": 0}).to_list(500)
    enriched = []
    for v in vendors:
        u = await db.users.find_one({"user_id": v["user_id"]}, {"_id": 0, "email": 1, "name": 1, "is_active": 1, "created_at": 1})
        enriched.append({**v, "user": u})
    return enriched

@api_router.get("/admin/analytics")
async def admin_analytics(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    total_users = await db.users.count_documents({})
    total_clients = await db.users.count_documents({"role": "client"})
    total_vendors = await db.users.count_documents({"role": "vendor"})
    total_rfqs = await db.rfqs.count_documents({})
    open_rfqs = await db.rfqs.count_documents({"status": "open"})
    awarded_rfqs = await db.rfqs.count_documents({"status": "awarded"})
    total_bids = await db.bids.count_documents({})
    total_contracts = await db.contracts.count_documents({})
    active_contracts = await db.contracts.count_documents({"status": "active"})
    pending_vendors = await db.vendor_profiles.count_documents({"verification_status": "pending"})
    verified_vendors = await db.vendor_profiles.count_documents({"verification_status": "verified"})
    return {
        "total_users": total_users,
        "total_clients": total_clients,
        "total_vendors": total_vendors,
        "total_rfqs": total_rfqs,
        "open_rfqs": open_rfqs,
        "awarded_rfqs": awarded_rfqs,
        "total_bids": total_bids,
        "total_contracts": total_contracts,
        "active_contracts": active_contracts,
        "pending_vendors": pending_vendors,
        "verified_vendors": verified_vendors
    }

@api_router.get("/admin/rfqs")
async def admin_list_rfqs(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    rfqs = await db.rfqs.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return rfqs

@api_router.get("/admin/contracts")
async def admin_list_contracts(request: Request):
    user = await get_current_user(request)
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    contracts = await db.contracts.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return contracts

# ---- MARKET INSIGHTS ----

@api_router.get("/market/insights")
async def market_insights(request: Request):
    return {
        "energy_prices": [
            {"type": "Solar", "price": 2.85, "change": 0.05, "change_pct": 1.79, "unit": "₹/kWh", "trend": "up"},
            {"type": "Wind", "price": 3.12, "change": -0.08, "change_pct": -2.50, "unit": "₹/kWh", "trend": "down"},
            {"type": "Hydro", "price": 2.45, "change": 0.02, "change_pct": 0.82, "unit": "₹/kWh", "trend": "up"},
            {"type": "Thermal", "price": 4.20, "change": 0.15, "change_pct": 3.70, "unit": "₹/kWh", "trend": "up"},
            {"type": "Green H2", "price": 5.80, "change": -0.22, "change_pct": -3.65, "unit": "₹/kWh", "trend": "down"},
        ],
        "carbon": {
            "ccts_price": 245.50,
            "ccts_change": 12.30,
            "ccts_change_pct": 5.27,
            "unit": "₹/tCO2e",
            "eu_cbam": 68.50,
            "eu_cbam_change": 1.20,
            "eu_cbam_unit": "EUR/tCO2e",
            "india_budget_crore": 20000,
            "trading_scheme": "CCTS"
        },
        "market_stats": {
            "active_rfqs_india": 142,
            "registered_vendors": 523,
            "total_mw_traded": 8540,
            "avg_bid_response_hours": 36,
            "yoy_growth_pct": 34
        },
        "price_history": [
            {"month": "Aug", "solar": 3.10, "wind": 3.35, "carbon": 210},
            {"month": "Sep", "solar": 3.05, "wind": 3.28, "carbon": 218},
            {"month": "Oct", "solar": 2.98, "wind": 3.22, "carbon": 225},
            {"month": "Nov", "solar": 2.92, "wind": 3.18, "carbon": 232},
            {"month": "Dec", "solar": 2.88, "wind": 3.15, "carbon": 238},
            {"month": "Jan", "solar": 2.85, "wind": 3.12, "carbon": 245},
        ]
    }

# ---- GRID MONITORING — Scope MOU 1.1.f ----
# "5G/6G low-latency communication architecture for real-time grid balancing"
# Frontend polls this every 2 seconds to simulate a low-latency 5G/6G telemetry stream.
# Production: replace simulation with SCADA / NLDC API via 5G/6G edge gateway.

@api_router.get("/grid/status")
async def get_grid_status(request: Request):
    """
    Real-time grid balancing data for the GridMonitor admin dashboard.
    Simulates: frequency, voltage, renewable mix, regional load, latency, events.
    """
    import random

    freq     = round(50.0 + random.uniform(-0.20, 0.20), 4)   # India nominal: 50.0 Hz
    latency  = round(random.uniform(0.28, 0.95), 3)            # 5G/6G target: <1 ms
    voltage  = round(220.0 + random.uniform(-3.0, 3.0), 2)     # 220 kV nominal

    # Grid stability derived from frequency deviation from 50 Hz
    deviation = abs(freq - 50.0)
    if   deviation < 0.10: stability = "stable"
    elif deviation < 0.25: stability = "warning"
    else:                  stability = "critical"

    # Renewable energy mix (must sum to 100)
    solar   = random.randint(33, 48)
    wind    = random.randint(24, 34)
    hydro   = random.randint(9, 16)
    thermal = 100 - solar - wind - hydro

    active_nodes = random.randint(120, 138)   # connected 5G/6G edge nodes
    total_load   = random.randint(4100, 4900) # MW

    now = datetime.now(timezone.utc).isoformat()

    events = [
        {"timestamp": now, "severity": "info",
         "message": f"Grid frequency: {freq} Hz — {'nominal' if stability == 'stable' else 'deviation detected, balancing active'}"},
        {"timestamp": now, "severity": "action",
         "message": f"5G/6G sync: {active_nodes} edge nodes balanced across regional grid"},
        {"timestamp": now, "severity": "info",
         "message": f"Renewable mix: Solar {solar}%, Wind {wind}%, Hydro {hydro}%, Thermal {thermal}%"},
    ]
    if stability != "stable":
        events.insert(0, {"timestamp": now, "severity": "warning",
                          "message": f"Frequency deviation {freq:.3f} Hz — auto-balancing engaged via 5G control plane"})

    regions = [
        {"name": "North India", "load_mw": random.randint(1200, 1600), "load_pct": random.randint(58, 88), "nodes": random.randint(38, 46)},
        {"name": "South India", "load_mw": random.randint(1000, 1400), "load_pct": random.randint(52, 82), "nodes": random.randint(30, 40)},
        {"name": "West India",  "load_mw": random.randint(900,  1200), "load_pct": random.randint(48, 78), "nodes": random.randint(26, 36)},
        {"name": "East India",  "load_mw": random.randint(700,  1000), "load_pct": random.randint(44, 74), "nodes": random.randint(22, 30)},
    ]

    return {
        "frequency_hz":    freq,
        "voltage_kv":      voltage,
        "total_load_mw":   total_load,
        "grid_stability":  stability,
        "latency_ms":      latency,
        "active_nodes":    active_nodes,
        "renewable_mix":   {"solar": solar, "wind": wind, "hydro": hydro, "thermal": thermal},
        "events":          events,
        "regions":         regions,
        "timestamp":       now,
    }


# ---- CONTACT FORM — Scope MOU 1.1.i (Static company website) ----
# Stores contact enquiries from the Landing page contact form.

class ContactMessage(BaseModel):
    name:    str
    email:   str
    company: Optional[str] = None
    message: str

@api_router.post("/contact")
async def submit_contact(msg: ContactMessage):
    """Saves a contact form submission from the public Landing page."""
    doc = {
        "contact_id": generate_id("cnt_"),
        "name":       msg.name,
        "email":      msg.email,
        "company":    msg.company,
        "message":    msg.message,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status":     "new",
    }
    await db.contacts.insert_one(doc)
    logger.info(f"Contact form submission from {msg.email}")
    return {"success": True, "message": "Thank you! We will be in touch shortly."}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    mongo_client.close()
