import WindowsFleetComparison from "@/components/windows-update/WindowsFleetComparison";

export default function UpdatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Windows Update Center
        </h1>

        <p className="mt-1 text-sm text-muted-foreground">
          ตรวจสอบ Windows Build ของเครื่องเทียบกับ Microsoft production baseline
        </p>
      </div>

      <WindowsFleetComparison />
    </div>
  );
}
