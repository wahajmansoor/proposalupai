import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function FeaturedPersonForm() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Featured Person</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Input placeholder="Name" />
                <Input placeholder="Title" />
                <Input placeholder="LinkedIn URL" />
                <Textarea placeholder="Bio" />
                <Input type="number" placeholder="Happy Customers" />
                <Input type="number" placeholder="Years Experience" />
                <Input type="number" placeholder="LinkedIn Community Size" />
                <Button>Update Featured Person</Button>
            </CardContent>
        </Card>
    );
}
