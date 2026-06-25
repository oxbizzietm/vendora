export const categories = [
  {
    id: "phones",
    name: "Phones & Tablets",
    count: "2,400+ items",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "fashion",
    name: "Fashion",
    count: "5,100+ styles",
    image:
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "home",
    name: "Home & Living",
    count: "1,800+ finds",
    image:
      "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "beauty",
    name: "Beauty & Care",
    count: "970+ essentials",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "computing",
    name: "Computing",
    count: "760+ devices",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: "groceries",
    name: "Groceries",
    count: "Daily deals",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
  },
];

export const products = [
  {
    id: "nova-x1",
    name: "Nova X1 5G Smartphone",
    category: "Phones & Tablets",
    seller: "BluePeak Mobile",
    price: 325000,
    oldPrice: 389000,
    rating: 4.8,
    reviews: 128,
    stock: 36,
    badge: "Best Seller",
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=900&q=80",
    description:
      "A fast 5G phone with a vivid AMOLED screen, all-day battery life, and a crisp triple camera system built for creators and everyday shoppers.",
  },
  {
    id: "aurora-watch",
    name: "Aurora Fit Smart Watch",
    category: "Accessories",
    seller: "PulseHub",
    price: 68000,
    oldPrice: 82000,
    rating: 4.6,
    reviews: 92,
    stock: 58,
    badge: "Flash Deal",
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80",
    description:
      "Track workouts, calls, sleep, and payments from a polished smartwatch with a bright display and comfortable all-day strap.",
  },
  {
    id: "linen-set",
    name: "CloudRest Cotton Bedding Set",
    category: "Home & Living",
    seller: "Maison Lagos",
    price: 54000,
    oldPrice: 71000,
    rating: 4.9,
    reviews: 211,
    stock: 24,
    badge: "Premium",
    image:
      "https://images.unsplash.com/photo-1615874694520-474822394e73?auto=format&fit=crop&w=900&q=80",
    description:
      "Soft breathable cotton bedding with hotel-inspired finishing, deep fitted corners, and a calm neutral palette.",
  },
  {
    id: "studio-bag",
    name: "Studio Carryall Leather Tote",
    category: "Fashion",
    seller: "Ada Atelier",
    price: 87500,
    oldPrice: 99000,
    rating: 4.7,
    reviews: 64,
    stock: 19,
    badge: "New Arrival",
    image:
      "https://images.unsplash.com/photo-1590874103328-eac38a683ce7?auto=format&fit=crop&w=900&q=80",
    description:
      "A structured leather tote with padded laptop storage, brass hardware, and enough room for workdays, markets, and weekends.",
  },
  {
    id: "beauty-kit",
    name: "GlowLab Complete Skincare Kit",
    category: "Beauty & Care",
    seller: "GlowLab",
    price: 42300,
    oldPrice: 56000,
    rating: 4.5,
    reviews: 143,
    stock: 42,
    badge: "Clean Beauty",
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=80",
    description:
      "A balanced routine for cleansing, brightening, hydrating, and protecting skin in humid city weather.",
  },
  {
    id: "ultrabook-pro",
    name: "Northstar Ultrabook Pro 14",
    category: "Computing",
    seller: "Circuit House",
    price: 790000,
    oldPrice: 875000,
    rating: 4.8,
    reviews: 75,
    stock: 11,
    badge: "Top Rated",
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=900&q=80",
    description:
      "A slim performance laptop with a color-rich display, fast SSD storage, and enough battery for long seller or student workdays.",
  },
  {
    id: "chef-bundle",
    name: "ChefMate Nonstick Cookware Bundle",
    category: "Home & Living",
    seller: "Kitchen Republic",
    price: 118000,
    oldPrice: 152000,
    rating: 4.6,
    reviews: 101,
    stock: 33,
    badge: "Bundle Save",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?auto=format&fit=crop&w=900&q=80",
    description:
      "A durable cookware bundle with even heat distribution, comfortable handles, and sizes that cover everyday family meals.",
  },
  {
    id: "noise-cancel",
    name: "WaveMax Noise Cancelling Headphones",
    category: "Audio",
    seller: "SoundPort",
    price: 126000,
    oldPrice: 149000,
    rating: 4.7,
    reviews: 189,
    stock: 27,
    badge: "Hot Pick",
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
    description:
      "Comfortable wireless headphones with deep bass, clear calls, and active noise cancellation for commutes and focused work.",
  },
];

export const topSellers = [
  {
    id: "seller-1",
    name: "BluePeak Mobile",
    specialty: "Phones, tablets, and accessories",
    rating: 4.9,
    orders: "12.8k orders",
  },
  {
    id: "seller-2",
    name: "Maison Lagos",
    specialty: "Premium home essentials",
    rating: 4.8,
    orders: "8.4k orders",
  },
  {
    id: "seller-3",
    name: "Ada Atelier",
    specialty: "Contemporary fashion",
    rating: 4.7,
    orders: "6.1k orders",
  },
];

export const cartItems = [
  {
    id: "nova-x1",
    name: "Nova X1 5G Smartphone",
    seller: "BluePeak Mobile",
    price: 325000,
    quantity: 1,
    image:
      "https://images.unsplash.com/photo-1598327105666-5b89351aff97?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "beauty-kit",
    name: "GlowLab Complete Skincare Kit",
    seller: "GlowLab",
    price: 42300,
    quantity: 2,
    image:
      "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=500&q=80",
  },
];

export function formatCurrency(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}
