"use client";

import { useState, useTransition } from "react";
import {
  deleteAdminAction,
  inviteAdminAction,
  sendLinkAction,
  setAdminActiveAction,
} from "@/lib/admin/user-actions";

export type AdminUserRow = {
  id: string;
  username: string;
  email: string;
  isOwner: boolean;
  isActive: boolean;
  hasPassword: boolean;
  lastLogin: string | null;
};

const inputClass =
  "rounded-lg border border-cream-200 px-3 py-2 text-sm text-taupe-800 outline-none focus:border-salamander-400";
const smallButton =
  "rounded-full border border-taupe-400 px-3 py-1 text-xs font-medium text-taupe-700 transition-colors hover:bg-cream-100 disabled:opacity-60";

export default function AdminUsersPanel({
  users,
  canManage,
  currentId,
}: {
  users: AdminUserRow[];
  canManage: boolean;
  currentId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    error?: boolean;
  } | null>(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");

  function run(
    action: () => Promise<{ message: string; error?: boolean }>,
    after?: (ok: boolean) => void,
  ) {
    startTransition(async () => {
      try {
        const result = await action();
        setMessage({ text: result.message, error: result.error });
        after?.(!result.error);
      } catch {
        setMessage({ text: "Nu am putut face această acțiune.", error: true });
      }
    });
  }

  function status(user: AdminUserRow) {
    if (!user.isActive) return "dezactivat";
    if (!user.hasPassword) return "invitație trimisă, încă neacceptată";
    return "activ";
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-cream-200 bg-white">
        <ul className="divide-y divide-cream-100">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-taupe-800">
                  {user.username}
                  {user.isOwner && (
                    <span className="ml-2 rounded-full bg-salamander-50 px-2 py-0.5 text-xs font-medium text-salamander-600">
                      proprietar
                    </span>
                  )}
                  {user.id === currentId && (
                    <span className="ml-2 text-xs font-normal text-taupe-400">
                      (tu)
                    </span>
                  )}
                </p>
                <p className="text-xs text-taupe-500">
                  {user.email} · {status(user)}
                  {user.lastLogin && ` · ultima conectare ${user.lastLogin}`}
                </p>
              </div>

              {canManage && !user.isOwner && (
                <div className="flex flex-wrap gap-2">
                  {user.isActive && (
                    <button
                      type="button"
                      disabled={pending}
                      className={smallButton}
                      onClick={() => run(() => sendLinkAction(user.id))}
                    >
                      {user.hasPassword
                        ? "Trimite link de resetare parolă"
                        : "Trimite din nou invitația"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={pending}
                    className={smallButton}
                    onClick={() => {
                      const ok = user.isActive
                        ? window.confirm(
                            `Dezactivezi contul ${user.username}? Nu se va mai putea conecta.`,
                          )
                        : true;
                      if (ok) {
                        run(() => setAdminActiveAction(user.id, !user.isActive));
                      }
                    }}
                  >
                    {user.isActive ? "Dezactivează" : "Reactivează"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className={`${smallButton} border-red-300 text-red-600 hover:bg-red-50`}
                    onClick={() => {
                      if (
                        window.confirm(
                          `Ștergi definitiv contul ${user.username}? Istoricul lui rămâne în jurnal.`,
                        )
                      ) {
                        run(() => deleteAdminAction(user.id));
                      }
                    }}
                  >
                    Șterge
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {canManage ? (
        <section className="rounded-2xl border border-cream-200 bg-white p-5">
          <h2 className="font-display text-lg text-taupe-800">
            Invită un administrator nou
          </h2>
          <p className="mt-1 text-sm text-taupe-500">
            Primește un e-mail cu un link prin care își alege singur parola.
          </p>
          <form
            className="mt-4 flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              run(
                () => inviteAdminAction(username, email),
                (ok) => {
                  if (ok) {
                    setUsername("");
                    setEmail("");
                  }
                },
              );
            }}
          >
            <label className="flex flex-col gap-1 text-sm font-medium text-taupe-700">
              Nume de utilizator
              <input
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-taupe-700">
              E-mail
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </label>
            <button
              type="submit"
              disabled={pending || !username.trim() || !email.trim()}
              className="rounded-full bg-salamander-500 px-5 py-2 text-sm font-semibold text-cream-50 transition-colors hover:bg-salamander-600 disabled:opacity-60"
            >
              Trimite invitația
            </button>
          </form>
        </section>
      ) : (
        <p className="text-sm text-taupe-500">
          Doar proprietarul (Bea) poate invita, dezactiva sau șterge conturi de
          administrator.
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`text-sm ${message.error ? "text-red-600" : "text-green-700"}`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
