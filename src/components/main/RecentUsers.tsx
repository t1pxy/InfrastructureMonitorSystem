import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const users = [
  {
    name: "Somchai Jaidee",
    email: "somchai@example.com",
    status: "Active",
    initials: "SJ",
  },
  {
    name: "Somsak Dee",
    email: "somsak@example.com",
    status: "Active",
    initials: "SD",
  },
  {
    name: "Patcharapol B.",
    email: "admin@example.com",
    status: "Pending",
    initials: "PB",
  },
  {
    name: "Anan Smith",
    email: "anan@example.com",
    status: "Active",
    initials: "AS",
  },
];

export default function RecentUsers() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {users.map((user) => (
          <div key={user.email} className="flex items-center justify-between gap-3" >
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback> {user.initials} </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium"> {user.name} </p>
                <p className="truncate text-xs text-muted-foreground"> {user.email} </p>
              </div>
            </div>
            <Badge variant={user.status === "Active" ? "default" : "secondary"} > {user.status}
            </Badge>
          </div>))}
      </CardContent>
    </Card>
  );
}