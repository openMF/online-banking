import { useRef, useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { LocalizedTree } from "../i18n";
import { createHttpActivityApi } from "../lib/activity";
import type { CustomerSession } from "../lib/authentication/client";
import { createHttpAuthenticatorApi } from "../lib/authenticator";
import { createHttpPasswordApi } from "../lib/password";
import { createHttpStepUpApi } from "../lib/stepup";
import { ActivityFeed } from "./ActivityFeed";
import { AuthenticatorSection } from "./AuthenticatorSection";
import { ChangePasswordSection } from "./ChangePasswordSection";

type Props = {
  session: CustomerSession;
  onClose: () => void;
  /** The password was changed: the server ended every session. */
  onPasswordChanged: () => void;
  /** The session ended while using this area. */
  onExpired: () => void;
};

/**
 * The security area of a logged-in customer: authenticator app, password and activity history.
 * Everything goes through the memory-only session of the login (MX-452): this component never sees
 * the credential, and none of it is demo data.
 */
export function CustomerSecurity({ session, onClose, onPasswordChanged, onExpired }: Props) {
  // One set of clients per login, so the screens share the same session and the same rules.
  const [clients] = useState(() => ({
    authenticator: createHttpAuthenticatorApi({ customer: session }),
    stepUp: createHttpStepUpApi({ customer: session }),
    activity: createHttpActivityApi({ customer: session }),
    password: createHttpPasswordApi({ customer: session }),
  }));
  // A new key reads the history again after the authenticator changed.
  const [historyVersion, setHistoryVersion] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <LocalizedTree>
      <section
        className="customer-security security-view"
        aria-labelledby="customer-security-title"
      >
        <button type="button" className="back-link" onClick={onClose}>
          <ArrowLeft size={15} aria-hidden="true" />
          Volver al inicio
        </button>
        <h2 id="customer-security-title" ref={heading} tabIndex={-1}>
          Seguridad de tu cuenta
        </h2>
        <AuthenticatorSection
          api={clients.authenticator}
          stepUpApi={clients.stepUp}
          onChanged={() => setHistoryVersion((version) => version + 1)}
        />
        <ChangePasswordSection
          api={clients.password}
          stepUpApi={clients.stepUp}
          onChanged={onPasswordChanged}
          onExpired={onExpired}
        />
        <ActivityFeed key={historyVersion} api={clients.activity} />
      </section>
    </LocalizedTree>
  );
}
