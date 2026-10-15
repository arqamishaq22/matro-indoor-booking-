/**
 * venues.js
 * ─────────────────────────────────────────────────────────────────────────
 * Development/mock fixture only. Production venue data comes from the API.
 *
 * Venues:
 * - FR DHA Phase 5      (Lahore)
 * - FR Wapda Town       (Lahore)
 * - FR Valencia         (Lahore)
 * - Cross Courts        (Lahore)
 * - FR Sports Arena Sialkot (Sialkot)
 *
 * Amenity claims are limited to what is verifiable per spec.
 * Courts listed use standard surface descriptions only.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const cities = ['Lahore', 'Sialkot'];

export const cityFilters = [
  { id: 'all',     label: 'All Cities' },
  { id: 'Lahore',  label: 'Lahore'     },
  { id: 'Sialkot', label: 'Sialkot'    },
];

export const venues = [
  {
    id:              'fr-dha-phase-5',
    name:            'Matro DHA Phase 5',
    shortName:       'Matro DHA Phase 5',
    city:            'Lahore',
    location:        'DHA Phase 5, Lahore',
    address:         'Commercial Broadway, DHA Phase 5, Lahore, Punjab',
    image:           '/padal-image.jfif',
    rating:          4.9,
    reviewsCount:    342,
    startingPrice:   2000,
    unit:            'hr',
    availableCourts: 6,
    sports:          ['cricket', 'futsal', 'padel'],
    badge:           'Flagship Venue',
    operatingHours:  '06:00 AM – 02:00 AM',
    amenities: [
      'Panoramic Glass Padel Courts',
      'Professional Shock Turf Cricket',
      'FIFA-Grade Futsal Ground',
      'Locker & Shower Facilities',
      'BaseCamp Sports Cafe',
    ],
    courts: [
      { id: 'dha-c1', name: 'Box Cricket — Court 1', sport: 'cricket', type: 'Shock Pad Turf'     },
      { id: 'dha-c2', name: 'Box Cricket — Court 2', sport: 'cricket', type: 'Indoor Synthetic'   },
      { id: 'dha-f1', name: 'Futsal Arena A',         sport: 'futsal',  type: '4G AstroTurf'      },
      { id: 'dha-p1', name: 'Padel Glass Court 1',    sport: 'padel',   type: 'Panoramic Glass'   },
      { id: 'dha-p2', name: 'Padel Glass Court 2',    sport: 'padel',   type: 'Panoramic Glass'   },
      { id: 'dha-p3', name: 'Padel Glass Court 3',    sport: 'padel',   type: 'Panoramic Glass'   },
    ],
  },
  {
    id:              'fr-wapda-town',
    name:            'Matro Wapda Town',
    shortName:       'Matro Wapda Town',
    city:            'Lahore',
    location:        'Wapda Town, Lahore',
    address:         'Near Main Roundabout, Block D3, Wapda Town, Lahore, Punjab',
    image:           '/footbal.images.jfif',
    rating:          4.8,
    reviewsCount:    275,
    startingPrice:   1800,
    unit:            'hr',
    availableCourts: 5,
    sports:          ['futsal', 'cricket', 'badminton'],
    badge:           'High Energy',
    operatingHours:  '06:00 AM – 01:00 AM',
    amenities: [
      'FIFA-Grade Synthetic Turf',
      'All-Weather Netting Enclosure',
      'High-Output LED Lighting',
      'Hydration & Snack Counter',
      'Dedicated Car Parking',
    ],
    courts: [
      { id: 'wt-f1', name: 'Futsal Turf 1',      sport: 'futsal',    type: 'AstroTurf'          },
      { id: 'wt-f2', name: 'Futsal Turf 2',      sport: 'futsal',    type: 'AstroTurf'          },
      { id: 'wt-c1', name: 'Cricket Cage 1',      sport: 'cricket',   type: 'Shock Pad Box Turf' },
      { id: 'wt-b1', name: 'Badminton Hall 1',    sport: 'badminton', type: 'Non-Slip Court Mats'},
      { id: 'wt-b2', name: 'Badminton Hall 2',    sport: 'badminton', type: 'Non-Slip Court Mats'},
    ],
  },
  {
    id:              'fr-valencia',
    name:            'Matro Valencia',
    shortName:       'Matro Valencia',
    city:            'Lahore',
    location:        'Valencia Town, Lahore',
    address:         'Main Commercial Boulevard, Valencia Town, Lahore, Punjab',
    image:           '/padal-image2.jfif',
    rating:          4.8,
    reviewsCount:    210,
    startingPrice:   2200,
    unit:            'hr',
    availableCourts: 4,
    sports:          ['padel', 'pickleball', 'cricket'],
    badge:           'Community Favourite',
    operatingHours:  '07:00 AM – 01:00 AM',
    amenities: [
      'Panoramic Glass Padel Arena',
      'Cushioned Acrylic Pickleball Courts',
      'Players Lounge',
      'Rental Rackets & Equipment',
      'Cafe & Refreshments',
    ],
    courts: [
      { id: 'val-p1',  name: 'Padel Arena 1',      sport: 'padel',      type: 'Panoramic Glass'    },
      { id: 'val-p2',  name: 'Padel Arena 2',       sport: 'padel',      type: 'Panoramic Glass'    },
      { id: 'val-pk1', name: 'Pickleball Court 1',  sport: 'pickleball', type: 'Cushioned Acrylic'  },
      { id: 'val-c1',  name: 'Box Cricket Court',   sport: 'cricket',    type: 'Pro Turf'           },
    ],
  },
  {
    id:              'cross-courts',
    name:            'Cross Courts',
    shortName:       'Cross Courts',
    city:            'Lahore',
    location:        'Bedian Road, Lahore',
    address:         'Main Sports Avenue, Bedian Road Interchange, Lahore, Punjab',
    image:           '/padel-image4.jfif',
    rating:          4.9,
    reviewsCount:    395,
    startingPrice:   2500,
    unit:            'hr',
    availableCourts: 7,
    sports:          ['padel', 'pickleball', 'badminton'],
    badge:           'Premium Club',
    operatingHours:  '06:00 AM – 02:00 AM',
    amenities: [
      'Glass Padel Courts',
      'Competition Acrylic Pickleball Courts',
      'Badminton Courts with Spring Wood Base',
      'Pro Equipment Shop',
      'Locker & Shower Pods',
    ],
    courts: [
      { id: 'cc-p1',  name: 'Center Glass Court (Padel)',   sport: 'padel',      type: 'Panoramic Glass'   },
      { id: 'cc-p2',  name: 'Padel Court 2',                sport: 'padel',      type: 'Panoramic Glass'   },
      { id: 'cc-pk1', name: 'Pickleball Court Alpha',       sport: 'pickleball', type: 'Competition Acrylic'},
      { id: 'cc-pk2', name: 'Pickleball Court Beta',        sport: 'pickleball', type: 'Competition Acrylic'},
      { id: 'cc-b1',  name: 'Badminton Court 1',            sport: 'badminton',  type: 'Spring Wood Base'  },
      { id: 'cc-b2',  name: 'Badminton Court 2',            sport: 'badminton',  type: 'Spring Wood Base'  },
      { id: 'cc-b3',  name: 'Badminton Court 3',            sport: 'badminton',  type: 'Spring Wood Base'  },
    ],
  },
  {
    id:              'fr-sports-arena-sialkot',
    name:            'Matro Sports Arena Sialkot',
    shortName:       'Matro Sialkot',
    city:            'Sialkot',
    location:        'Kashmir Road, Sialkot',
    address:         'Main Kashmir Road, Near Cantt, Sialkot, Punjab',
    image:           '/cricket-img.jpg',
    rating:          4.9,
    reviewsCount:    312,
    startingPrice:   1800,
    unit:            'hr',
    availableCourts: 6,
    sports:          ['cricket', 'futsal', 'padel', 'badminton'],
    badge:           'Sialkot Sports Hub',
    operatingHours:  '06:00 AM – 02:00 AM',
    amenities: [
      'Indoor Box Cricket Arena',
      'FIFA-Grade Futsal Ground',
      'Panoramic Glass Padel Court',
      'Sports Goods Shop',
      'Family Lounge & Cafe',
      'Dedicated Parking',
    ],
    courts: [
      { id: 'skt-c1', name: 'Sialkot Cricket Pitch 1', sport: 'cricket',   type: 'Shock Pad Turf'   },
      { id: 'skt-c2', name: 'Sialkot Cricket Pitch 2', sport: 'cricket',   type: 'Indoor Synthetic' },
      { id: 'skt-f1', name: 'Sialkot Futsal Arena',    sport: 'futsal',    type: '4G AstroTurf'     },
      { id: 'skt-p1', name: 'Sialkot Glass Padel',     sport: 'padel',     type: 'Panoramic Glass'  },
      { id: 'skt-b1', name: 'Badminton Hall 1',        sport: 'badminton', type: 'Non-Slip Mats'    },
      { id: 'skt-b2', name: 'Badminton Hall 2',        sport: 'badminton', type: 'Non-Slip Mats'    },
    ],
  },
];

export const venuesData = venues;

export default venues;
