import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/hooks/use-language";

async function load(path: string, token: string) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data || body;
}

async function post(path: string, token: string, payload: Record<string, unknown>) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Request failed");
  return body.data || body;
}

export default function PurchasingPage() {
  const { t } = useLanguage();
  const { accessToken } = useAuth() as { accessToken: string };
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["purchasing", accessToken],
    queryFn: () => load("/purchasing/", accessToken),
    enabled: !!accessToken,
  });
  const receive = useMutation({
    mutationFn: (id: string) => post(`/purchasing/${id}/receive/`, accessToken, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchasing"] }),
  });

  const recs = data?.recommendations || [];
  const orders = data?.orders || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("purchasing.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("purchasing.subtitle")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t("purchasing.recommendations")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && <p className="text-sm text-muted-foreground">{t("purchasing.loading")}</p>}
          {!isLoading && recs.length === 0 && <p className="text-sm text-muted-foreground">{t("purchasing.none")}</p>}
          {recs.map((row: { id: string; name: string; suggestedQuantity: number; reason: string; unit: string }) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
              <div>
                <p className="font-medium">{row.name}</p>
                <p className="text-sm text-muted-foreground">{row.reason}</p>
              </div>
              <Button
                size="sm"
                onClick={() =>
                  post("/purchasing/", accessToken, { itemId: row.id, quantity: row.suggestedQuantity }).then(() =>
                    queryClient.invalidateQueries({ queryKey: ["purchasing"] }),
                  )
                }
              >
                {t("purchasing.order_qty", { qty: row.suggestedQuantity, unit: row.unit })}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t("purchasing.open_orders")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.map((row: { id: string; itemName: string; quantity: number; status: string }) => (
            <div key={row.id} className="flex items-center justify-between gap-4 border-b py-2 last:border-0">
              <p>
                {row.itemName} · {row.quantity} · {row.status}
              </p>
              {row.status !== "received" && (
                <Button size="sm" variant="outline" onClick={() => receive.mutate(row.id)}>
                  {t("purchasing.mark_received")}
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
