"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export default function PricingPage() {
  const { userId } = useAuth();
  const [monthlyLink, setMonthlyLink] = useState("#");
  const [yearlyLink, setYearlyLink] = useState("#");

  useEffect(() => {
    // Set the stripe links from environment variables on the client side
    setMonthlyLink(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY || "#");
    setYearlyLink(process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK_YEARLY || "#");
  }, []);

  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">Choose Your Plan</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PricingCard
          title="Monthly Plan"
          price="$10"
          description="Billed monthly"
          buttonText="Subscribe Monthly"
          buttonLink={monthlyLink}
          userId={userId || null}
        />
        <PricingCard
          title="Annual Plan"
          price="$100"
          description="Billed annually (save 16%)"
          buttonText="Subscribe Annually"
          buttonLink={yearlyLink}
          userId={userId || null}
          featured
        />
      </div>
    </div>
  );
}

interface PricingCardProps {
  title: string;
  price: string;
  description: string;
  buttonText: string;
  buttonLink: string;
  userId: string | null;
  featured?: boolean;
}

function PricingCard({ title, price, description, buttonText, buttonLink, userId, featured }: PricingCardProps) {
  return (
    <Card className={cn("flex flex-col", featured && "border-primary")}>
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <p className="text-4xl font-bold">{price}</p>
        <ul className="mt-4 space-y-2">
          <li className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 mr-2 text-green-500"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>Unlimited projects</span>
          </li>
        </ul>
      </CardContent>
      <CardFooter>
        <Button className={cn("w-full", featured && "bg-primary")} asChild>
          <a href={`${buttonLink}${userId ? `?client_reference_id=${userId}` : ""}`}>{buttonText}</a>
        </Button>
      </CardFooter>
    </Card>
  );
}
