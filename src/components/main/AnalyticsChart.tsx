"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

const data = [
  { month: "Jan", users: 1200 },
  { month: "Feb", users: 1800 },
  { month: "Mar", users: 1600 },
  { month: "Apr", users: 2400 },
  { month: "May", users: 2800 },
  { month: "Jun", users: 3200 },
  { month: "Jul", users: 3800 },
];

export default function AnalyticsChart() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>User Analytics</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3"></CartesianGrid>
              <XAxis dataKey="month"></XAxis>
              <Tooltip></Tooltip>
              <Area
                type="monotone"
                dataKey="users"
                fill="hsl(var(--primary))"
                fillOpacity={0.15}
                stroke="hsl(var(--primary))"
              ></Area>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}