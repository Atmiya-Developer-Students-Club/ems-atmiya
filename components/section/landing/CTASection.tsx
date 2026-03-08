import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, GraduationCap } from "lucide-react";

export function CTASection() {
  const benefits = [
    "Free for all students",
    "Easy registration process",
    "Instant event updates",
    "Community networking"
  ];
  return (
    <section className="py-20 lg:py-32 bg-primary relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-black/10 dark:bg-black/20" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary-foreground/10 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-foreground/10 rounded-full translate-x-1/2 translate-y-1/2" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* University Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-primary-foreground/20 backdrop-blur-sm text-primary-foreground rounded-full text-sm font-medium mb-8 border border-primary-foreground/20">
            <GraduationCap className="w-4 h-4 mr-2" />
            Join Atmiya University Community
          </div>

          {/* Main Heading */}
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6">
            Ready to Enhance Your
            <span className="block">Campus Experience?</span>
          </h2>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl text-primary-foreground/80 mb-12 max-w-3xl mx-auto leading-relaxed">
            Connect with your campus community, discover amazing events, and make the most of your
            university life at Atmiya University.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-center justify-center sm:justify-start text-primary-foreground/90">
                <CheckCircle className="w-5 h-5 mr-2 text-green-400 flex-shrink-0" />
                <span>{benefit}</span>
              </div>
            ))}
          </div>          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Link href="/register">
              <Button
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border-0"
              >
                Join as Student
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/events">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 backdrop-blur-sm px-8 py-4 text-lg font-semibold transition-all duration-200 bg-transparent"
              >
                Explore Events
              </Button>
            </Link>
          </div>

          {/* Trust Message */}
          <p className="text-primary-foreground/70 text-sm">
            Official Atmiya University platform • Secure registration • Free access for students
          </p>
        </div>        {/* Campus Statistics */}
        <div className="mt-16 bg-primary-foreground/10 backdrop-blur-sm rounded-2xl p-8 border border-primary-foreground/20">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-primary-foreground mb-2">1,000+</div>
              <div className="text-primary-foreground/70">Active students</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground mb-2">15+</div>
              <div className="text-primary-foreground/70">Student clubs & societies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-primary-foreground mb-2">100+</div>
              <div className="text-primary-foreground/70">Events annually</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
