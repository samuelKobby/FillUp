import { SplineScene } from "./ui/splite"
import { Card, CardContent } from "./ui/card"
import { Spotlight } from "./ui/spotlight"

export function SplineSceneBasic() {
  return (
    <Card className="w-full h-screen bg-gradient-to-r from-gray-950 via-slate-900 to-gray-950 relative overflow-hidden border-0 rounded-none">
      <Spotlight
        className="-top-40 left-0 md:left-60 md:-top-20"
        fill="rgba(255, 107, 53, 0.3)"
      />

      <CardContent className="p-0 h-full">
        <div className="flex h-full">
          {/* Left content */}
          <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
            <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-orange-400 to-orange-500">
              Experience FillUp in 3D
            </h1>
            <p className="mt-4 text-gray-300 max-w-lg leading-relaxed">
              Explore our fuel delivery and mechanic services through an immersive 3D experience.
              Discover how FillUp revolutionizes automotive services in Ghana.
            </p>
          </div>

          {/* Right content */}
          <div className="flex-1 relative">
            <SplineScene
              scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
              className="w-full h-full"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
