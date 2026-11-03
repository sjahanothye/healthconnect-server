// Pre-populated seed events for HealthConnect
// High quality, realistic community healthcare & social development events
// Strict rule: No Lorem Ipsum, all future dates

const getFutureDate = (daysAhead, hours = 10) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};

const sampleEvents = [
  {
    title: 'Voluntary Blood Donation & Screening Camp',
    eventType: 'Blood Donation',
    description:
      'Join our community-driven voluntary blood donation drive organized in partnership with local authorized blood banks. Qualified doctors and trained technicians will conduct pre-donation health checkups, hemoglobin tests, and safe blood collection. Every donation can save up to three lives in emergency surgical procedures and thalassemia treatment.',
    thumbnail:
      'https://images.unsplash.com/photo-1615461066841-6116e61058f4?auto=format&fit=crop&w=1200&q=80',
    location: 'Mirpur Youth Community Center, Section 10, Dhaka',
    eventDate: getFutureDate(5, 9),
    organizerEmail: 'admin@healthconnect.org',
    organizerName: 'HealthConnect Community Team',
    participantsCount: 42,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Cornea Donation Awareness & Pledge Seminar',
    eventType: 'Eye Donation Awareness',
    description:
      'An educational and awareness seminar addressing corneal blindness myths and promoting post-mortem cornea donation. Certified ophthalmologists from national eye institutes will share factual insights on how cornea pledges help restore vision to visually impaired individuals through government-approved eye banks.',
    thumbnail:
      'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=80',
    location: 'Dhanmondi Public Library Auditorium, Road 27, Dhaka',
    eventDate: getFutureDate(9, 15),
    organizerEmail: 'admin@healthconnect.org',
    organizerName: 'Vision For All Initiative',
    participantsCount: 28,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Organ Donation Awareness & Legal Guidance Campaign',
    eventType: 'Organ Donation Awareness',
    description:
      'A strictly educational forum dedicated to raising public consciousness regarding deceased organ donation and organ donation laws in Bangladesh. Learn about authorized hospital networks, ethical practices, and legal procedures for voluntary organ pledges. (Notice: HealthConnect does not facilitate donor matching or organ transactions; this session focuses strictly on awareness and authorized guidelines).',
    thumbnail:
      'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1200&q=80',
    location: 'Gulshan Civic Center, Road 71, Dhaka',
    eventDate: getFutureDate(14, 11),
    organizerEmail: 'awareness@healthconnect.org',
    organizerName: 'National Organ Awareness Coalition',
    participantsCount: 35,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Free Child & Maternal Health Checkup Camp',
    eventType: 'Medical Support',
    description:
      'A comprehensive day-long free medical clinic serving underprivileged mothers and children. Services include vital signs examination, nutritional counseling, growth monitoring, pediatric consultations, and essential over-the-counter medicine distribution under licensed physician supervision.',
    thumbnail:
      'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=80',
    location: 'Sector 4 Community Grounds, Uttara, Dhaka',
    eventDate: getFutureDate(18, 9),
    organizerEmail: 'care@healthconnect.org',
    organizerName: 'Hope Medical Volunteers',
    participantsCount: 56,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Clean City & Urban Tree Plantation Drive',
    eventType: 'Environment',
    description:
      'Help build a cleaner and greener city! Community volunteers will plant 500 indigenous fruit-bearing and oxygen-rich saplings across designated public parks and road dividers. Gardening equipment, seedlings, and guidance will be supplied for all participants.',
    thumbnail:
      'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1200&q=80',
    location: 'Ramna Green Park Plaza, Shahbag, Dhaka',
    eventDate: getFutureDate(22, 8),
    organizerEmail: 'green@healthconnect.org',
    organizerName: 'Dhaka Green Brigade',
    participantsCount: 64,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Winter Warmth Blanket & Woolen Distribution',
    eventType: 'Community Service',
    description:
      'Our annual winter relief drive delivering high-grade thermal blankets and warm clothes to floating street dwellers, day laborers, and elderly citizens facing harsh seasonal cold waves. Volunteers will assist in sorting and respectful neighborhood distribution.',
    thumbnail:
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80',
    location: 'Town Hall Community Yard, Mohammadpur, Dhaka',
    eventDate: getFutureDate(26, 17),
    organizerEmail: 'outreach@healthconnect.org',
    organizerName: 'Warm Hearts Foundation',
    participantsCount: 78,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Basic First Aid & CPR Training Workshop',
    eventType: 'Education',
    description:
      'Practical hands-on certification workshop teaching life-saving CPR, choking relief techniques, emergency wound care, and burn management for college students and local community volunteers conducted by accredited emergency responders.',
    thumbnail:
      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=80',
    location: 'Badda Community Hall, Pragati Sarani, Dhaka',
    eventDate: getFutureDate(30, 10),
    organizerEmail: 'education@healthconnect.org',
    organizerName: 'First Responder Academy',
    participantsCount: 22,
    createdAt: new Date().toISOString(),
  },
  {
    title: 'Nutritious Meal Box Distribution for Underprivileged Families',
    eventType: 'Social Welfare',
    description:
      'Collaborative social welfare initiative delivering freshly cooked, balanced nutritional food packages and safe drinking water to daily-wage laborer families and slum areas across Keraniganj.',
    thumbnail:
      'https://images.unsplash.com/photo-1593113598332-cd288d649433?auto=format&fit=crop&w=1200&q=80',
    location: 'Riverview Public Ghat, Keraniganj, Dhaka',
    eventDate: getFutureDate(35, 12),
    organizerEmail: 'welfare@healthconnect.org',
    organizerName: 'Community Kitchen Alliance',
    participantsCount: 45,
    createdAt: new Date().toISOString(),
  },
];

module.exports = { sampleEvents, getFutureDate };
