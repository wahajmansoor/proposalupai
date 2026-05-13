
'use client';

import React from 'react';
import Link from 'next/link';
import useEmblaCarousel from 'embla-carousel-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Check, ShoppingCart, Search, Lightbulb, Globe, Mail, BarChart2, ChevronLeft, ChevronRight, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContactUserForm } from './contact-user-form';
import type { FeaturedUser } from '@/lib/featured-actions';

const serviceIcons: Record<string, React.ReactNode> = {
  'Web Development': <Check className="h-3 w-3 text-primary" />,
  'eCommerce Solution': <ShoppingCart className="h-3 w-3 text-primary" />,
  'On-Page SEO': <Search className="h-3 w-3 text-primary" />,
  'Landing Page': <Lightbulb className="h-3 w-3 text-primary" />,
  'Web Designing': <Globe className="h-3 w-3 text-primary" />,
  'Email Marketing': <Mail className="h-3 w-3 text-primary" />,
  'GoHighLevel Funnels': <BarChart2 className="h-3 w-3 text-primary" />,
};

interface FeaturedUsersCarouselProps {
  users: FeaturedUser[];
}

export function FeaturedUsersCarousel({ users }: FeaturedUsersCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' });

  const scrollPrev = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = React.useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  if (users.length === 0) return null;

  return (
    <div className="relative group">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
          </div>
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold tracking-tight">
              Featured Experts
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Want to be featured here? <Link href="/profile" className="text-primary hover:underline font-medium">Complete your profile</Link> and send a request.
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-gray-200 hover:bg-primary hover:text-white transition-all shadow-sm"
            onClick={scrollPrev}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-gray-200 hover:bg-primary hover:text-white transition-all shadow-sm"
            onClick={scrollNext}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {users.map((user) => (
            <div key={user.id} className="flex-[0_0_100%] min-w-0 pl-1">
              <Card className="border-0 bg-white/70 dark:bg-slate-900/50 backdrop-blur-md shadow-xl shadow-slate-200/50 dark:shadow-none rounded-3xl overflow-hidden h-full border border-slate-100 dark:border-slate-800">
                <CardContent className="md:p-3 p-0 flex flex-col h-full">
                  <div className="relative h-20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent rounded-2xl">
                    <div className="absolute -bottom-10 left-6">
                      <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-900 shadow-lg">
                        <AvatarImage src={user.image!} alt={user.name!} className="object-cover" />
                        <AvatarFallback className="bg-primary/5 text-primary text-xl font-bold">
                          {user.name?.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="absolute top-4 right-4">
                      <Badge className="bg-yellow-400 hover:bg-yellow-400 text-yellow-900 hover:text-yellow-900 backdrop-blur-md shadow-sm flex items-center gap-1 py-1 px-3">
                        <Crown className="h-3 w-3 fill-yellow-900" /> Featured Freelancer
                      </Badge>
                    </div>
                  </div>

                  <div className="pt-12 px-6 pb-6 space-y-4 flex-1 flex flex-col">
                    <div>
                      <h4 className="text-2xl font-bold text-slate-900 dark:text-slate-50">{user.name}</h4>
                      <p className="text-sm text-white bg-button-gradient px-3 py-1.4 inline-flex justify-center items-center rounded-full h-6 w-auto">{user.title || 'Freelancer'}</p>
                    </div>

                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      "{user.bio || 'Available for high-quality project collaborations.'}"
                    </p>

                    <div className="space-y-3 flex-1">
                      <p className="text-[14px] text-slate-400 dark:text-slate-500 font-medium">Specializations</p>
                      <div className="flex flex-wrap gap-2">
                        {user.services ? (
                          (() => {
                            try {
                              const services = JSON.parse(user.services);
                              return Array.isArray(services) ? services.map((service: string, i: number) => (
                                <div key={i} className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-900/50 px-2 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 transition-colors">
                                  {serviceIcons[service] || <Check className="h-4 w-4 text-primary" />}
                                  <span className="text-[13px] font-medium text-slate-700 dark:text-slate-300">{service}</span>
                                </div>
                              )) : null;
                            } catch (e) {
                              return null;
                            }
                          })()
                        ) : null}
                      </div>
                    </div>

                    <div className="pt-0 mt-0">
                      <ContactUserForm userName={user.name!} userEmail={user.email!} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
