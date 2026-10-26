// PRICE OPTIONS (all optional, add inside any product):
//   price: 1200                    -> shows ₹1,200   (a number gets ₹ and Indian commas)
//   price: "From ₹900"             -> shows exactly what you type
//   oldPrice: 1500                 -> old price shown struck through next to the new one
//   priceNote: "Inclusive of GST"  -> small line under the price on the product page
// No price -> home card shows "Ask price", product page shows "Price on request".
//
// Fill in capacity / accuracy where it says "XX kg" or "".
// The detail page hides any row that still contains "XX", so nothing wrong is shown to customers.
// To add more photos for a product, add:  images: ["url1", "url2"]  (the first one is the main image)

const products = [
  {
    id: "tvs-platform",
    name: "TVS Platform Weighing Scale",
    brand: "TVS",
    category: "platform",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432554/IMG-20260923-WA0085_b2iphg.jpg",
    description: "Heavy-duty black chequered MS platform with a pillar-mounted LED display and safety railing.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Godowns, shops, loading areas",
    features: [
      "Heavy-duty black chequered MS platform",
      "Pillar-mounted LED display, easy to read from a distance",
      "Safety railing around the platform"
    ],
    specs: {
      "Type": "Platform scale",
      "Display": "LED, pillar mounted",
      "Platform": "Chequered MS, black"
    }
  },
  {
    id: "eagle-platform",
    name: "Eagle Platform Weighing Scale",
    brand: "Eagle",
    category: "platform",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432551/IMG-20260226-WA0099_gcc6st.jpg",
    description: "Sturdy platform scale with a tall display pillar and protective railing.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Godowns, loading areas, bulk weighing",
    features: [
      "Sturdy platform build for bulk loads",
      "Tall display pillar",
      "Protective railing"
    ],
    specs: {
      "Type": "Platform scale",
      "Display": "Digital, pillar mounted"
    }
  },
  {
    id: "tvs-tabletop",
    name: "TVS Table Top Digital Scale",
    brand: "TVS",
    category: "counter",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432553/IMG-20260923-WA0084_wez71w.jpg",
    description: "Compact table-top scale with a front panel display and an additional pillar-mounted display for customers.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Shops, bakeries, counters",
    features: [
      "Compact body that fits on any counter",
      "Front panel display for the shopkeeper",
      "Extra pillar display facing the customer"
    ],
    specs: {
      "Type": "Table top scale",
      "Display": "Front panel + pillar display"
    }
  },
  {
    id: "yesweigh-mpc30",
    name: "Yes Weigh Price Computing Scale (MPC30)",
    brand: "Yes Weigh",
    category: "counter",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432537/IMG-20260923-WA0118_kw4auk.jpg",
    description: "Price computing scale with weight, unit price and total price displays.",
    capacity: "20 kg",
    accuracy: "2 g",
    usedFor: "Vegetable, fruit and grocery shops",
    features: [
      "Weight, unit price and total price shown together",
      "Numeric keypad for quick price entry",
      "Tare and memory keys"
    ],
    specs: {
      "Model": "MPC30",
      "Type": "Price computing scale",
      "Keys": "Numeric keypad, tare, memory"
    }
  },
  {
    id: "yesweigh-tabletop",
    name: "Yes Weigh Table Top Digital Scale",
    brand: "Yes Weigh",
    category: "counter",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432545/IMG-20260923-WA0107_domxma.jpg",
    description: "Shows weight, unit price and total price instantly, with a numeric keypad and memory keys.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Vegetable, fruit and grocery shops",
    features: [
      "Shows weight, unit price and total price instantly",
      "Numeric keypad",
      "Memory keys for frequently sold items"
    ],
    specs: {
      "Type": "Table top scale",
      "Keys": "Numeric keypad, memory"
    }
  },
  {
    id: "yesweigh-barcode-label",
    name: "Yes Weigh Barcode Label Printing Scale",
    brand: "Yes Weigh",
    category: "label",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432548/IMG-20260226-WA0100_b8wwzm.jpg",
    description: "Smart retail scale with a built-in label printer, product keys and dual display.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Supermarkets, bakeries, meat or fish shops",
    features: [
      "Built-in label printer",
      "Product keys for fast selection",
      "Dual display for shopkeeper and customer"
    ],
    specs: {
      "Type": "Barcode label printing scale",
      "Display": "Dual display"
    }
  },
  {
    id: "yesweigh-portable",
    name: "Yes Weigh Portable Digital Hanging Scale",
    brand: "Yes Weigh",
    category: "portable",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432542/IMG-20260923-WA0112_jgvu8x.jpg",
    description: "Handy hanging scale with backlit LCD display and steel hook.",
    capacity: "50 kg",
    accuracy: "5 g up to 10 kg, 10 g above 10 kg",
    usedFor: "Luggage, fish, vegetables and parcels",
    features: [
      "Backlit LCD display",
      "Steel hook",
      "Light and easy to carry"
    ],
    specs: {
      "Type": "Portable hanging scale",
      "Display": "Backlit LCD"
    }
  },
  {
    id: "yesweigh-label-printing",
    name: "Yes Weigh Label Printing Scale",
    brand: "Yes Weigh",
    category: "label",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432536/IMG-20260923-WA0115_levqk5.jpg",
    description: "Retail scale with a built-in label printer and tall multi-display pillar showing weight, unit price and total price.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Supermarkets, bakeries, meat or fish shops",
    features: [
      "Built-in label printer",
      "Tall multi-display pillar",
      "Weight, unit price and total price on display"
    ],
    specs: {
      "Type": "Label printing scale",
      "Display": "Multi-display pillar"
    }
  },
  {
    id: "yesweigh-precision",
    name: "Yes Weigh Precision Balance with Draft Shield",
    brand: "Yes Weigh",
    category: "portable",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432541/IMG-20260923-WA0108_qexxca.jpg",
    description: "High-precision lab balance with a glass draft shield, digital display and optional printer connectivity.",
    capacity: "XX kg",
    accuracy: "",
    usedFor: "Jewellery shops, laboratories, pharmacies",
    features: [
      "Glass draft shield for stable readings",
      "Digital display",
      "Optional printer connectivity"
    ],
    specs: {
      "Type": "Precision balance",
      "Display": "Digital",
      "Shield": "Glass draft shield"
    }
  },
  {
    id: "naveena-deluxe",
    name: "Naveena Deluxe Hand Sealing Machine",
    brand: "Naveena",
    category: "sealing",
    image: "https://res.cloudinary.com/ddng8ksv6/image/upload/v1790432546/IMG-20260923-WA0103_jjwz3x.jpg",
    description: "Hand-operated impulse sealer with an adjustable heat control knob.",
    capacity: "",
    accuracy: "",
    usedFor: "Shops, bakeries and small packing units",
    features: [
      "Hand-operated impulse sealer",
      "Adjustable heat control knob",
      "Quickly seals plastic bags and packets"
    ],
    specs: {
      "Type": "Hand sealing machine",
      "Control": "Adjustable heat knob"
    }
  }
];