import InfrastructureDashboard from "@/components/dashboard/InfrastructureDashboard";
import DashboardPerformanceTrend from "@/components/dashboard/DashboardPerformanceTrend";
import DashboardDrilldown from "@/components/dashboard/DashboardDrilldown";

export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Infrastructure Monitor
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          ภาพรวมสถานะ Infrastructure และ Windows ของระบบ
        </p>
      </div>
      <InfrastructureDashboard />
      <DashboardDrilldown />
      <DashboardPerformanceTrend />
    </div>
  );
}
