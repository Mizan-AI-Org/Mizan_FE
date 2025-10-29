import React, { useState, useEffect } from "react";
import { Users, Building2, Award, Smile } from "lucide-react";

export const RestaurantShowcase: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const images = [
    {
      url: 'https://images.unsplash.com/photo-1663530761401-15eefb544889?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5lJTIwZGluaW5nJTIwY2hlZiUyMGNvb2tpbmd8ZW58MXx8fHwxNzYxNjY2MTY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Fine dining chef cooking',
      label: 'Expert Chefs'
    },
    {
      url: 'https://images.unsplash.com/photo-1682608491709-e21df86f1e5b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGVnYW50JTIwcmVzdGF1cmFudCUyMHdhaXRlciUyMHNlcnZpbmd8ZW58MXx8fHwxNzYxNjY2MTY5fDA&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Elegant waiter serving',
      label: 'Premium Service'
    },
    {
      url: 'https://images.unsplash.com/flagged/photo-1561350600-6606486921f5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjByZXN0YXVyYW50JTIwY3VzdG9tZXJzJTIwZGluaW5nfGVufDF8fHx8MTc2MTY2NjE3MHww&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Luxury restaurant customers',
      label: 'Happy Guests'
    },
    {
      url: 'https://images.unsplash.com/photo-1759419038843-29749ac4cd2d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxmaW5lJTIwZGluaW5nJTIwaW50ZXJpb3IlMjBlbGVnYW50fGVufDF8fHx8MTc2MTY2NjE3MHww&ixlib=rb-4.1.0&q=80&w=1080',
      alt: 'Fine dining interior',
      label: 'Elegant Ambiance'
    }
  ];

  const stats = [
    {
      icon: Users,
      number: "500+",
      label: "Professional Staff",
    },
    {
      icon: Building2,
      number: "1,200+",
      label: "Happy Restaurants",
    },
    {
      icon: Award,
      number: "25+",
      label: "Industry Awards",
    },
    {
      icon: Smile,
      number: "98%",
      label: "Customer Satisfaction",
    },
  ];

  const slides = [
    {
      headline: "Excellence in Every Detail",
      subheading: "Streamline operations, delight customers, maximize profits with Mizan's intelligent restaurant management platform.",
    },
    {
      headline: "Empower Your Team",
      subheading: "Give your staff the tools they need to deliver exceptional service every single time.",
    },
    {
      headline: "Hospitality Reimagined",
      subheading: "Create unforgettable dining experiences with our comprehensive restaurant management solution.",
    },
    {
      headline: "Operational Excellence",
      subheading: "Transform your restaurant with smart scheduling, inventory management, and real-time analytics.",
    },
  ];

  // Auto-rotate carousel every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentContent = slides[currentSlide];

  const currentImage = images[currentSlide];

  return (
    <div className="hidden lg:flex w-1/2 relative overflow-hidden bg-[#0A0D10]">
      {/* Hero Image Background with Dark Overlay */}
      <div className="absolute inset-0">
        {/* Background Image with Fade Transition */}
        <img
          src={currentImage.url}
          alt={currentImage.alt}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
        />
        
        {/* Dark gradient overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent" />
        
        {/* Additional overlay for better text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

        {/* Subtle accent elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-[#00E676]/5 to-transparent rounded-full mix-blend-multiply filter blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col justify-between h-screen p-8">
        {/* Top Section - Marketing Copy */}
        <div className="flex-1 flex items-center">
          <div className="max-w-lg">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
              {currentContent.headline}
            </h2>
            <p className="text-lg text-[#B0BEC5] leading-relaxed">
              {currentContent.subheading}
            </p>
          </div>
        </div>

        {/* Bottom Section - Stats */}
        <div className="space-y-8">
          {/* Statistics Cards */}
          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div
                  key={index}
                  className="relative rounded-lg p-4 backdrop-blur-md bg-white/5 border border-[#00E676]/20 hover:border-[#00E676]/40 transition-all group"
                >
                  {/* Blurred background effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E676]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />

                  <div className="relative space-y-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="h-5 w-5 text-[#00E676]" />
                      <span className="text-sm font-semibold text-[#00E676]">
                        {stat.number}
                      </span>
                    </div>
                    <p className="text-xs text-[#B0BEC5]">{stat.label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Image Label */}
          <div className="text-center">
            <p className="text-sm font-semibold text-[#00E676]">{currentImage.label}</p>
          </div>

          {/* Pagination Dots */}
          <div className="flex items-center justify-center space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`transition-all ${
                  currentSlide === index
                    ? "w-8 h-2 bg-[#00E676] rounded-full"
                    : "w-2 h-2 bg-[#00E676]/40 rounded-full hover:bg-[#00E676]/60"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};