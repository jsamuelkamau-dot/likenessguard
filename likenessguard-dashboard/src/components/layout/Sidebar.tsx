import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { EdgeStatusIndicator } from "../edge/EdgeStatusIndicator";
import styles from "./Sidebar.module.css";

export interface NavItem {
  id: string;
  label: string;
  path: string;
}

export interface SidebarProps {
  className?: string;
}

const navigationItems: NavItem[] = [
  { id: "home", label: "Home", path: "/" },
  { id: "registration", label: "Registration", path: "/registration" },
  { id: "consent-policy", label: "Consent Policy", path: "/consent-policy" },
  { id: "consent-check", label: "Consent Check", path: "/consent-check" },
  { id: "activity-logs", label: "Activity Logs", path: "/activity-logs" },
  { id: "violations", label: "Violations", path: "/violations" },
  { id: "impact", label: "Impact Dashboard", path: "/impact" },
  { id: "federation", label: "Federated Registry", path: "/federation" },
  { id: "prompt-playground", label: "Prompt Playground", path: "/prompt-playground" },
  { id: "future-vision", label: "Future Vision", path: "/future-vision" },
];

export const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  return (
    <>
      <button className={styles.hamburger} onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle navigation menu" aria-expanded={isOpen}>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
        <span className={styles.hamburgerLine}></span>
      </button>

      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} aria-hidden="true" />}

      <nav className={`${styles.sidebar} ${isOpen ? styles.open : ""} ${className}`} aria-label="Main navigation">
        <div className={styles.header}>
          <h2 className={styles.logo}>LikenessGuard</h2>
          <div style={{ marginTop: 4 }}>
            <EdgeStatusIndicator compact />
          </div>
        </div>

        <ul className={styles.navList}>
          {navigationItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <li key={item.id} className={styles.navItem}>
                <Link to={item.path}
                  className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                  onClick={() => setIsOpen(false)}
                  aria-current={isActive ? "page" : undefined}>
                  <span className={styles.label}>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div style={{ padding: "12px 16px", borderTop: "1px solid #2a3550", marginTop: "auto" }}>
          <div style={{ color: "#4B556A", fontSize: 10, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            v2 — World First
          </div>
          <div style={{ color: "#4B556A", fontSize: 10 }}>
            Bedrock Multi-Agent + Edge + C2PA
          </div>
        </div>
      </nav>
    </>
  );
};
