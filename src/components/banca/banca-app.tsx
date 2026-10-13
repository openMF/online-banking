import { useEffect } from "react";
import { Toaster, toast } from "sonner";
import { PRIVATE_SCREENS } from "@/lib/banca/model";
import { useBanca } from "@/lib/banca/store";
import { OtpProvider } from "@/components/banca/otp";
import { AppShell } from "@/components/banca/private";
import { PublicScreens } from "@/components/banca/public";

export function BancaApp() {
  useEffect(() => {
    void Promise.resolve(useBanca.persist.rehydrate()).then(() => {
      useBanca.getState().boot();
    });
  }, []);

  return (
    <OtpProvider>
      <Toaster position="top-center" theme="light" />
      <Gate />
    </OtpProvider>
  );
}

function Gate() {
  const screen = useBanca((state) => state.screen);
  const sessionUserId = useBanca((state) => state.sessionUserId);
  const expires = useBanca((state) => state.sessionExpiresAt);

  useEffect(() => {
    if (!sessionUserId || !expires) return;
    const left = expires - Date.now();
    if (left <= 0) {
      useBanca.getState().endSession("inactividad");
      toast("Cerramos la sesión por 5 minutos sin actividad.");
      return;
    }
    const id = window.setTimeout(() => {
      useBanca.getState().endSession("inactividad");
      toast("Cerramos la sesión por 5 minutos sin actividad.");
    }, left);
    return () => window.clearTimeout(id);
  }, [sessionUserId, expires]);

  if (sessionUserId && PRIVATE_SCREENS.includes(screen)) return <AppShell />;
  return <PublicScreens />;
}
