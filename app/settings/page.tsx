"use client";

// Use Node.js runtime for this page
export const runtime = "nodejs";

import { useState } from "react";
import { auth, useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Check, CreditCard, UserRound, Bell, Settings2 } from "lucide-react";

export default function SettingsPage() {
  const { user } = useUser();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("account");
  
  if (!user) {
    return redirect("/sign-in");
  }
  
  // Placeholder for future plan options
  const plans = [
    {
      name: "Free",
      description: "Basic features for individual use",
      price: "$0",
      features: [
        "10 projects",
        "Basic file storage (100MB)",
        "Standard support",
      ],
      current: true,
    },
    {
      name: "Pro",
      description: "Advanced features for professionals",
      price: "$19/month",
      features: [
        "Unlimited projects",
        "Advanced file storage (10GB)",
        "Priority support",
        "Custom branding options",
        "Advanced analytics"
      ],
      current: false,
    },
    {
      name: "Enterprise",
      description: "Tailored solutions for teams",
      price: "$99/month",
      features: [
        "Unlimited projects",
        "Enterprise file storage (100GB)",
        "24/7 dedicated support",
        "Custom API integrations",
        "Team collaboration tools",
        "Advanced security features"
      ],
      current: false,
    }
  ];
  
  // Placeholder function for saving profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setSaving(false);
    // You would typically update the Clerk user here
  };
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-semibold mb-8">Account Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-[250px_1fr] gap-8">
        <div className="space-y-4">
          <div className="flex flex-col">
            <div className="flex items-center space-x-4 mb-6">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user.imageUrl} alt={user.fullName || "User"} />
                <AvatarFallback>{user.firstName?.charAt(0) || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{user.fullName}</h2>
                <p className="text-sm text-neutral-400">{user.primaryEmailAddress?.emailAddress}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <Button
                variant={activeTab === "account" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("account")}
              >
                <UserRound className="h-4 w-4 mr-2" />
                Account
              </Button>
              <Button
                variant={activeTab === "billing" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("billing")}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Billing
              </Button>
              <Button
                variant={activeTab === "notifications" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("notifications")}
              >
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
              <Button
                variant={activeTab === "preferences" ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveTab("preferences")}
              >
                <Settings2 className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </div>
          </div>
        </div>
        
        <div>
          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveProfile}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" defaultValue={user.firstName || ""} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" defaultValue={user.lastName || ""} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        defaultValue={user.primaryEmailAddress?.emailAddress || ""} 
                        disabled 
                      />
                      <p className="text-xs text-muted-foreground">
                        To change your email, please use the Clerk user portal
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <Button type="submit" disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Manage your subscription and billing details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.name} className={`${plan.current ? 'border-primary' : 'border-border'}`}>
                      <CardHeader>
                        <CardTitle>{plan.name}</CardTitle>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold mb-4">{plan.price}</div>
                        <ul className="space-y-2">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center">
                              <Check className="h-4 w-4 mr-2 text-green-500" />
                              <span className="text-sm">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                      <CardFooter>
                        <Button className="w-full" variant={plan.current ? "outline" : "default"} disabled={plan.current}>
                          {plan.current ? "Current Plan" : "Upgrade"}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
                <div className="mt-8">
                  <h3 className="text-lg font-semibold mb-4">Billing Information</h3>
                  <p className="text-muted-foreground text-sm">
                    Payment methods and billing history will be available in future updates.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Receive project updates via email</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Project Reminders</p>
                      <p className="text-sm text-muted-foreground">Get reminded about approaching deadlines</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Marketing Emails</p>
                      <p className="text-sm text-muted-foreground">Receive updates about new features and offers</p>
                    </div>
                    <Switch />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {activeTab === "preferences" && (
            <Card>
              <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>Customize your experience</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Compact Mode</p>
                      <p className="text-sm text-muted-foreground">Display more content with less spacing</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Auto-Save</p>
                      <p className="text-sm text-muted-foreground">Automatically save changes as you work</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 