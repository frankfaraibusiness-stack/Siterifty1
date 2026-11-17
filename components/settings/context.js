"use client";

import { createContext, useContext } from "react";

// Shared by every settings panel:
//  me          the member's profile (name, pictures, plan...)
//  setMe       replace it after a profile save
//  prefs       all saved preferences (account, content, safety, feed, look)
//  update      update(section, patch): applies at once, saves in the background
//  setBlocked  replace the blocked list (it has its own endpoint)
//  notify      notify("Saved") / notify("Oops", true) shows the toast
export const SettingsContext = createContext(null);
export const useSettings = () => useContext(SettingsContext);
