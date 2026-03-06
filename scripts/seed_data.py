#!/usr/bin/env python3
"""
Seed script for Renergizr B2B Energy Trading Platform.
Creates admin user, sample clients, vendors, RFQs and bids.
"""
import asyncio
import uuid
from datetime import datetime, timezone
import bcrypt
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pathlib import Path
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent.parent / 'backend'
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
db_name = os.environ['DB_NAME']

def generate_id(prefix=""):
    return f"{prefix}{uuid.uuid4().hex[:12]}"

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

async def seed():
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    print("Clearing existing seed data...")
    await db.users.delete_many({"email": {"$in": [
        "admin@renergizr.com", "buyer1@acme.com", "vendor1@greensun.com",
        "vendor2@windpower.com", "buyer2@tatapower.com"
    ]}})
    await db.user_sessions.delete_many({})

    now = datetime.now(timezone.utc).isoformat()

    # Admin user
    admin_id = generate_id("usr_")
    await db.users.insert_one({
        "user_id": admin_id,
        "email": "admin@renergizr.com",
        "name": "Platform Admin",
        "role": "admin",
        "company": "Renergizr Industries",
        "picture": None,
        "password_hash": hash_password("Admin@123"),
        "is_active": True,
        "created_at": now
    })
    print(f"Admin created: admin@renergizr.com / Admin@123")

    # Client 1
    client1_id = generate_id("usr_")
    await db.users.insert_one({
        "user_id": client1_id,
        "email": "buyer1@acme.com",
        "name": "Rajesh Kumar",
        "role": "client",
        "company": "ACME Industries Ltd",
        "picture": None,
        "password_hash": hash_password("Client@123"),
        "is_active": True,
        "created_at": now
    })
    print(f"Client 1 created: buyer1@acme.com / Client@123")

    # Client 2
    client2_id = generate_id("usr_")
    await db.users.insert_one({
        "user_id": client2_id,
        "email": "buyer2@tatapower.com",
        "name": "Priya Sharma",
        "role": "client",
        "company": "Tata Power Corp",
        "picture": None,
        "password_hash": hash_password("Client@123"),
        "is_active": True,
        "created_at": now
    })

    # Vendor 1
    vendor1_id = generate_id("usr_")
    await db.users.insert_one({
        "user_id": vendor1_id,
        "email": "vendor1@greensun.com",
        "name": "Amit Patel",
        "role": "vendor",
        "company": "GreenSun Energy Pvt Ltd",
        "picture": None,
        "password_hash": hash_password("Vendor@123"),
        "is_active": True,
        "created_at": now
    })
    v1_profile_id = generate_id("vnd_")
    await db.vendor_profiles.insert_one({
        "vendor_id": v1_profile_id,
        "user_id": vendor1_id,
        "company_name": "GreenSun Energy Pvt Ltd",
        "description": "Leading solar energy provider with 10+ years of experience. Specialized in utility-scale solar parks across Rajasthan and Gujarat.",
        "energy_types": ["solar"],
        "capacity_mw": 850,
        "certifications": ["MNRE Approved", "ISO 14001", "BEE 5-Star"],
        "regulatory_docs": ["CEA License", "CERC Registration"],
        "carbon_credits": 12500,
        "verification_status": "verified",
        "contact_email": "vendor1@greensun.com",
        "contact_phone": "+91 98765 11111",
        "website": "https://greensun.energy",
        "location": "Jaipur, Rajasthan",
        "created_at": now
    })
    print(f"Vendor 1 created: vendor1@greensun.com / Vendor@123")

    # Vendor 2
    vendor2_id = generate_id("usr_")
    await db.users.insert_one({
        "user_id": vendor2_id,
        "email": "vendor2@windpower.com",
        "name": "Suresh Menon",
        "role": "vendor",
        "company": "WindForce Technologies",
        "picture": None,
        "password_hash": hash_password("Vendor@123"),
        "is_active": True,
        "created_at": now
    })
    v2_profile_id = generate_id("vnd_")
    await db.vendor_profiles.insert_one({
        "vendor_id": v2_profile_id,
        "user_id": vendor2_id,
        "company_name": "WindForce Technologies",
        "description": "India's premier wind energy solutions provider. Operating 500+ MW across Tamil Nadu, Maharashtra and Karnataka.",
        "energy_types": ["wind"],
        "capacity_mw": 620,
        "certifications": ["MNRE Approved", "ISO 50001", "GreenPro"],
        "regulatory_docs": ["CEA License", "SECI PPA"],
        "carbon_credits": 8200,
        "verification_status": "pending",
        "contact_email": "vendor2@windpower.com",
        "contact_phone": "+91 98765 22222",
        "website": "https://windforce.in",
        "location": "Chennai, Tamil Nadu",
        "created_at": now
    })
    print(f"Vendor 2 created: vendor2@windpower.com / Vendor@123")

    # RFQs
    rfq1_id = generate_id("rfq_")
    await db.rfqs.insert_one({
        "rfq_id": rfq1_id,
        "client_id": client1_id,
        "client_name": "Rajesh Kumar",
        "client_company": "ACME Industries Ltd",
        "title": "Solar Power Supply - 100 MW Rajasthan",
        "description": "ACME Industries seeks a reliable solar power vendor to supply 100 MW of grid-connected solar power at our Jodhpur facility. 25-year PPA preferred.",
        "energy_type": "solar",
        "quantity_mw": 100,
        "delivery_location": "Jodhpur, Rajasthan",
        "start_date": "2026-06-01",
        "end_date": "2051-05-31",
        "price_ceiling": 3.50,
        "specs": {"voltage_kv": "33", "phase": "3-phase"},
        "logistics": {"grid_connection": "DISCOM", "land_acquired": True},
        "financial_terms": {"payment_terms": "monthly", "advance_percent": "10"},
        "add_on_services": ["Grid Integration", "O&M Support"],
        "status": "open",
        "bid_count": 0,
        "ai_analysis_summary": None,
        "best_bid_id": None,
        "created_at": now,
        "updated_at": now
    })

    rfq2_id = generate_id("rfq_")
    await db.rfqs.insert_one({
        "rfq_id": rfq2_id,
        "client_id": client2_id,
        "client_name": "Priya Sharma",
        "client_company": "Tata Power Corp",
        "title": "Wind Energy Procurement - 250 MW Tamil Nadu",
        "description": "Tata Power seeks competitive bids for 250 MW wind energy supply from Tamil Nadu region. ISTS connectivity required.",
        "energy_type": "wind",
        "quantity_mw": 250,
        "delivery_location": "Tamil Nadu",
        "start_date": "2026-09-01",
        "end_date": "2046-08-31",
        "price_ceiling": 3.20,
        "specs": {"voltage_kv": "220", "phase": "3-phase"},
        "logistics": {},
        "financial_terms": {"payment_terms": "monthly", "advance_percent": "5"},
        "add_on_services": ["Storage", "Commissioning"],
        "status": "open",
        "bid_count": 0,
        "ai_analysis_summary": None,
        "best_bid_id": None,
        "created_at": now,
        "updated_at": now
    })

    print(f"RFQs created: {rfq1_id}, {rfq2_id}")
    print("\n=== SEED COMPLETE ===")
    print("Login credentials:")
    print("  Admin:    admin@renergizr.com    / Admin@123")
    print("  Client 1: buyer1@acme.com        / Client@123")
    print("  Client 2: buyer2@tatapower.com   / Client@123")
    print("  Vendor 1: vendor1@greensun.com   / Vendor@123")
    print("  Vendor 2: vendor2@windpower.com  / Vendor@123")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed())
