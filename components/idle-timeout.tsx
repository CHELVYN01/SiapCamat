"use client";

import { useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Batas idle: kalau tidak ada aktivitas selama ini, session dianggap
 * kadaluarsa dan user harus login lagi. Ubah angka di sini untuk
 * memperpendek/memperpanjang (mis. 5 * 60 * 1000 untuk 5 menit).
 */
const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit
const STORAGE_KEY = "siapcamat-last-active";
/** Interaksi yang dihitung sebagai "user masih aktif". */
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"] as const;

/**
 * Logout otomatis setelah idle. Prinsipnya: simpan timestamp aktivitas
 * terakhir di localStorage, lalu BANDINGKAN saat tab kembali aktif —
 * bukan pakai timer yang ikut berhenti waktu laptop tidur. Jadi kalau
 * laptop mati/tidur melewati batas, begitu dibuka lagi langsung ke login.
 *
 * Backstop-nya tetap ada di Supabase (access token kadaluarsa ~1 jam),
 * ini menambah lapisan idle yang jauh lebih pendek.
 */
export function IdleTimeout() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const loggingOut = useRef(false);

  useEffect(() => {
    function markActive() {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    }

    async function expire() {
      if (loggingOut.current) return; // cegah signOut ganda
      loggingOut.current = true;
      localStorage.removeItem(STORAGE_KEY);
      await supabase.auth.signOut(); // hapus cookie auth → middleware paksa /login
      router.replace("/login");
      router.refresh();
    }

    function check() {
      const last = Number(localStorage.getItem(STORAGE_KEY));
      if (last && Date.now() - last > IDLE_TIMEOUT_MS) {
        void expire();
        return true;
      }
      return false;
    }

    // Saat mount (termasuk reload halaman): cek dulu SEBELUM menimpa,
    // supaya reload setelah idle-lama langsung tertangkap, bukan malah
    // mereset timernya.
    if (check()) return;
    markActive();

    // Throttle: jangan menulis localStorage tiap pixel scroll.
    let throttled = false;
    function onActivity() {
      if (throttled) return;
      throttled = true;
      markActive();
      setTimeout(() => {
        throttled = false;
      }, 5000);
    }

    function onVisible() {
      if (document.visibilityState === "visible") check();
    }

    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", check);
    // Jaring pengaman selama tab terbuka tapi menganggur diam.
    const interval = window.setInterval(check, 30 * 1000);

    return () => {
      for (const ev of ACTIVITY_EVENTS) {
        window.removeEventListener(ev, onActivity);
      }
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", check);
      window.clearInterval(interval);
    };
  }, [supabase, router]);

  return null;
}
