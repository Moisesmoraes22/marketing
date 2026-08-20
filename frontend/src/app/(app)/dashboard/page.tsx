import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Jobs em andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Últimos roteiros gerados
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Conteúdo coletado (semana)
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">0</CardContent>
        </Card>
      </div>
    </div>
  );
}
