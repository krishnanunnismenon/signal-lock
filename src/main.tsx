import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/archivo";
import "@fontsource/archivo-black/latin.css";
import "@fontsource/barlow-condensed/latin-800.css";
import "@fontsource/barlow-condensed/latin-900.css";
import "./styles.css";
import App from "./App";
import { Host, Participant, Operator, Display } from "./Workshop";
const Screen =
  location.pathname === "/solo"
    ? App
    : location.pathname === "/join"
      ? Participant
      : location.pathname === "/operator"
        ? Operator
        : location.pathname === "/display"
          ? Display
          : Host;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Screen />
  </React.StrictMode>,
);
