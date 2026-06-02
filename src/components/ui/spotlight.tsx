import React from "react"

interface SpotlightProps {
  className?: string
  fill?: string
}

export const Spotlight: React.FC<SpotlightProps> = ({
  className = "",
  fill = "white"
}) => {
  return (
    <svg
      className={`pointer-events-none absolute z-0 h-full w-full blur-3xl ${className}`}
      width="100%"
      height="100%"
      viewBox="0 0 960 540"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g filter="url(#filter0_f_343_3)">
        <circle cx="1" cy="1" r="300" fill={fill} fillOpacity="0.7" />
      </g>
      <defs>
        <filter
          id="filter0_f_343_3"
          x="-719"
          y="-719"
          width="1440"
          height="1440"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feGaussianBlur in="SourceGraphic" stdDeviation="150" />
        </filter>
      </defs>
    </svg>
  )
}
