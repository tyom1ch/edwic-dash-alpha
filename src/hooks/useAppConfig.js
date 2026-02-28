// src/hooks/useAppConfig.js
import { useContext } from "react";
import { AppConfigContext } from "../context/AppConfigContext";

const useAppConfig = () => {
  const context = useContext(AppConfigContext);
  if (!context) {
    throw new Error("useAppConfig must be used within an AppConfigProvider");
  }
  return context;
};

export default useAppConfig;