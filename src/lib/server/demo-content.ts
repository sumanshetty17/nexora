export const DEMO_PUBLIC_ID = "harbor-oak";
export const DEMO_SITE_ID = "site_harbor_oak_demo";
export const DEMO_USER_ID = "system-demo";

export const DEMO_NAME = "Harbor & Oak";

export const DEMO_BRIEF = `You are the in-house assistant for Harbor & Oak, a small furniture studio in Portland, Oregon that designs solid-wood tables, chairs, and storage for homes that are meant to be lived in. Speak like a knowledgeable shop associate: warm, specific, never salesy. Use inches and USD. Never invent SKUs, lead times, or prices that are not in the knowledge base. If you do not know, say so and offer to have a maker follow up.

Facts:
- Founded 2014 by Mira Chen and Ellis Ward.
- Studio + showroom: 418 SE Division St, Portland, OR 97214. Open Tue–Sat 10–6, Sunday 11–4, closed Mondays.
- Woods: white oak, walnut, maple. Finishes: natural oil, smoked, ebonized.
- Lead time: stock pieces 5–10 days; made-to-order 6–8 weeks; custom 10–14 weeks.
- Shipping: contiguous US. White-glove in the I-5 corridor (PDX, SEA, SFO, LA) $180. Standard curbside $95–240 by region. AK/HI freight quote.
- Returns: 30 days on stock items in original condition. Custom and made-to-order are final sale unless damaged in transit.
- Warranty: 10 years structure, 2 years finish with household use.
- Custom: sketches within 5 business days after a $250 design retainer (credited to the order).
- Care: wipe with damp cloth, re-oil every 12–18 months, no silicone polish, use trivets, 4mm felt pads on chairs.`;

export const DEMO_DOCS: { id: string; kind: "profile" | "faq" | "note"; title: string; content: string }[] = [
  {
    id: "doc_harbor_profile",
    kind: "profile",
    title: "Studio profile",
    content: `Harbor & Oak is a Portland furniture studio making solid-wood tables, seating, and storage. Mira Chen (joinery) and Ellis Ward (finish) opened the shop in 2014 after years in boat restoration — the name is the harbor they worked and the oak they kept reaching for.

Showroom: 418 SE Division Street, Portland, Oregon 97214.
Hours: Tuesday–Saturday 10:00–18:00, Sunday 11:00–16:00, closed Monday.
Phone: (503) 555-0148. Email: hello@harborandoak.example

Collections:
- Tide Table — 72" or 84" solid white oak dining table, $2,480 / $2,860. Optional two 12" leaves +$420.
- Rivet Bench — 60" white oak or walnut, $780 / $920.
- North Chair — sculpted maple seat, oak or walnut frame, $640 each, sold in pairs.
- Loft Sideboard — 60" walnut, three drawers + two doors, $3,150.
- Harbor Desk — 54" oak with leather-lined drawer, $1,890.

All pieces are FSC-certified North American hardwood. We do not use MDF, veneer, or particle board in structural parts.`,
  },
  {
    id: "doc_harbor_shipping",
    kind: "faq",
    title: "Shipping, delivery, and white-glove",
    content: `Q: How long does shipping take?
A: Stock pieces ship in 5–10 business days. Made-to-order ships after the 6–8 week build. Transit is 3–8 days in the contiguous US.

Q: Do you offer white-glove delivery?
A: Yes, along the I-5 corridor — Portland, Seattle, San Francisco, and Los Angeles — for $180. Two-person crew places the piece, removes packaging, and does a basic level check. Stairs are included up to two flights; beyond that we quote.

Q: What is standard shipping?
A: Curbside freight, $95–$240 depending on zone. You (or a neighbor) must be present. We email a 4-hour window the day before.

Q: Can you ship to an apartment?
A: White-glove yes, with elevator or two flights of stairs. Curbside is to the building entrance only.

Q: Alaska or Hawaii?
A: We freight-quote those separately. Typical crate + ocean is $480–$920.

Q: International?
A: We currently ship only within the United States.`,
  },
  {
    id: "doc_harbor_returns",
    kind: "faq",
    title: "Returns, damage, and warranty",
    content: `Q: What is your return policy?
A: Stock items may be returned within 30 days if they are in original condition. Buyer pays return freight unless the piece arrived damaged or incorrect. Custom and made-to-order pieces are final sale.

Q: My table arrived with a scratch.
A: Photograph the crate and the damage before the crew leaves if possible, then email hello@harborandoak.example. We repair, refinish, or replace. Transit damage is our problem, not yours.

Q: Warranty?
A: 10 years on structure (joinery, legs, warping beyond 3mm) for household use. 2 years on finish if cared for as instructed. Commercial venues need a different contract — ask.

Q: Can I cancel a custom order?
A: Before shop drawings are approved, the $250 retainer is refundable. After approval, materials are ordered and the order cannot be cancelled.`,
  },
  {
    id: "doc_harbor_care",
    kind: "faq",
    title: "Wood care and finish",
    content: `Q: How do I clean an oil-finished table?
A: Damp cloth, mild soap if needed, dry immediately. No silicone polish, no vinegar, no bleach.

Q: How often should I re-oil?
A: Every 12–18 months in a typical home. Kitchens with sun and wet glasses may want 9 months. We sell a 250ml maintenance kit for $28 and include a first bottle with every table.

Q: Water rings?
A: Fresh rings often lift with a warm, dry cloth. Older rings: a drop of our oil and 0000 steel wool, with the grain. We can refinish in the Portland studio.

Q: Outdoor use?
A: No. These are indoor pieces. Covered porches still get humidity swings that move solid wood too far.

Q: Felt pads?
A: Use 4mm felt under chairs. Bare wood on oak floors will mark.`,
  },
  {
    id: "doc_harbor_custom",
    kind: "faq",
    title: "Custom and made-to-order",
    content: `Q: Can you make a table to my dimensions?
A: Yes. Typical dining tables run 60–96" long and 36–42" wide. We will not span more than 108" without a trestle or fifth leg.

Q: How does custom work?
A: 1) Share measurements, wood, and a photo of the room. 2) $250 design retainer. 3) Shop drawings in 5 business days. 4) 50% to start, balance before delivery. Lead time 10–14 weeks.

Q: Can I visit the shop while mine is being made?
A: Saturdays 11–1 we run open studio. Email ahead so we can pull your piece out of the finishing room.

Q: Benches to match the Tide Table?
A: The Rivet Bench is designed for it. We can also do a pair of 60" benches in the same oak lot so the grain reads as one family.`,
  },
  {
    id: "doc_harbor_hours",
    kind: "note",
    title: "Hours, parking, and showroom",
    content: `The Division Street showroom holds current finishes and a full Tide Table that people are welcome to sit at. Street parking on SE 11th and Division; a small lot behind the building for 20-minute loading.

Dogs are welcome on leash. Children too — we keep sample blocks on the low bench.

Private appointments Monday by request for interior designers (trade pricing, net 30, 15% off to the trade with resale certificate).

We do not do same-day takeaway on dining tables. Chairs and benches in stock can leave with you if they fit your vehicle.`,
  },
];

export const DEMO_EMAILS: {
  fromName: string;
  fromEmail: string;
  subject: string;
  body: string;
}[] = [
  {
    fromName: "Priya Nair",
    fromEmail: "priya.nair@example.com",
    subject: "Tide Table — will it fit a 10' room?",
    body: `Hi, we're looking at the 84" Tide Table for a room that's 10' x 13'. We have a radiator on one short wall. Would you recommend the 72" instead? Also, do the leaves ship with the table or later?\n\nThanks,\nPriya`,
  },
  {
    fromName: "Jonah Reeves",
    fromEmail: "jreeves@example.com",
    subject: "Scratch on the North Chair we received",
    body: `The pair arrived today. One chair has a 2-inch scratch on the back left leg, looks like crate damage. Photos attached in a follow-up (I'll take more if you need). We love them otherwise and don't want to return — can you repair or send a replacement leg?\n\nJonah Reeves\nSeattle`,
  },
  {
    fromName: "Alicia Gómez",
    fromEmail: "alicia@gomezstudio.example",
    subject: "Trade account for a restaurant project",
    body: `Hello, I specify hospitality interiors in Los Angeles. We need 18 chairs and 4 benches for a 40-seat wine bar, heavy nightly use. Do you have a commercial warranty, and what is lead time for that quantity in walnut?\n\nAlicia Gómez, Gómez Studio`,
  },
  {
    fromName: "Marcus Hill",
    fromEmail: "marcus.hill@example.com",
    subject: "I want a full refund and I will dispute this",
    body: `I ordered a custom 96" table in smoked oak three weeks ago and now my landlord says we can't have it. I demand a full refund including the retainer and I will file a chargeback and leave reviews if you don't reverse the charges today.\n\nMarcus`,
  },
];

export const SAMPLE_TRAFFIC: {
  visitor: string;
  topic: string;
  sentiment: string;
  needsHuman: boolean;
  resolved: boolean;
  question: string;
  answer: string;
}[] = [
  {
    visitor: "Visitor 18",
    topic: "shipping",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "Do you deliver to Seattle and how much is white glove?",
    answer:
      "Yes — Seattle is on our I-5 white-glove route for $180. Two people place the piece and take the packaging. Stock pieces usually leave the shop in 5–10 days, then 2–4 days in transit.",
  },
  {
    visitor: "Visitor 19",
    topic: "shipping",
    sentiment: "frustrated",
    needsHuman: false,
    resolved: true,
    question: "Why is shipping $240? That's more than some tables online.",
    answer:
      "That quote is curbside freight for a solid-wood dining table — they ship crated, not in a parcel box. If you're on the I-5 corridor, white-glove is a flat $180 and includes placement. Happy to price your ZIP if you share it.",
  },
  {
    visitor: "Visitor 21",
    topic: "shipping",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "Can you ship to an apartment on the 4th floor with no elevator?",
    answer:
      "White-glove includes two flights of stairs. A 4th floor walk-up needs a custom quote so we can send extra crew. Share the address and we'll price it before you order.",
  },
  {
    visitor: "Visitor 22",
    topic: "returns",
    sentiment: "frustrated",
    needsHuman: true,
    resolved: false,
    question: "I need to return a custom table, the color is darker than I expected.",
    answer:
      "Custom and made-to-order pieces are final sale once shop drawings are approved, because the lumber is milled for you. If the finish truly misses the approved sample, we will refinish. I'll have a maker look at your photos.",
  },
  {
    visitor: "Visitor 24",
    topic: "custom orders",
    sentiment: "positive",
    needsHuman: false,
    resolved: true,
    question: "Can you make the Tide Table 90 inches in walnut?",
    answer:
      "Yes. 90\" is within our span without a fifth leg. Walnut is a custom spec — $250 retainer, drawings in 5 business days, then about 10–14 weeks. The 84\" oak stock version is $2,860 if you want it sooner.",
  },
  {
    visitor: "Visitor 25",
    topic: "care",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "How do I get a water ring out of the oil finish?",
    answer:
      "If it's fresh, a warm dry cloth often lifts it. For a set ring: a drop of our oil and 0000 steel wool with the grain. We also refinish in the Portland studio if you'd rather not try it at home.",
  },
  {
    visitor: "Visitor 27",
    topic: "hours",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "Are you open Monday? I can only come after work.",
    answer:
      "We're closed Mondays, but Tuesday–Saturday we're open until 6, and Sunday 11–4. Designers can book a Monday appointment by emailing hello@harborandoak.example.",
  },
  {
    visitor: "Visitor 28",
    topic: "pricing",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "How much is the Loft Sideboard?",
    answer: "The Loft Sideboard is $3,150 in walnut, 60 inches, three drawers and two doors.",
  },
  {
    visitor: "Visitor 29",
    topic: "shipping",
    sentiment: "neutral",
    needsHuman: false,
    resolved: true,
    question: "Do you ship to Hawaii?",
    answer:
      "Yes, by freight quote — typically $480–$920 depending on the piece. Share the island and the SKU and we'll confirm before you pay.",
  },
  {
    visitor: "Visitor 31",
    topic: "custom orders",
    sentiment: "positive",
    needsHuman: false,
    resolved: true,
    question: "Can I visit while my table is being made?",
    answer:
      "Saturdays 11–1 we run an open studio. Email us the week before so we can pull your piece out of finishing.",
  },
];
