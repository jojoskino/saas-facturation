import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../api/client";

const STORAGE_KEY = "facturo_amounts_unlocked";

export function useAmountsPrivacy() {
  const [amountsVisible, setAmountsVisible] = useState(
    () => typeof window !== "undefined" && sessionStorage.getItem(STORAGE_KEY) === "1",
  );

  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY) {
        setAmountsVisible(e.newValue === "1");
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setVisible = useCallback((visible) => {
    if (visible) {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
    setAmountsVisible(visible);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: visible ? "1" : null }));
  }, []);

  const maskMoney = useCallback(
    (value, formatter) => {
      if (amountsVisible) {
        return formatter(value);
      }
      return "******";
    },
    [amountsVisible],
  );

  async function unlockWithPassword(password) {
    await apiFetch("/api/me/verify-password", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  return { amountsVisible, maskMoney, unlockWithPassword, hide, setVisible };
}
