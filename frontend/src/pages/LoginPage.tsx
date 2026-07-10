import { useState, type ChangeEvent, type FormEvent } from "react";
import { useNavigate, useLocation, type Location } from "react-router-dom";
import { z } from "zod";
import { Button } from "../components/ui/Button";
import { ApiError, api } from "../api/client";
import { useSession } from "../context/SessionContext";

type LocationState = {
  from?: Location;
};

/**
 * Type guard to safely check if location.state is LocationState
 */
function isLocationState(state: unknown): state is LocationState {
  return (
    typeof state === "object" &&
    state !== null &&
    ("from" in state || Object.keys(state).length === 0)
  );
}

type LoginStep = "credentials" | "totp-verify" | "totp-setup";

const step1ResponseSchema = z.object({
  requiresTotpSetup: z.boolean(),
  totpQrCode: z.string().optional(),
});

const setupResponseSchema = z.object({
  id: z.string(),
});

const verifyResponseSchema = z.object({
  id: z.string(),
});

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { refreshSession } = useSession();
  const [step, setStep] = useState<LoginStep>("credentials");
  const [credentials, setCredentials] = useState({ id: "", password: "" });
  const [totpCode, setTotpCode] = useState("");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from =
    (isLocationState(location.state) ? location.state : null)?.from?.pathname ?? "/artists";

  const handleCredentialsChange =
    (field: "id" | "password") => (event: ChangeEvent<HTMLInputElement>) => {
      setCredentials((current) => ({ ...current, [field]: event.target.value }));
      if (error) setError(null);
    };

  const handleTotpCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
    setTotpCode(event.target.value.replace(/\D/g, "").slice(0, 6));
    if (error) setError(null);
  };

  const handleCredentialsSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!credentials.id || !credentials.password) {
      setError("ID and password are required");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post(
        "/api/auth/login",
        {
          id: credentials.id,
          password: credentials.password,
        },
        step1ResponseSchema,
        { preventUnauthorizedRedirect: true },
      );

      if (response.requiresTotpSetup) {
        setQrCode(response.totpQrCode || null);
        setStep("totp-setup");
      } else {
        setStep("totp-verify");
      }
    } catch (errorValue) {
      const message =
        errorValue instanceof ApiError
          ? errorValue.status === 401
            ? "Invalid credentials"
            : errorValue.message
          : errorValue instanceof Error
            ? errorValue.message
            : "Login failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpSetupSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (totpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(
        "/api/auth/login/totp",
        {
          id: credentials.id,
          totpCode,
        },
        setupResponseSchema,
        { preventUnauthorizedRedirect: true },
      );

      // The session cookie is already set by the server
      await refreshSession();
      navigate(from, { replace: true });
    } catch (errorValue) {
      const message =
        errorValue instanceof ApiError
          ? errorValue.status === 401
            ? "Invalid TOTP code. Please try again."
            : errorValue.message
          : errorValue instanceof Error
            ? errorValue.message
            : "Setup failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTotpVerifySubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (totpCode.length !== 6) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post(
        "/api/auth/login/totp",
        {
          id: credentials.id,
          totpCode,
        },
        verifyResponseSchema,
        { preventUnauthorizedRedirect: true },
      );

      // The session cookie is already set by the server
      await refreshSession();
      navigate(from, { replace: true });
    } catch (errorValue) {
      const message =
        errorValue instanceof ApiError
          ? errorValue.status === 401
            ? "Invalid TOTP code"
            : errorValue.message
          : errorValue instanceof Error
            ? errorValue.message
            : "Login failed";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackClick = () => {
    setStep("credentials");
    setTotpCode("");
    setQrCode(null);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4 py-10 text-slate-900">
      <div className="w-full max-w-md rounded-3xl border border-slate-300 bg-slate-50/90 p-8 shadow-2xl shadow-slate-200/20">
        <h1 className="text-3xl font-semibold">Login</h1>

        {step === "credentials" && (
          <>
            <p className="mt-3 text-sm text-slate-600">Enter your credentials to continue.</p>

            <form onSubmit={handleCredentialsSubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                ID
                <input
                  type="text"
                  value={credentials.id}
                  onChange={handleCredentialsChange("id")}
                  className="mt-2 w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Password
                <input
                  type="password"
                  value={credentials.password}
                  onChange={handleCredentialsChange("password")}
                  className="mt-2 w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>

              {error ? (
                <div className="rounded-2xl bg-rose-100/80 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in…" : "Continue"}
              </Button>
            </form>
          </>
        )}

        {step === "totp-setup" && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Set up two-factor authentication for your account.
            </p>

            <div className="mt-8 space-y-5">
              <div className="space-y-3">
                <p className="text-sm text-slate-700">
                  Scan this QR code with your authenticator app:
                </p>
                {qrCode && (
                  <div className="flex justify-center rounded-lg bg-white p-4">
                    <img src={qrCode} alt="TOTP QR Code" className="h-48 w-48" />
                  </div>
                )}
              </div>

              <form onSubmit={handleTotpSetupSubmit} className="space-y-5">
                <label className="block text-sm font-medium text-slate-700">
                  Enter the 6-digit code from your authenticator app:
                  <input
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={handleTotpCodeChange}
                    autoComplete="one-time-password"
                    placeholder="000000"
                    className="mt-2 w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-center text-2xl letter-spacing-2 font-mono text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                  />
                </label>

                {error ? (
                  <div className="rounded-2xl bg-rose-100/80 px-4 py-3 text-sm text-rose-700">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting || totpCode.length !== 6}
                  className="w-full"
                >
                  {isSubmitting ? "Verifying…" : "Verify and Continue"}
                </Button>

                <button
                  type="button"
                  onClick={handleBackClick}
                  disabled={isSubmitting}
                  className="w-full rounded-2xl border border-slate-400 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                >
                  Back
                </button>
              </form>
            </div>
          </>
        )}

        {step === "totp-verify" && (
          <>
            <p className="mt-3 text-sm text-slate-600">
              Enter your authenticator code to complete login.
            </p>

            <form onSubmit={handleTotpVerifySubmit} className="mt-8 space-y-5">
              <label className="block text-sm font-medium text-slate-700">
                TOTP Code
                <input
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={totpCode}
                  onChange={handleTotpCodeChange}
                  autoComplete="one-time-password"
                  placeholder="000000"
                  className="mt-2 w-full rounded-2xl border border-slate-400 bg-white px-4 py-3 text-center text-2xl letter-spacing-2 font-mono text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
                />
              </label>

              {error ? (
                <div className="rounded-2xl bg-rose-100/80 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting || totpCode.length !== 6}
                className="w-full"
              >
                {isSubmitting ? "Verifying…" : "Sign in"}
              </Button>

              <button
                type="button"
                onClick={handleBackClick}
                disabled={isSubmitting}
                className="w-full rounded-2xl border border-slate-400 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
              >
                Back
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

export default LoginPage;
