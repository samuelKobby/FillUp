import React, { useState, useEffect } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { Header } from '../components/layout/Header'
import { Footer } from '../components/layout/Footer'
import { useAuth } from '../contexts/AuthContext'
import heroVideo from '../assets/hero.mp4'
import wheelImg from '../assets/wheel.png'
import carImg from '../assets/car.png'
import AOS from 'aos'
import 'aos/dist/aos.css'
import { 
  Fuel, 
  Wrench, 
  MapPin, 
  Clock, 
  Shield, 
  Star,
  Smartphone,
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MessageSquare,
  Award,
  Zap,
  TrendingUp,
  ChevronUp,
  Home,
  ChevronDown,
  ExternalLink,
  Menu,
  X
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

export const Landing: React.FC = () => {
  const { user, userRole } = useAuth()
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [scrollY, setScrollY] = useState(0)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [mouseX, setMouseX] = useState(0)
  const [mouseY, setMouseY] = useState(0)

  // Handle menu close with animation
  const handleCloseMenu = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowMobileMenu(false)
      setIsClosing(false)
    }, 300) // Match animation duration
  }

  // Initialize AOS
  useEffect(() => {
    AOS.init({
      duration: 800,
      easing: 'ease-in-out',
      once: false,
      offset: 100
    })
  }, [])

  // Redirect logged-in users to their respective dashboards
  if (user && userRole) {
    if (userRole === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (userRole === 'agent') return <Navigate to="/agent/dashboard" replace />
    if (userRole === 'station') return <Navigate to="/station/dashboard" replace />
    if (userRole === 'customer') return <Navigate to="/dashboard" replace />
  }

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setShowScrollTop(scrollTop > 300)
      setScrollY(scrollTop)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 2
      const y = (e.clientY / window.innerHeight - 0.5) * 2
      setMouseX(x)
      setMouseY(y)
    }

    window.addEventListener('scroll', handleScroll)
    window.addEventListener('mousemove', handleMouseMove)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <>
      {/* Desktop Floating Navigation Pill - Hidden on Mobile */}
      {createPortal(
        <nav 
          className="hidden md:block fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] transition-all duration-300"
          onMouseLeave={() => {
            setActiveDropdown(null)
            setHoveredItem(null)
          }}
        >
          <div className={`bg-gradient-to-r from-orange-500 via-orange-600 to-red-500 rounded-3xl shadow-2xl backdrop-blur-sm transition-all duration-300 ${
            activeDropdown ? 'px-6 py-6' : 'px-6 py-3'
          }`}>
            {!activeDropdown ? (
              /* Collapsed State */
              <div className="flex items-center gap-6 w-[450px]">
                {/* Home Icon */}
                <Link to="/" className="text-white hover:scale-110 transition-transform">
                  <Home className="h-5 w-5" />
                </Link>

                {/* For Customers */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('customers')}
                >
                  For Customers
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* For Agents */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('agents')}
                >
                  For Agents
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* For Stations */}
                <button 
                  className="text-white font-medium flex items-center gap-1 hover:opacity-80 transition-opacity"
                  onMouseEnter={() => setActiveDropdown('stations')}
                >
                  For Stations
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Expanded State */
              <div className="flex flex-col w-[450px]">
                {/* Dropdown content */}
                <div className="mb-3 flex gap-6">
                  <div className="flex-1">
                    {activeDropdown === 'customers' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'fuel' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('fuel')}
                        >
                          Fuel Delivery
                        </Link>
                        <Link 
                          to="/auth/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'mechanic' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('mechanic')}
                        >
                          Mechanic Service
                        </Link>
                        <a 
                          href="#how-it-works" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'how-it-works' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('how-it-works')}
                        >
                          How It Works
                        </a>
                      </div>
                    )}

                    {activeDropdown === 'agents' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/agent/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'become-agent' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('become-agent')}
                        >
                          Become an Agent
                        </Link>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'agent-benefits' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('agent-benefits')}
                        >
                          Agent Benefits
                        </a>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'earnings' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('earnings')}
                        >
                          Earnings
                        </a>
                      </div>
                    )}

                    {activeDropdown === 'stations' && (
                      <div className="flex flex-col gap-2">
                        <Link 
                          to="/auth/station/register" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'partner' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('partner')}
                        >
                          Partner With Us
                        </Link>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'station-benefits' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('station-benefits')}
                        >
                          Station Benefits
                        </a>
                        <a 
                          href="#features" 
                          className={`text-white text-sm transition-opacity py-1 ${
                            hoveredItem === 'requirements' ? 'opacity-100 font-medium' : 'opacity-60'
                          }`}
                          onMouseEnter={() => setHoveredItem('requirements')}
                        >
                          Requirements
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Right side - Icon preview - Only show when hovering on links */}
                  {hoveredItem && (
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-20 h-20 flex items-center justify-center flex-shrink-0">
                      {hoveredItem === 'fuel' && <Fuel className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'mechanic' && <Wrench className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'how-it-works' && <CheckCircle className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'become-agent' && <Users className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'agent-benefits' && <Award className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'earnings' && <TrendingUp className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'partner' && <MapPin className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'station-benefits' && <Star className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                      {hoveredItem === 'requirements' && <Shield className="h-10 w-10 text-white animate-[zoomOut_0.3s_ease-out]" />}
                    </div>
                  )}
                </div>

                {/* Main navigation buttons - Always visible at same position */}
                <div className="flex items-center gap-4 pt-3 border-t border-white/20">
                  {/* Home Icon */}
                  <Link to="/" className="text-white hover:scale-110 transition-transform">
                    <Home className="h-5 w-5" />
                  </Link>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'customers' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('customers')}
                  >
                    For Customers
                    {activeDropdown === 'customers' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'customers' && <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'agents' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('agents')}
                  >
                    For Agents
                    {activeDropdown === 'agents' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'agents' && <ChevronDown className="h-4 w-4" />}
                  </button>

                  <button 
                    className={`text-white font-medium flex items-center gap-1 transition-opacity ${
                      activeDropdown === 'stations' ? 'opacity-100' : 'opacity-60'
                    }`}
                    onMouseEnter={() => setActiveDropdown('stations')}
                  >
                    For Stations
                    {activeDropdown === 'stations' && <ChevronUp className="h-4 w-4" />}
                    {activeDropdown !== 'stations' && <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>,
        document.body
      )}

      {/* Mobile Bottom Navigation - Visible only on mobile */}
      {createPortal(
        <>
          <button
            onClick={() => showMobileMenu ? handleCloseMenu() : setShowMobileMenu(true)}
            className="md:hidden fixed bottom-6 right-6 z-[9999] w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 transition-transform"
          >
            {showMobileMenu ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Mobile Slide-in Menu */}
          {showMobileMenu && (
            <>
              {/* Overlay */}
              <div 
                className="md:hidden fixed inset-0 bg-black/50 z-[9998] backdrop-blur-sm"
                onClick={handleCloseMenu}
              />
              
              {/* Slide-in Menu */}
              <div className={`md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 z-[9999] shadow-2xl overflow-y-auto ${isClosing ? 'animate-slide-out' : 'animate-slide-in'}`}>
                {/* Header */}
                <div className="p-6 border-b border-white/20">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Menu</h2>
                    <button
                      onClick={handleCloseMenu}
                      className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                    >
                      <ChevronDown className="h-5 w-5 rotate-90" />
                    </button>
                  </div>
                  <Link 
                    to="/" 
                    onClick={handleCloseMenu}
                    className="flex items-center gap-2 text-white/90 hover:text-white transition-colors"
                  >
                    <Home className="h-5 w-5" />
                    <span className="text-sm font-medium">Home</span>
                  </Link>
                </div>

                {/* Menu Items */}
                <div className="p-6 space-y-6">
                  {/* For Customers */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        For Customers
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Fuel className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Fuel Delivery</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <Link
                        to="/auth/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Mechanic Service</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#how-it-works"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>How It Works</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>

                  {/* For Agents */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        For Agents
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <Award className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/agent/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Become an Agent</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Agent Benefits</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Earnings</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>

                  {/* For Stations */}
                  <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <Fuel className="h-5 w-5" />
                        For Stations
                      </h3>
                      <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                        <MapPin className="h-6 w-6 text-white" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Link
                        to="/auth/station/register"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Partner With Us</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </Link>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Station Benefits</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                      <a
                        href="#features"
                        onClick={handleCloseMenu}
                        className="flex items-center justify-between text-white/80 hover:text-white text-sm py-2 px-3 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <span>Requirements</span>
                        <ChevronDown className="h-4 w-4 -rotate-90" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </>,
        document.body
      )}

      <div className="min-h-screen">
      {/* Hero Section */}
      <section id="home" className="relative w-full h-screen text-white overflow-hidden z-10" style={{
          background: 'radial-gradient(ellipse at top right, #f6850a, #9f3b07)'
        }}>
        <video 
          autoPlay 
          loop 
          muted 
          playsInline 
          className="absolute w-full h-full object-fill z-0"
          style={{
            transform: `translateY(${scrollY * 0.5}px)`
          }}
        >
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Wheel Image - Left Center */}
        <div 
          className="absolute left-4 top-20 w-32 h-32 md:left-20 md:top-32 md:w-48 md:h-48 transition-all duration-500 ease-out hover:scale-110 hover:rotate-12 cursor-pointer z-20"
          style={{
            transform: `translateY(${scrollY * 0.3}px) translateX(${mouseX * 20}px) translateY(${mouseY * 20}px)`
          }}
        >
          <img 
            src={wheelImg} 
            alt="Wheel"
            className="w-full h-full object-contain"
            style={{
              animation: "slideDiagonalLeft 8s ease-in-out infinite alternate"
            }}
          />
        </div>
        
        {/* Car Image - Right Bottom */}
        <div 
          className="absolute right-4 bottom-28 w-40 h-40 md:right-20 md:bottom-10 md:w-68 md:h-68 transition-all duration-500 ease-out hover:scale-110 hover:-rotate-6 cursor-pointer z-20"
          style={{
            transform: `translateY(${scrollY * -0.2}px) translateX(${mouseX * 15}px) translateY(${mouseY * 15}px)`
          }}
        >
          <img 
            src={carImg} 
            alt="Car"
            className="w-full h-full object-contain"
            style={{
              animation: "slideDiagonalRight 8s ease-in-out infinite alternate"
            }}
          />
        </div>
        
        {/* Diagonal Slide Animations */}
        <style>{`
          @keyframes slideDiagonalLeft {
            0% {
              transform: translateY(50%) translateX(0) rotate(0deg);
            }
            100% {
              transform: translateY(calc(50% - 20px)) translateX(-20px) rotate(-5deg);
            }
          }
          @keyframes slideDiagonalRight {
            0% {
              transform: translateX(0) translateY(0) rotate(0deg);
            }
            100% {
              transform: translateX(20px) translateY(-20px) rotate(5deg);
            }
          }
          @keyframes zoomOut {
            0% {
              transform: scale(1.5);
              opacity: 0;
            }
            100% {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes slide-in {
            from {
              transform: translateX(-100%);
            }
            to {
              transform: translateX(0);
            }
          }
          @keyframes slide-out {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(-100%);
            }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }
          .animate-slide-out {
            animation: slide-out 0.3s ease-out;
          }
        `}</style>
        
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16 md:pt-16">
          <div className="flex flex-col md:flex-row justify-between items-start h-full min-h-[70vh] relative">
            {/* Left side text */}
            <div 
              className="text-left z-10 mt-32 md:mt-0 md:self-start"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`
              }}
            >
              <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
                Fuel delivery<br />
                makes
              </h1>
              <div className="mt-4 rotate-90 origin-left hidden md:block">
                <span className="text-sm font-medium text-white/80 tracking-widest uppercase">
                  Scroll Down
                </span>
              </div>
            </div>
            
            {/* Right side text */}
            <div 
              className="text-right self-end z-10 mb-48 md:mb-0"
              style={{
                transform: `translateY(${scrollY * 0.15}px)`
              }}
            >
              <h1 className="text-5xl sm:text-6xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
                Everything<br />
                better.
              </h1>
              <div className="mt-4 -rotate-90 origin-right hidden md:block">
                <span className="text-sm font-medium text-white/80 tracking-widest uppercase">
                  Scroll Down
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 bg-gray-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full mb-4">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-600">Simple Process</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Getting fuel delivered or booking a mechanic has never been easier. 
              Follow these simple steps to get started.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center group" data-aos="fade-up" data-aos-delay="0">
              <div className="relative mb-6">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                  1
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-orange-400 rounded-full animate-pulse"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Request Service</h3>
              <p className="text-gray-600 leading-relaxed">
                Open the app, select your service (fuel delivery or mechanic), 
                enter your location, and specify your requirements.
              </p>
            </div>

            <div className="text-center group" data-aos="fade-up" data-aos-delay="200">
              <div className="relative mb-6">
                <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                  2
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-400 rounded-full animate-pulse delay-300"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Get Matched</h3>
              <p className="text-gray-600 leading-relaxed">
                We instantly connect you with the nearest verified service provider. 
                Track their location in real-time as they head your way.
              </p>
            </div>

            <div className="text-center group" data-aos="fade-up" data-aos-delay="400">
              <div className="relative mb-6">
                <div className="bg-gradient-to-r from-green-600 to-green-700 text-white w-20 h-20 rounded-full flex items-center justify-center mx-auto text-2xl font-bold shadow-lg group-hover:scale-110 transition-transform duration-300">
                  3
                </div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-purple-400 rounded-full animate-pulse delay-500"></div>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">Service Complete</h3>
              <p className="text-gray-600 leading-relaxed">
                Receive your service, make secure payment through the app, 
                and rate your experience to help maintain quality.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="py-20 relative z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-orange-100 px-4 py-2 rounded-full mb-4">
              <Award className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-600">Premium Services</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">
              Comprehensive automotive services delivered to your doorstep
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div data-aos="zoom-in" data-aos-delay="0">
              <Card hover className="group h-full">
                <CardContent className="text-center p-8">
                  <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Fuel className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Fuel Delivery</h3>
                  <p className="text-gray-600 mb-4">
                    Premium petrol and diesel delivered to your exact location
                  </p>
                  <div className="text-blue-600 font-medium text-sm">Starting from ₵15/L</div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="zoom-in" data-aos-delay="100">
              <Card hover className="group h-full">
                <CardContent className="text-center p-8">
                  <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Wrench className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Mobile Mechanic</h3>
                  <p className="text-gray-600 mb-4">
                    Expert mechanics for repairs and maintenance services
                  </p>
                  <div className="text-orange-600 font-medium text-sm">Starting from ₵50</div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="zoom-in" data-aos-delay="200">
              <Card hover className="group h-full">
                <CardContent className="text-center p-8">
                  <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Zap className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Battery Jump</h3>
                  <p className="text-gray-600 mb-4">
                    Quick battery jump-start service to get you moving
                  </p>
                  <div className="text-green-600 font-medium text-sm">Starting from ₵40</div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="zoom-in" data-aos-delay="300">
              <Card hover className="group h-full">
                <CardContent className="text-center p-8">
                  <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                    <Users className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">Tire Change</h3>
                  <p className="text-gray-600 mb-4">
                    Professional tire changing and repair services
                  </p>
                  <div className="text-purple-600 font-medium text-sm">Starting from ₵60</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* User Types */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-blue-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-purple-100 px-4 py-2 rounded-full mb-4">
              <Users className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-600">Join Our Network</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Join Our Platform</h2>
            <p className="text-xl text-gray-600">
              Multiple ways to be part of Ghana's automotive services revolution
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div data-aos="fade-right" data-aos-delay="0">
              <Card hover className="group border-2 border-transparent hover:border-blue-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Smartphone className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Customers</h3>
                    <p className="text-gray-600 mb-6">
                      Request fuel delivery and mechanic services on-demand
                    </p>
                    <Link to="/register">
                      <Button className="w-full group-hover:scale-105 transition-transform duration-300">
                        Get Started
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="100">
              <Card hover className="group border-2 border-transparent hover:border-orange-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Service Providers</h3>
                    <p className="text-gray-600 mb-6">
                      Become a fuel delivery agent or mobile mechanic
                    </p>
                    <Link to="/agent/register">
                      <Button variant="secondary" className="w-full group-hover:scale-105 transition-transform duration-300">
                        Join as Agent
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="200">
              <Card hover className="group border-2 border-transparent hover:border-green-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-green-500 to-green-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <MapPin className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Fuel Stations</h3>
                    <p className="text-gray-600 mb-6">
                      Partner with us to supply fuel for delivery services
                    </p>
                    <Link to="/station/register">
                      <Button variant="outline" className="w-full border-green-500 text-green-600 hover:bg-green-500 hover:text-white group-hover:scale-105 transition-all duration-300">
                        Partner With Us
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-left" data-aos-delay="300">
              <Card hover className="group border-2 border-transparent hover:border-purple-200 transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="text-center">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 rounded-2xl mb-4 inline-block shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Shield className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Enterprise</h3>
                    <p className="text-gray-600 mb-6">
                      Fleet management and corporate fuel solutions
                    </p>
                    <Link to="/business">
                      <Button variant="outline" className="w-full border-purple-500 text-purple-600 hover:bg-purple-500 hover:text-white group-hover:scale-105 transition-all duration-300">
                        Learn More
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 relative z-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="text-center mb-16"
            data-aos="fade-up"
          >
            <div className="inline-flex items-center space-x-2 bg-yellow-100 px-4 py-2 rounded-full mb-4">
              <Star className="h-4 w-4 text-yellow-600 fill-current" />
              <span className="text-sm font-medium text-yellow-600">Customer Reviews</span>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Users Say</h2>
            <p className="text-xl text-gray-600">
              Trusted by thousands of Ghanaians across the country
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div data-aos="fade-up" data-aos-delay="0">
              <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    "FillUp saved my day! My car broke down in Tema and within 20 minutes, 
                    I had a mechanic fixing my battery. Excellent service!"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full mr-4 flex items-center justify-center text-white font-semibold">
                      KA
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Kwame Asante</p>
                      <p className="text-gray-600 text-sm">Accra</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="100">
              <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    "I run a delivery business and FillUp's fuel delivery service keeps my 
                    fleet running. No more waiting in long fuel station queues!"
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-500 rounded-full mr-4 flex items-center justify-center text-white font-semibold">
                      AO
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Ama Osei</p>
                      <p className="text-gray-600 text-sm">Kumasi</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div data-aos="fade-up" data-aos-delay="200">
              <Card className="group hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    "As a fuel delivery agent, FillUp has given me a steady income. 
                    The app is easy to use and customers are always satisfied."
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-500 rounded-full mr-4 flex items-center justify-center text-white font-semibold">
                      JM
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Joseph Mensah</p>
                      <p className="text-gray-600 text-sm">Service Partner</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div data-aos="fade-right">
              <div className="inline-flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full mb-6">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Get In Touch</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Need Help or Have Questions?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Our support team is here to help you 24/7. Reach out to us through any of these channels.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4" data-aos="fade-right" data-aos-delay="100">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Call Us</p>
                    <p className="text-gray-600">+233 50 123 4567</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4" data-aos="fade-right" data-aos-delay="200">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Email Us</p>
                    <p className="text-gray-600">support@fillup.gh</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4" data-aos="fade-right" data-aos-delay="300">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Live Chat</p>
                    <p className="text-gray-600">Available 24/7 in the app</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div 
              className="bg-white p-8 rounded-2xl shadow-xl"
              data-aos="fade-left"
            >
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">Send us a message</h3>
              <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                    <input type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                    <input type="text" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input type="email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                  <textarea rows={4} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"></textarea>
                </div>
                <Button className="w-full">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white relative overflow-hidden z-20">
        <div className="absolute inset-0 bg-black opacity-20 z-0"></div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-1000"></div>
        
        <div 
          className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
          data-aos="zoom-in"
        >
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who never worry about fuel or car troubles again.
            Download the app or sign up online today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div data-aos="zoom-in" data-aos-delay="100">
              <Link to="/register">
                <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Start Using FillUp
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <div data-aos="zoom-in" data-aos-delay="200">
              <Link to="/agent/register">
                <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                  Become a Partner
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-3 rounded-full shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 z-50"
          aria-label="Scroll to top"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
      )}

      {/* Footer */}
      <Footer />
      </div>
    </>
  )
}