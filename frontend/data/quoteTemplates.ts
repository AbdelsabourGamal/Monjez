
import type { QuoteTemplate } from '../types';

export const quoteTemplates: QuoteTemplate[] = [
  {
    id: 'general-services',
    nameKey: 'quotes:templates.general-services.name',
    defaultItems: [
      { description: '', qty: 1, price: 0 },
    ],
  },
  {
    id: 'web-development',
    nameKey: 'quotes:templates.web-development.name',
    defaultItems: [
      { description: 'Website Design & UX/UI Mockups', qty: 1, price: 500 },
      { description: 'Frontend Development (React/Next.js)', qty: 80, price: 15 },
      { description: 'Backend Development (Node.js/Express)', qty: 60, price: 20 },
      { description: 'Database Setup & Management (PostgreSQL)', qty: 1, price: 300 },
      { description: 'Deployment & Hosting Setup', qty: 1, price: 200 },
    ],
  },
  {
    id: 'consulting-services',
    nameKey: 'quotes:templates.consulting-services.name',
    defaultItems: [
      { description: 'Initial Business Analysis & Strategy Session', qty: 4, price: 50 },
      { description: 'Market Research & Competitive Analysis Report', qty: 1, price: 800 },
      { description: 'Implementation Roadmap & Recommendations', qty: 10, price: 40 },
    ],
  },
  {
    id: 'graphic-design',
    nameKey: 'quotes:templates.graphic-design.name',
    defaultItems: [
      { description: 'Logo Design (3 Concepts & Revisions)', qty: 1, price: 300 },
      { description: 'Brand Identity & Style Guide', qty: 1, price: 450 },
      { description: 'Social Media Kit (Profile Pictures, Banners)', qty: 1, price: 150 },
    ],
  },
  {
    id: 'construction',
    nameKey: 'quotes:templates.construction.name',
    defaultItems: [
      { description: 'Site Preparation & Excavation', qty: 1, price: 2000 },
      { description: 'Foundation & Concrete Work', qty: 1, price: 5000 },
      { description: 'Structural Framing', qty: 1, price: 7500 },
      { description: 'Electrical & Plumbing Installation', qty: 1, price: 4000 },
    ],
  },
  {
    id: 'it-support',
    nameKey: 'quotes:templates.it-support.name',
    defaultItems: [
      { description: 'Monthly IT Support Retainer (up to 10 hours)', qty: 1, price: 400 },
      { description: 'On-site Emergency Support (per hour)', qty: 0, price: 75 },
      { description: 'Remote Assistance (per hour)', qty: 0, price: 50 },
    ],
  },
  {
    id: 'monthly-retainer',
    nameKey: 'quotes:templates.monthly-retainer.name',
    defaultItems: [
      { description: 'Monthly Consulting Retainer', qty: 1, price: 1500 },
    ],
  },
  {
    id: 'product-sale',
    nameKey: 'quotes:templates.product-sale.name',
    defaultItems: [
      { description: 'Product A', qty: 10, price: 25 },
      { description: 'Product B', qty: 5, price: 150 },
    ],
  },
  {
    id: 'event-photography',
    nameKey: 'quotes:templates.event-photography.name',
    defaultItems: [
      { description: 'Full-Day Event Coverage (8 hours)', qty: 1, price: 1200 },
      { description: 'Additional Photographer', qty: 0, price: 400 },
      { description: 'Photo Album (Hardcover, 50 pages)', qty: 1, price: 250 },
    ],
  },
  {
    id: 'social-media-management',
    nameKey: 'quotes:templates.social-media-management.name',
    defaultItems: [
      { description: 'Monthly Social Media Management Package (3 platforms)', qty: 1, price: 800 },
      { description: 'Content Creation (15 posts per month)', qty: 1, price: 600 },
      { description: 'Paid Ad Campaign Management', qty: 1, price: 300 },
    ],
  },
  {
    id: 'digital-marketing',
    nameKey: 'quotes:templates.digital-marketing.name',
    defaultItems: [
      { description: 'SEO Audit & Keyword Research', qty: 1, price: 600 },
      { description: 'Content Strategy Plan (Quarterly)', qty: 1, price: 450 },
      { description: 'Monthly Social Media Ads Management', qty: 1, price: 500 },
      { description: 'Email Marketing Campaign Setup & Automation', qty: 1, price: 400 },
    ],
  },
  {
    id: 'interior-design',
    nameKey: 'quotes:templates.interior-design.name',
    defaultItems: [
      { description: 'Initial Consultation & Site Visit', qty: 1, price: 150 },
      { description: 'Mood Board & Concept Design', qty: 1, price: 500 },
      { description: '3D Renderings (per room)', qty: 2, price: 300 },
      { description: 'Furniture & Materials Sourcing', qty: 1, price: 700 },
      { description: 'Project Management & Supervision', qty: 1, price: 1200 },
    ],
  },
  {
    id: 'catering-event',
    nameKey: 'quotes:templates.catering-event.name',
    defaultItems: [
      { description: 'Buffet Menu - International Cuisine (per person)', qty: 50, price: 15 },
      { description: 'Beverage Package - Juices & Water (per person)', qty: 50, price: 3 },
      { description: 'Service Staff (4 hours, per staff)', qty: 4, price: 60 },
      { description: 'Equipment Rental (tables, chairs, linens)', qty: 1, price: 250 },
    ],
  },
  {
    id: 'saas-subscription',
    nameKey: 'quotes:templates.saas-subscription.name',
    defaultItems: [
      { description: 'Basic Plan (Monthly Subscription)', qty: 1, price: 29 },
      { description: 'Professional Plan (Monthly Subscription)', qty: 0, price: 79 },
      { description: 'Enterprise Plan (Annual Subscription)', qty: 0, price: 1999 },
      { description: 'One-time Onboarding & Training Fee', qty: 1, price: 250 },
    ],
  },
  {
    id: 'video-production',
    nameKey: 'quotes:templates.video-production.name',
    defaultItems: [
      { description: 'Pre-production: Concept & Scripting', qty: 1, price: 400 },
      { description: 'Full-Day Filming Shoot (with equipment)', qty: 1, price: 1500 },
      { description: 'Video Editing & Post-production (up to 3 min video)', qty: 1, price: 800 },
      { description: 'Motion Graphics & Title Package', qty: 1, price: 350 },
      { description: 'Royalty-free Music License', qty: 1, price: 100 },
    ],
  },
  {
    id: 'car-rental',
    nameKey: 'quotes:templates.car-rental.name',
    defaultItems: [
      { description: 'Sedan (e.g., Toyota Camry) - Daily Rental', qty: 1, price: 12 },
      { description: 'SUV (e.g., Toyota Prado) - Daily Rental', qty: 0, price: 25 },
      { description: 'Full Insurance Coverage (per day)', qty: 1, price: 5 },
      { description: 'Additional Driver Fee (one-time)', qty: 0, price: 10 },
    ],
  },
  {
    id: 'printing-services',
    nameKey: 'quotes:templates.printing-services.name',
    defaultItems: [
      { description: 'Business Cards (500 pcs, double-sided, matte finish)', qty: 1, price: 15 },
      { description: 'A4 Flyers (1000 pcs, color, 150gsm)', qty: 1, price: 40 },
      { description: 'Roll-up Banner (85x200 cm, with stand)', qty: 1, price: 20 },
    ],
  },
];
