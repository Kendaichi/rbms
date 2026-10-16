"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { addUser, updateUserAccess, deleteUser } from "@/app/actions/users";
import { GRANTABLE_PAGES } from "@/lib/admin/pages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, selectClass } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "@/lib/store/toast";
import { cn } from "@/lib/utils";

export type UserRow = {
  id: string;
  name: string;
  role: "owner" | "staff";
  pages: string[];
  created_at: string;
};

const PAGE_LABEL = new Map<string, string>(
  GRANTABLE_PAGES.map((p) => [p.key, p.label]),
);

function pagesSummary(u: UserRow): string {
  if (u.role === "owner") return "All pages";
  if (u.pages.length === 0) return "No pages";
  if (u.pages.length === GRANTABLE_PAGES.length) return "All pages";
  return u.pages.map((p) => PAGE_LABEL.get(p) ?? p).join(", ");
}

export function UsersTable({
  users,
  currentUserId,
}: {
  users: UserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editRow, setEditRow] = useState<UserRow | null>(null);
  const [delRow, setDelRow] = useState<UserRow | null>(null);

  const refresh = () => router.refresh();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">All users</h2>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="size-4" />
          Add user
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[40rem] text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 font-medium">User</th>
              <th className="px-4 py-2.5 font-medium">Role</th>
              <th className="px-4 py-2.5 font-medium">Pages</th>
              <th className="px-4 py-2.5 font-medium">Joined</th>
              <th className="w-0 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
            {users.map((u) => (
              <tr key={u.id} className="bg-card align-top">
                <td className="px-4 py-3">
                  <span className="font-medium">{u.name || "Unnamed user"}</span>
                  {u.id === currentUserId && (
                    <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={u.role === "owner" ? "gold" : "muted"}>
                    {u.role === "owner" ? "Owner" : "Staff"}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{pagesSummary(u)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setEditRow(u)}
                      aria-label={`Edit ${u.name || "user"}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setDelRow(u)}
                      disabled={u.id === currentUserId}
                      aria-label={`Delete ${u.name || "user"}`}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {addOpen && (
        <UserDialog open onClose={() => setAddOpen(false)} onSaved={refresh} />
      )}
      {editRow && (
        <UserDialog
          open
          user={editRow}
          onClose={() => setEditRow(null)}
          onSaved={refresh}
        />
      )}
      {delRow && (
        <ConfirmDialog
          open
          onClose={() => setDelRow(null)}
          title="Delete user?"
          destructive
          confirmLabel="Delete user"
          body={`Remove ${delRow.name || "this user"}'s account? They will lose access immediately. This can't be undone.`}
          onConfirm={async () => {
            const r = await deleteUser(delRow.id);
            if (r.error) {
              toast.error(r.error);
              return;
            }
            toast.success("User deleted");
            refresh();
          }}
        />
      )}
    </div>
  );
}

function UserDialog({
  open,
  user,
  onClose,
  onSaved,
}: {
  open: boolean;
  user?: UserRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!user;
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<"owner" | "staff">(user?.role ?? "staff");
  const [pages, setPages] = useState<string[]>(user?.pages ?? []);

  const togglePage = (key: string) =>
    setPages((p) => (p.includes(key) ? p.filter((x) => x !== key) : [...p, key]));

  function submit() {
    start(async () => {
      const r = isEdit
        ? await updateUserAccess(user!.id, { role, pages })
        : await addUser({ email, password, name, role, pages });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(isEdit ? "User updated" : "User added");
      onSaved();
      onClose();
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit user" : "Add user"}
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Add user"}
          </Button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="space-y-3"
      >
        {!isEdit && (
          <>
            <Field label="Email">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                placeholder="name@example.com"
              />
            </Field>
            <Field label="Temporary password" hint="At least 8 characters — they can change it after signing in.">
              <Input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="off"
                placeholder="Temporary password"
              />
            </Field>
          </>
        )}
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full name"
          />
        </Field>
        <Field label="Role">
          <select
            className={selectClass}
            value={role}
            onChange={(e) => setRole(e.target.value as "owner" | "staff")}
          >
            <option value="staff">Staff</option>
            <option value="owner">Owner</option>
          </select>
        </Field>

        <div className="space-y-1.5">
          <p className="text-sm font-medium">Page access</p>
          {role === "owner" ? (
            <p className="text-xs text-muted-foreground">
              Owners can open every page, including Users.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {GRANTABLE_PAGES.map((p) => {
                const checked = pages.includes(p.key);
                return (
                  <label
                    key={p.key}
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={checked}
                      onChange={() => togglePage(p.key)}
                    />
                    {p.label}
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </form>
    </Dialog>
  );
}
