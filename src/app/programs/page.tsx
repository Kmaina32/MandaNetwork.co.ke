import { Footer } from "@/components/Footer";
import { AppSidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { ProgramCard } from "@/components/ProgramCard";
import { Library } from "lucide-react";
import { adminDb } from "@/lib/firebase-admin";
import type { Program } from "@/lib/mock-data";

export const dynamic = "force-dynamic";

async function getPublicPrograms(): Promise<Program[]> {
  try {
    const snapshot = await adminDb.ref("programs").get();
    if (!snapshot.exists()) return [];
    const value = snapshot.val();
    return Object.entries(value).map(([id, program]) => ({ id, ...(program as Omit<Program, "id">) }));
  } catch (error) {
    console.error("Failed to load public programs:", error);
    return [];
  }
}

export default async function ProgramsPage() {
  const programs = await getPublicPrograms();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <Header />
        <main className="flex-grow">
          <section className="relative bg-secondary/50 py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              <div className="relative isolate overflow-hidden rounded-xl min-h-[400px] flex items-center justify-center text-center p-4 bg-cover bg-center" style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.58), rgba(0,0,0,0.68)), url(https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=85)' }}>
                <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20" />
                <div className="relative z-10 text-white">
                  <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit mb-4">
                    <Library className="h-10 w-10 text-primary" />
                  </div>
                  <h1 className="text-4xl md:text-5xl font-bold font-headline">Certificate Programs</h1>
                  <p className="mt-4 text-lg max-w-3xl mx-auto">
                    Commit to a structured learning path, master a new domain, and earn a special certificate to showcase your achievement.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="py-12 md:py-16">
            <div className="container mx-auto px-4 md:px-6">
              {programs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {programs.map((program) => <ProgramCard key={program.id} program={program} />)}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <p>There are no certificate programs available at this time. Please check back soon.</p>
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
