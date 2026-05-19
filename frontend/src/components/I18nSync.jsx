import { useEffect } from "react";
import { setAppLanguage } from "../i18n";
import { getStoredToken } from "../api/client";
import { useApiQuery } from "../hooks/useApiQuery";

/** Applies the signed-in user's locale to i18n. */
export default function I18nSync() {
  const { data: me } = useApiQuery("/api/me", { enabled: Boolean(getStoredToken()) });

  useEffect(() => {
    if (me?.locale) setAppLanguage(me.locale);
  }, [me?.locale]);

  return null;
}
