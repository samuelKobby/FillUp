import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/layout/Header'
import heroVideo from '../assets/hero.mp4'
import wheelImg from '../assets/wheel.png'
import carImg from '../assets/car.png'
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
  ChevronUp
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Card, CardContent } from '../components/ui/Card'

export const Landing: React.FC = () => {
  const [showScrollTop, setShowScrollTop] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop
      setShowScrollTop(scrollTop > 300)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  return (
    <div className="min-h-screen ">
      
      {/* Hero Section */}
      <section id="home" className="relative w-full h-screen text-white overflow-hidden" style={{
          background: 'radial-gradient(ellipse at top right, #f6850a, #9f3b07)'
        }}>
        <video autoPlay loop muted playsInline className="absolute w-full h-full object-fill">
          <source src={heroVideo} type="video/mp4" />
        </video>
        {/* Wheel Image - Left Center */}
        <div className="absolute left-4 md:left-20 top-10 w-24 h-24 md:w-48 md:h-48 transition-all duration-300 hover:scale-110 hover:rotate-12 cursor-pointer z-20">
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
        <div className="absolute right-4 md:right-20 bottom-10 w-32 h-32 md:w-68 md:h-68 transition-all duration-300 hover:scale-110 hover:-rotate-6 cursor-pointer z-20">
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
        <style>{"\n          @keyframes slideDiagonalLeft {\n            0% {\n              transform: translateY(50%) translateX(0) rotate(0deg);\n            }\n            100% {\n              transform: translateY(calc(50% - 20px)) translateX(-20px) rotate(-5deg);\n            }\n          }\n          @keyframes slideDiagonalRight {\n            0% {\n              transform: translateX(0) translateY(0) rotate(0deg);\n            }\n            100% {\n              transform: translateX(20px) translateY(-20px) rotate(5deg);\n            }\n          }\n        "}</style>
        
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-16">
          <div className="flex justify-between items-center h-full min-h-[70vh] relative">
            {/* Left side text */}
            <div className="text-left z-10">
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
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
            <div className="text-right z-10">
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-8xl font-bold text-white leading-tight">
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
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <div className="text-center group">
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

            <div className="text-center group">
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

            <div className="text-center group">
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
      <section id="services" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <Card hover className="group">
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

            <Card hover className="group">
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

            <Card hover className="group">
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

            <Card hover className="group">
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
      </section>

      {/* User Types */}
      <section className="py-20 bg-gradient-to-r from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <Card hover className="group border-2 border-transparent hover:border-blue-200 transition-all duration-300">
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

            <Card hover className="group border-2 border-transparent hover:border-orange-200 transition-all duration-300">
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

            <Card hover className="group border-2 border-transparent hover:border-green-200 transition-all duration-300">
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

            <Card hover className="group border-2 border-transparent hover:border-purple-200 transition-all duration-300">
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
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
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
            <Card className="group hover:shadow-xl transition-all duration-300">
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

            <Card className="group hover:shadow-xl transition-all duration-300">
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

            <Card className="group hover:shadow-xl transition-all duration-300">
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
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center space-x-2 bg-blue-100 px-4 py-2 rounded-full mb-6">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">Get In Touch</span>
              </div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Need Help or Have Questions?</h2>
              <p className="text-xl text-gray-600 mb-8">
                Our support team is here to help you 24/7. Reach out to us through any of these channels.
              </p>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Phone className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Call Us</p>
                    <p className="text-gray-600">+233 50 123 4567</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Email Us</p>
                    <p className="text-gray-600">support@fillup.gh</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
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
            
            <div className="bg-white p-8 rounded-2xl shadow-xl">
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
      <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full animate-pulse"></div>
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-white/10 rounded-full animate-pulse delay-1000"></div>
        
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of satisfied customers who never worry about fuel or car troubles again.
            Download the app or sign up online today!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button size="lg" className="text-lg px-8 py-4 bg-white text-blue-600 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Start Using FillUp
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/agent/register">
              <Button size="lg" variant="outline" className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-blue-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300">
                Become a Partner
              </Button>
            </Link>
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
    </div>
  )
}