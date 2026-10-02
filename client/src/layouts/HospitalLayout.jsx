import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  BedDouble,
  Building2,
  ChevronRight,
  Inbox,
  LayoutGrid,
  Siren,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AppShell } from "./AppShell";
import { useAuth } from "../features/auth/useAuth";
import { CountdownTimer } from "../components/CountdownTimer";
import { ROUTES } from "../constants/routes";
import {
  isSoundEnabled,
  setSoundEnabled,
} from "../features/hospital/alertSound";
import {
  useHospitalRealtime,
  usePendingRequests,
} from "../features/hospital/hooks";
import { VerificationBanner } from "../features/hospital/VerificationBanner";

const SECTION = {
  [ROUTES.HOSPITAL_DASHBOARD]: "Dashboard",
  [ROUTES.HOSPITAL_BEDS]: "Beds",
  [ROUTES.HOSPITAL_REQUESTS]: "Requests",
  [ROUTES.HOSPITAL_PROFILE]: "Hospital profile",
};

/**
 * Hospital panel on the shared AppShell: sidebar on desktop (≥1024 px), bottom tabs on phones
 * and tablets so a nurse can update beds one-handed (Stitch beds screen).
 */
export function HospitalLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sound, setSound] = useState(isSoundEnabled);
  useHospitalRealtime();
  const pending = usePendingRequests();
  const pendingList = pending.data?.requests ?? [];
  const next = pendingList[0];
  const onDashboard = location.pathname === ROUTES.HOSPITAL_DASHBOARD;

  const toggleSound = () => {
    setSoundEnabled(!sound);
    setSound(!sound);
  };

  const nav = [
    { to: ROUTES.HOSPITAL_DASHBOARD, label: "Dashboard", icon: LayoutGrid },
    { to: ROUTES.HOSPITAL_BEDS, label: "Beds", icon: BedDouble },
    {
      to: ROUTES.HOSPITAL_REQUESTS,
      label: "Requests",
      icon: Inbox,
      badge: pendingList.length,
    },
    {
      to: ROUTES.HOSPITAL_PROFILE,
      label: "Hospital profile",
      short: "Hospital",
      icon: Building2,
    },
  ];

  return (
    <AppShell
      nav={nav}
      hub="Hospital"
      section={`${user?.hospital?.name ?? "Hospital"} · ${SECTION[location.pathname] ?? "Hospital"}`}
      roleLabel={user?.hospital?.name ?? "Hospital staff"}
      mobileTabs
      headerActions={
        <button
          type="button"
          onClick={toggleSound}
          className="w-10 h-10 rounded-md flex items-center justify-center text-text-muted hover:bg-neutral-soft"
          aria-pressed={sound}
          aria-label={
            sound
              ? "Sound on — tap to mute alerts"
              : "Sound off — tap to enable alerts"
          }
          title={sound ? "Sound on" : "Sound off"}
        >
          {sound ? (
            <Volume2 className="w-5 h-5" />
          ) : (
            <VolumeX className="w-5 h-5" />
          )}
        </button>
      }
      banner={<VerificationBanner />}
      bottomBar={
        next &&
        !onDashboard && (
          <Link
            to={ROUTES.HOSPITAL_DASHBOARD}
            className="flex items-center gap-3 px-4 h-14 rounded-lg bg-danger text-text-inverse shadow-raised"
            aria-live="assertive"
          >
            <Siren className="w-5 h-5 shrink-0" aria-hidden />
            <span className="flex-1 font-semibold">
              Incoming request — respond now
            </span>
            <CountdownTimer
              expiresAt={next.expiresAt}
              offsetMs={
                new Date(pending.data.serverNow).getTime() -
                pending.data.fetchedAt
              }
              size="sm"
              tone="text-text-inverse"
            />
            <ChevronRight className="w-5 h-5" aria-hidden />
          </Link>
        )
      }
    />
  );
}
