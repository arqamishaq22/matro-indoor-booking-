/**
 * memberships.js
 * ─────────────────────────────────────────────────────────────────────────
 * Source of truth: Project specification
 *
 * Approved tiers and pricing:
 *
 * Bronze  — Rs. 24,000 / 30 days | 5 off-peak hrs | 2 peak hrs | 5% discount
 * Silver  — Rs. 36,000 / 30 days | 7 off-peak hrs | 4 peak hrs | 10% discount
 * Gold    — Rs. 60,000 / 30 days | 14 off-peak hrs | 6 peak hrs | 15% discount
 *
 * Only perks explicitly listed in the project spec are included.
 * ─────────────────────────────────────────────────────────────────────────
 */

export const memberships = [
  {
    id:                'bronze',
    name:              'Bronze',
    tier:              'Bronze',
    subtitle:          'Casual Enthusiast',
    tagline:           'Ideal for weekend warriors and casual social match-ups',
    price:             24000,
    currency:          'Rs.',
    duration:          '30 days',
    formattedPrice:    'Rs. 24,000',
    offPeakHours:      5,
    peakHours:         2,
    totalHours:        7,
    extraDiscount:     '5%',
    discountPercentage: 5,
    popular:           false,
    color:             '#cd7f32',
    accentGradient:    'linear-gradient(135deg, #cd7f32 0%, #a05a2c 100%)',
    perks: [
      '5 off-peak hours included per 30 days',
      '2 peak hours included per 30 days',
      '5% extra discount on all court bookings',
      'Valid across all venues — Lahore & Sialkot',
    ],
    limitations: [
      'Peak hours subject to advance reservation',
    ],
    ctaText: 'Get Bronze Pass',
  },
  {
    id:                'silver',
    name:              'Silver',
    tier:              'Silver',
    subtitle:          'Regular Athlete',
    tagline:           'Built for dedicated players and regular weekly squad games',
    price:             36000,
    currency:          'Rs.',
    duration:          '30 days',
    formattedPrice:    'Rs. 36,000',
    offPeakHours:      7,
    peakHours:         4,
    totalHours:        11,
    extraDiscount:     '10%',
    discountPercentage: 10,
    popular:           false,
    color:             '#94a3b8',
    accentGradient:    'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
    perks: [
      '7 off-peak hours included per 30 days',
      '4 peak hours included per 30 days',
      '10% extra discount on all court bookings',
      'Valid across all venues — Lahore & Sialkot',
    ],
    limitations: [],
    ctaText: 'Elevate to Silver',
  },
  {
    id:                'gold',
    name:              'Gold',
    tier:              'Gold',
    subtitle:          'Premium All-Access',
    tagline:           'Maximum hours, highest discount, extended advance booking window',
    price:             60000,
    currency:          'Rs.',
    duration:          '30 days',
    formattedPrice:    'Rs. 60,000',
    offPeakHours:      14,
    peakHours:         6,
    totalHours:        20,
    extraDiscount:     '15%',
    discountPercentage: 15,
    popular:           true,
    color:             '#f59e0b',
    accentGradient:    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    perks: [
      '14 off-peak hours included per 30 days',
      '6 peak hours included per 30 days',
      '15% extra discount on all court bookings',
      'Valid across all venues — Lahore & Sialkot',
    ],
    limitations: [],
    ctaText: 'Claim Gold Pass',
  },
];

export const membershipTiers = memberships;
export const membershipsData  = memberships;

export default memberships;
