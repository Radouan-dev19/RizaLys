"use client";

import Link from "next/link";
import { KeyRound, LoaderCircle } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export default function ResetPasswordPage() {
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (fragment.get("type") === "recovery" && fragment.get("access_token")) {
      setAccessToken(fragment.get("access_token") ?? "");
    } else {
      setError("Ce lien de réinitialisation est invalide ou a expiré.");
    }
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError("Les deux mots de passe ne correspondent pas.");
      setSubmitting(false);
      return;
    }
    try {
      const response = await fetch("/api/customer/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", accessToken, password }),
      });
      const result = await response.json() as { reset?: boolean; error?: string };
      if (!response.ok || !result.reset) throw new Error(result.error || "La réinitialisation a échoué.");
      setSuccess(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "La réinitialisation a échoué.");
    } finally {
      setSubmitting(false);
    }
  }

  return <main className="account-page account-reset-page">
    <section className="account-auth-card account-reset-card">
      <div className="account-auth-icon"><KeyRound /></div>
      <span className="account-reset-eyebrow">SÉCURITÉ DU COMPTE</span>
      <h2>{success ? "Mot de passe modifié" : "Nouveau mot de passe"}</h2>
      {success ? <>
        <p>Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter en toute sécurité.</p>
        <Link className="account-primary-button" href="/mon-compte?mode=login">SE CONNECTER</Link>
      </> : <>
        <p>Choisissez un mot de passe unique et difficile à deviner.</p>
        <form onSubmit={submit}>
          <label>Nouveau mot de passe<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
          <label>Confirmer le mot de passe<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={72} required /></label>
          <small>12 caractères minimum avec une majuscule, une minuscule, un chiffre et un symbole.</small>
          {error && <div className="account-error" role="alert">{error}</div>}
          <button className="account-primary-button" disabled={submitting || !accessToken}>
            {submitting && <LoaderCircle />}{submitting ? "PATIENTEZ…" : "ENREGISTRER LE MOT DE PASSE"}
          </button>
        </form>
      </>}
    </section>
  </main>;
}
