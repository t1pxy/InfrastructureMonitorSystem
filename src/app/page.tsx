import { DollarSign, ShoppingCart, UserCheck, Users, } from "lucide-react";
import StatCard from "@/components/main/StatCard";
import AnalyticsChart from "@/components/main/AnalyticsChart";
import RecentUsers from "@/components/main/RecentUsers";

export default function Home() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Overview of your system</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Total Hardware" value="234" description="Only Desktop/Laptop" icon={Users} />
        <StatCard title="Active Users" value="159" description="Offline 75" icon={UserCheck} />
        <StatCard title="Not Active 30 Day+" value="11" description="Offline 30 Day+" icon={Users} />
        <StatCard title="Outdated Windows" value="21" description="Last Update Build is 25H2" icon={DollarSign} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnalyticsChart />
        </div>
        <div>
          <RecentUsers />
        </div>
      </div>
    </div>
  );
}