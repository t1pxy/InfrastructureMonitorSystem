import { LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  title: string,
  value: string,
  description: string,
  icon: LucideIcon
}
export default function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="rounded-lg bg-muted p-2">
          <Icon className="h-4 w-4"></Icon>
        </div>
      </CardHeader>
    </Card>
  );
}
