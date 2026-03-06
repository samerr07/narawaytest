/**
 * seed.js — Database seeding for development and testing
 *
 * Run: node src/seed.js
 *
 * Creates:
 *   1 Admin user
 *   2 Client (buyer) users
 *   2 Vendor users + vendor profiles
 *   2 sample RFQs
 *
 * Test credentials (matches Python backend seed for frontend compatibility):
 *   Admin:    admin@renergizr.com   / Admin@123
 *   Client 1: buyer1@acme.com       / Client@123
 *   Client 2: buyer2@tatapower.com  / Client@123
 *   Vendor 1: vendor1@greensun.com  / Vendor@123
 *   Vendor 2: vendor2@windpower.com / Vendor@123
 */

require('dotenv').config();
const bcrypt  = require('bcryptjs');
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { generateId } = require('./utils/helpers');
const User    = require('./models/User');
const VendorProfile = require('./models/VendorProfile');
const RFQ     = require('./models/RFQ');

async function seed() {
  await connectDB();

  // Clear existing seed data (only for dev — check NODE_ENV before allowing this in prod)
  if (process.env.NODE_ENV === 'production') {
    console.error('Seed script must not run in production!');
    process.exit(1);
  }

  console.log('Clearing existing data...');
  await Promise.all([User.deleteMany({}), VendorProfile.deleteMany({}), RFQ.deleteMany({})]);

  const hash = async p => bcrypt.hash(p, 12);

  console.log('Creating users...');
  const [admin, client1, client2, vendor1User, vendor2User] = await User.insertMany([
    { user_id: generateId('usr_'), name: 'Platform Admin',   email: 'admin@renergizr.com',   password: await hash('Admin@123'),  role: 'admin' },
    { user_id: generateId('usr_'), name: 'Rahul Mehta',      email: 'buyer1@acme.com',        password: await hash('Client@123'), role: 'client', company: 'ACME Corp' },
    { user_id: generateId('usr_'), name: 'Priya Shah',       email: 'buyer2@tatapower.com',   password: await hash('Client@123'), role: 'client', company: 'Tata Power' },
    { user_id: generateId('usr_'), name: 'Arvind Kumar',     email: 'vendor1@greensun.com',   password: await hash('Vendor@123'), role: 'vendor', company: 'GreenSun Energy' },
    { user_id: generateId('usr_'), name: 'Sneha Iyer',       email: 'vendor2@windpower.com',  password: await hash('Vendor@123'), role: 'vendor', company: 'WindPower India' },
  ]);

  console.log('Creating vendor profiles...');
  await VendorProfile.insertMany([
    {
      vendor_id:    generateId('vnd_'), user_id: vendor1User.user_id,
      company_name: 'GreenSun Energy', description: 'Leading solar energy provider with 500MW capacity',
      location: 'Rajasthan, India', energy_types: ['solar'], capacity_mw: 500,
      carbon_credits_ccts: 12500, certifications: ['ISO 14001', 'BEE 5-star', 'GreenPro'],
      verification_status: 'verified',
    },
    {
      vendor_id:    generateId('vnd_'), user_id: vendor2User.user_id,
      company_name: 'WindPower India', description: 'Offshore and onshore wind energy specialist',
      location: 'Tamil Nadu, India', energy_types: ['wind'], capacity_mw: 250,
      carbon_credits_ccts: 3200, certifications: ['ISO 14001'],
      verification_status: 'pending',
    },
  ]);

  console.log('Creating sample RFQs...');
  await RFQ.insertMany([
    {
      rfq_id: generateId('rfq_'), client_id: client1.user_id, client_name: client1.name,
      title: 'Solar Power Supply — Maharashtra Plant', description: '100 MW solar procurement for Pune manufacturing facility',
      energy_type: 'solar', quantity_mw: 100, voltage_kv: 132, phase: '3-phase',
      add_on_services: ['Grid Integration', 'SCADA Monitoring'],
      delivery_location: 'Pune, Maharashtra', delivery_start_date: '2026-04-01', delivery_end_date: '2031-03-31',
      price_ceiling: 3.20, payment_terms: 'Quarterly', advance_payment_pct: 10, status: 'open',
    },
    {
      rfq_id: generateId('rfq_'), client_id: client2.user_id, client_name: client2.name,
      title: 'Wind Energy — Rajasthan Grid', description: '150 MW wind energy for grid injection',
      energy_type: 'wind', quantity_mw: 150, voltage_kv: 220, phase: '3-phase',
      delivery_location: 'Jaisalmer, Rajasthan', delivery_start_date: '2026-07-01', delivery_end_date: '2036-06-30',
      price_ceiling: 3.50, payment_terms: 'Monthly', advance_payment_pct: 15, status: 'open',
    },
  ]);

  console.log('✓ Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Admin:    admin@renergizr.com / Admin@123');
  console.log('  Client 1: buyer1@acme.com / Client@123');
  console.log('  Client 2: buyer2@tatapower.com / Client@123');
  console.log('  Vendor 1: vendor1@greensun.com / Vendor@123 (verified)');
  console.log('  Vendor 2: vendor2@windpower.com / Vendor@123 (pending)');

  await mongoose.disconnect();
}

seed().catch(err => { console.error(err); process.exit(1); });
