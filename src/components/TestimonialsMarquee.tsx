import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar'
import { Card, CardContent } from './ui/Card'
import { Marquee } from './ui/3d-testimonials'

const testimonials = [
  {
    name: 'Kwame Osei',
    username: '@kwame',
    body: 'FillUp saved me hours on fuel deliveries. Reliable and fast!',
    img: 'https://randomuser.me/api/portraits/men/1.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Abena Mensah',
    username: '@abena',
    body: 'Best mechanic service I\'ve used. They arrived within 30 minutes!',
    img: 'https://randomuser.me/api/portraits/women/2.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Kofi Adekunle',
    username: '@kofi',
    body: 'The app is intuitive. Booking fuel delivery is so easy!',
    img: 'https://randomuser.me/api/portraits/men/3.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Ama Okonkwo',
    username: '@ama',
    body: 'Never worry about running out of fuel again. Game changer!',
    img: 'https://randomuser.me/api/portraits/women/4.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Yaw Boateng',
    username: '@yaw',
    body: 'Outstanding service quality. Worth every pesewa!',
    img: 'https://randomuser.me/api/portraits/men/5.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Nana Aba',
    username: '@nana',
    body: 'Professional agents. Always on time and courteous.',
    img: 'https://randomuser.me/api/portraits/women/6.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Akosua Gyimah',
    username: '@akosua',
    body: 'The wallet feature is brilliant. Easy payment tracking!',
    img: 'https://randomuser.me/api/portraits/women/7.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Ebo Mensah',
    username: '@ebo',
    body: 'Transformed how I manage my fleet. Highly recommended!',
    img: 'https://randomuser.me/api/portraits/men/8.jpg',
    country: '🇬🇭 Ghana',
  },
  {
    name: 'Comfort Asare',
    username: '@comfort',
    body: 'Best platform for on-demand automotive services in Ghana!',
    img: 'https://randomuser.me/api/portraits/women/9.jpg',
    country: '🇬🇭 Ghana',
  },
]

function TestimonialCard({ img, name, username, body, country }: (typeof testimonials)[number]) {
  const [imageLoaded, setImageLoaded] = React.useState(false)

  return (
    <Card className="w-72 flex-shrink-0 bg-white border-0 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-blue-300 to-purple-400 flex-shrink-0">
            <img
              src={img}
              alt={name}
              className="h-full w-full object-cover"
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageLoaded(false)}
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold text-sm">
                {name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <figcaption className="text-sm font-semibold text-gray-900 flex items-center gap-1">
              {name} <span className="text-xs font-normal">{country}</span>
            </figcaption>
            <p className="text-xs font-medium text-gray-500">{username}</p>
          </div>
        </div>
        <blockquote className="text-sm text-gray-700 leading-relaxed">{body}</blockquote>
      </CardContent>
    </Card>
  )
}

export function TestimonialsSection() {
  return (
    <div className="relative flex h-96 w-full flex-row items-center justify-center overflow-hidden gap-1.5 [perspective:300px] bg-white">
      <div
        className="flex flex-row items-center gap-4"
        style={{
          transform:
            'translateX(-100px) translateY(0px) translateZ(-100px) rotateX(20deg) rotateY(-10deg) rotateZ(20deg)',
        }}
      >
        {/* Vertical Marquee (downwards) */}
        <Marquee vertical pauseOnHover repeat={3} className="[--duration:50s]">
          {testimonials.map((review) => (
            <TestimonialCard key={`col1-${review.username}`} {...review} />
          ))}
        </Marquee>
        {/* Vertical Marquee (upwards) */}
        <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:50s]">
          {testimonials.map((review) => (
            <TestimonialCard key={`col2-${review.username}`} {...review} />
          ))}
        </Marquee>
        {/* Vertical Marquee (downwards) */}
        <Marquee vertical pauseOnHover repeat={3} className="[--duration:50s]">
          {testimonials.map((review) => (
            <TestimonialCard key={`col3-${review.username}`} {...review} />
          ))}
        </Marquee>
        {/* Vertical Marquee (upwards) */}
        <Marquee vertical pauseOnHover reverse repeat={3} className="[--duration:50s]">
          {testimonials.map((review) => (
            <TestimonialCard key={`col4-${review.username}`} {...review} />
          ))}
        </Marquee>

        {/* Gradient overlays for vertical marquee */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-white"></div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-white"></div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white"></div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-white"></div>
      </div>
    </div>
  )
}
