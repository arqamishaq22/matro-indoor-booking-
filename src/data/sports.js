/**
 * Development/mock fixture only. Production sports come from active database courts.
 *
 * Included sports:
 * - Cricket
 * - Football/Futsal
 * - Padel Tennis
 * - Pickleball
 * - Badminton
 *
 * Uses actual image filenames available in the public folder.
 */

export const sports = [
  {
    id: 'cricket',
    name: 'Cricket',
    shortName: 'Cricket',
    category: 'Team Sports',
    tagline: 'High-energy indoor box cricket with professional shock turf',
    description: 'Experience fast-paced indoor box cricket on professional shock-padded turf with automated pitch delivery systems and real-time score displays.',
    image: '/cricket-img.jpg',
    secondaryImage: '/cricket-img4.webp',
    startingPrice: 2000,
    unit: 'hr',
    players: '6 - 12 Players',
    rating: 4.9,
    badge: 'Most Popular',
    color: '#3b82f6',
    accentGradient: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    features: ['Professional Shock Turf', 'LED Arena Lighting', 'Digital Scoreboard', 'High Netting Enclosure']
  },
  {
    id: 'futsal',
    name: 'Football/Futsal',
    shortName: 'Football/Futsal',
    category: 'Team Sports',
    tagline: 'FIFA-grade synthetic turf with high-ceiling enclosure',
    description: 'Play intense 5v5 or 7v7 soccer matches on pristine FIFA-standard turf with high-tensile netting and spectator seating.',
    image: '/football-image.jfif',
    secondaryImage: '/football-img.jfif',
    startingPrice: 2500,
    unit: 'hr',
    players: '10 - 14 Players',
    rating: 4.8,
    badge: 'Pro Grade',
    color: '#10b981',
    accentGradient: 'linear-gradient(135deg, #10b981 0%, #047857 100%)',
    features: ['FIFA Standard Turf', 'Perimeter Cushioning', 'Match Recording', 'Locker Room Access']
  },
  {
    id: 'padel',
    name: 'Padel Tennis',
    shortName: 'Padel Tennis',
    category: 'Racquet Sports',
    tagline: 'Panoramic glass courts with anti-glare illumination',
    description: 'The fastest growing racquet sport! Play doubles in court-encased 12mm panoramic tempered glass arenas with WPT-certified blue turf.',
    image: '/padel-image4.jfif',
    secondaryImage: '/padal-image.jfif',
    startingPrice: 3000,
    unit: 'hr',
    players: '4 Players',
    rating: 4.9,
    badge: 'Trending',
    color: '#8b5cf6',
    accentGradient: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    features: ['Panoramic Tempered Glass', 'WPT Certified Blue Turf', 'Rental Rackets Available', 'Climate Controlled']
  },
  {
    id: 'pickleball',
    name: 'Pickleball',
    shortName: 'Pickleball',
    category: 'Racquet Sports',
    tagline: 'Cushioned acrylic surface for precision play',
    description: 'Enjoy fast-rally pickleball on custom-engineered acrylic court surfaces with zero glare, optimal bounce, and ergonomic lighting.',
    image: '/tails-ball.jfif',
    secondaryImage: '/tains-ball.jfif',
    startingPrice: 1500,
    unit: 'hr',
    players: '2 - 4 Players',
    rating: 4.7,
    badge: 'Easy to Play',
    color: '#f59e0b',
    accentGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    features: ['Acrylic Multi-layer Flooring', 'Official Net Dimensions', 'Paddles & Balls Provided', 'Air Conditioned']
  },
  {
    id: 'badminton',
    name: 'Badminton',
    shortName: 'Badminton',
    category: 'Racquet Sports',
    tagline: 'BWF-approved wooden floors with non-slip court mats',
    description: 'High-performance badminton courts featuring multi-layer spring maple wood underneath Yonex non-slip court mats to protect joints.',
    image: '/tains-ball1.jfif',
    secondaryImage: '/tains-bal.jfif',
    startingPrice: 1200,
    unit: 'hr',
    players: '2 - 4 Players',
    rating: 4.8,
    badge: 'BWF Approved',
    color: '#ec4899',
    accentGradient: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    features: ['Spring Maple Wood Base', 'Yonex Court Mats', 'Shadowless LED Lighting', 'Shuttlecock Shop']
  }
];

// Additional experiences (optional add-on)
export const additionalExperiences = [
  {
    id: 'ps5-gaming',
    name: 'PS5 VIP Gaming Lounge',
    shortName: 'PS5 Gaming',
    category: 'Esports & Lounge',
    isExperience: true,
    tagline: 'Next-gen gaming pod with 4K 120Hz displays & soundproof pods',
    description: 'Step into the ultimate gaming hub featuring PlayStation 5 consoles, ergonomic gaming chairs, DualSense controllers, and 4K 120Hz displays.',
    image: '/cricket-img4.webp',
    startingPrice: 800,
    unit: 'hr',
    players: '1 - 4 Players',
    rating: 5.0,
    badge: 'VIP Lounge',
    color: '#06b6d4',
    accentGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    features: ['PS5 Pro & DualSense Edge', '4K 120Hz Display', 'Soundproof Pod', 'Cafe Service']
  }
];

// Reusable exports for UI components
export const coreSports = sports;
export const sportsData = [...sports, ...additionalExperiences];

export default sportsData;
