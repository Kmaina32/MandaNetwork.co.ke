import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rocket } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { adminDb } from "@/lib/firebase-admin";
import type { Bootcamp } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getPublicBootcamps(): Promise<Bootcamp[]> {
  try {
    const snapshot = await adminDb.ref("bootcamps").get();
    if (!snapshot.exists()) return [];
    const value = snapshot.val();
    return Object.entries(value).map(([id, bootcamp]) => ({ id, ...(bootcamp as Omit<Bootcamp, "id">) }));
  } catch (error) {
    console.error("Failed to load public bootcamps:", error);
    return [];
  }
}

function formatStartDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be announced" : format(date, "PPP");
}

function BootcampCard({ bootcamp }: { bootcamp: Bootcamp }) {
  return (
    <Card className="flex flex-col h-full overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg">
      <CardHeader className="p-0">
        <Link href={`/bootcamps/${bootcamp.id}`} aria-label={`View ${bootcamp.title}`}>
          <div className="relative w-full h-48 bg-muted">
            {bootcamp.imageUrl ? (
              <Image src={bootcamp.imageUrl} alt={bootcamp.title} fill className="object-cover" />
            ) : (
              <div className="h-full w-full bg-muted" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="p-6 flex-grow">
        <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
          <Badge variant="destructive">{bootcamp.duration}</Badge>
          <p className="text-xs text-muted-foreground">Starts: {formatStartDate(bootcamp.startDate)}</p>
        </div>
        <CardTitle className="text-xl mb-2 font-headline">{bootcamp.title}</CardTitle>
        <p className="text-muted-foreground text-sm line-clamp-3">{bootcamp.description}</p>
      </CardContent>
      <CardFooter className="p-6 pt-0 flex justify-between items-center">
        <p className="text-lg font-bold text-primary">
          {bootcamp.price > 0 ? `Ksh ${bootcamp.price.toLocaleString()}` : "Free"}
        </p>
        <Button asChild><Link href={`/bootcamps/${bootcamp.id}`}>View Details</Link></Button>
      </CardFooter>
    </Card>
  );
}

export default async function BootcampsPage() {
  const bootcamps = await getPublicBootcamps();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="relative bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="relative isolate overflow-hidden rounded-xl min-h-[400px] flex items-center justify-center text-center p-4 bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.56), rgba(0,0,0,0.68)), url(https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1800&q=85)' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
                <div className="relative z-10 text-white">
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <Rocket className="h-10 w-10 text-primary" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold font-headline">Varban Academy Bootcamps</h1>
                  <p className="mt-4 text-lg max-w-3xl mx-auto">
                    Accelerate your career with our intensive, hands-on bootcamps designed to get you job-ready.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {bootcamps.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {bootcamps.map((bootcamp) => <BootcampCard key={bootcamp.id} bootcamp={bootcamp} />)}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>There are no bootcamps available at this time. Please check back soon.</p>
                </div>
              )}
            </div>
          </section>
        </main>
        <Footer />
      </SidebarInset>
    </SidebarProvider>
  );
}
