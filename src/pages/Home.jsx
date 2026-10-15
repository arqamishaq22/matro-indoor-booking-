/**
 * Home.jsx
 * ─────────────────────────────────────────────────────────────────────────
 * Landing page composition. Each section is its own component — this file
 * only orchestrates the order and provides the page shell.
 *
 * Section order:
 *  1. Navbar              — sticky navigation header
 *  2. Hero                — headline, sport pills, CTAs
 *     └─ QuickBooking     — embedded inside Hero
 *  3. SportsSlider        — sports backed by active database courts (Swiper)
 *  4. VenueSlider         — venues loaded from the API (Swiper)
 *  5. AvailabilityPreview — live API availability grid (id="availability")
 *  6. WhyChooseUs         — 6 feature cards
 *  7. MembershipSection   — Bronze / Silver / Gold pricing
 *  8. ExperienceSection   — BaseCamp Cafe + PS5 Gaming
 *  9. FinalCTA            — booking call-to-action banner
 * 10. Footer
 * ─────────────────────────────────────────────────────────────────────────
 */

import React from 'react';

/* Layout */
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

/* Page sections */
import Hero                from '../components/home/Hero';
import SportsSlider        from '../components/sports/SportsSlider';
import VenueSlider         from '../components/venues/VenueSlider';
import AvailabilityPreview from '../components/home/AvailabilityPreview';
import WhyChooseUs         from '../components/home/WhyChooseUs';
import MembershipSection   from '../components/home/MembershipSection';
import ExperienceSection   from '../components/home/ExperienceSection';
import FinalCTA            from '../components/home/FinalCTA';

const Home = () => {
  return (
    <div className="matro-app-page min-h-screen flex flex-col">

      {/* Global sticky header */}
      <Navbar />

      {/* Page content */}
      <main id="main-content" className="flex-1">
        <Hero />
        <SportsSlider />
        <VenueSlider />
        <AvailabilityPreview />
        <WhyChooseUs />
        <MembershipSection />
        <ExperienceSection />
        <FinalCTA />
      </main>

      <Footer />
    </div>
  );
};

export default Home;
