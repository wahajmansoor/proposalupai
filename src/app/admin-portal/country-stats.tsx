
"use client";

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Globe } from "lucide-react";

type CountryData = {
    code: string;
    name: string;
    count: number;
};

export function CountryStats({ countries }: { countries: CountryData[] }) {
    return (
        <Card className="lg:col-span-2">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Users by Country</CardTitle>
                </div>
                 <CardDescription className="text-sm text-muted-foreground pt-1">A breakdown of user signups by location.</CardDescription>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-72">
                    <div className="space-y-4 pr-4">
                        {countries.length > 0 ? countries.map((country) => (
                            <div key={country.code} className="flex items-center gap-4">
                                <img
                                    src={`https://flag.vercel.app/s/${country.code}.svg`}
                                    alt={`${country.name} flag`}
                                    className="h-6 w-9 rounded-sm object-cover"
                                />
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{country.name}</p>
                                </div>
                                <div className="text-sm font-semibold">{country.count}</div>
                            </div>
                        )) : (
                            <div className="text-center p-8 text-muted-foreground">
                                No country data available for users.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
