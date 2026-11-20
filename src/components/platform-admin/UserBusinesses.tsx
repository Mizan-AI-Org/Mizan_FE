import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { platformApi } from "@/lib/platformApi";
import {
  opsBadgeOk,
  opsBadgeWarn,
  opsBtnGhost,
  opsBtnPrimary,
  opsCard,
  opsInput,
  opsLink,
  opsMuted,
} from "@/components/platform-admin/opsStyles";

const ROLES = ["OWNER", "SUPER_ADMIN", "ADMIN", "MANAGER", "SUPERVISOR", "CHEF", "WAITER", "BARTENDER", "DISHWASHER", "CASHIER", "KITCHEN_HELP", "CLEANER", "RECEPTIONIST", "SECURITY", "STAFF"];

/** Ops Admin: the businesses this person runs (one account per business, linked). Add them to another business —
 * they get the WhatsApp welcome and Join activates it — or link an account that already exists. */
export default function UserBusinesses({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const key = ["platform-user-businesses", userId];
  const { data, isLoading } = useQuery({ queryKey: key, queryFn: () => platformApi.userBusinesses(userId) });
  const [search, setSearch] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [role, setRole] = useState("MANAGER");
  const [linkId, setLinkId] = useState("");
  const tenants = useQuery({
    queryKey: ["platform-tenants-pick-person", search],
    queryFn: () => platformApi.tenants({ q: search, status: "active", page_size: "10" }),
    enabled: search.trim().length >= 2,
  });
  const add = useMutation({
    mutationFn: () => platformApi.addUserToBusiness(userId, { restaurantId, role }),
    onSuccess: () => {
      setRestaurantId("");
      setSearch("");
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const link = useMutation({
    mutationFn: () => platformApi.linkUserAccount(userId, linkId.trim()),
    onSuccess: () => {
      setLinkId("");
      qc.invalidateQueries({ queryKey: key });
    },
  });
  const rows = data?.businesses || [];

  return (
    <section className={`${opsCard} space-y-4 p-5`}>
      <div>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Businesses</h3>
        <p className={opsMuted}>One person can run several businesses: one linked account per business.</p>
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ul className="space-y-1 text-sm">
          {rows.map((b) => (
            <li key={b.userId} className="flex items-center gap-2">
              <Link to={`/admin/users/${b.userId}`} className={opsLink}>
                {b.restaurantName || "—"}
              </Link>
              <span className={opsMuted}>{b.role.replace(/_/g, " ").toLowerCase()}</span>
              {b.active ? <span className={opsBadgeOk}>Active</span> : <span className={opsBadgeWarn}>Waiting for Join</span>}
              {b.current ? <span className={opsMuted}>(this account)</span> : null}
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (restaurantId) add.mutate();
        }}
      >
        <div className="text-xs font-medium text-slate-600 dark:text-slate-300">Add to another business</div>
        <input
          className={`${opsInput} w-full`}
          placeholder="Search a business…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {(tenants.data?.results || []).map((t) => (
            <button
              key={t.id}
              type="button"
              className={restaurantId === t.id ? opsBtnPrimary : opsBtnGhost}
              onClick={() => setRestaurantId(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <select className={opsInput} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ").toLowerCase()}
              </option>
            ))}
          </select>
          <button type="submit" className={opsBtnPrimary} disabled={!restaurantId || add.isPending}>
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
        {add.error ? <p className="text-sm text-rose-600">{(add.error as Error).message}</p> : null}
      </form>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (linkId.trim()) link.mutate();
        }}
      >
        <input
          className={`${opsInput} w-80`}
          placeholder="Link an existing account (user id)"
          value={linkId}
          onChange={(e) => setLinkId(e.target.value)}
        />
        <button type="submit" className={opsBtnGhost} disabled={!linkId.trim() || link.isPending}>
          Link
        </button>
        {link.error ? <p className="w-full text-sm text-rose-600">{(link.error as Error).message}</p> : null}
      </form>
    </section>
  );
}
