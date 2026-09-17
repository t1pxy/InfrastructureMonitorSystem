import InfrastructureDashboard from "@/components/dashboard/InfrastructureDashboard";
import DashboardPerformanceTrend from "@/components/dashboard/DashboardPerformanceTrend";
import DashboardDrilldown from "@/components/dashboard/DashboardDrilldown";

export default function HomePage() {
  const summary = {
    total: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    offline: 0,
    unknown: 0,
    updatePending: 0,
    desktop: 0,
    notebook: 0,
  };

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
      <DashboardDrilldown summary={summary} />
      <DashboardPerformanceTrend />
    </div>
  );
}
