import React from "react";
import "./DetailPanel.css";

export interface DetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function DetailPanel({ isOpen, onClose, children }: DetailPanelProps) {
  return (
    <div className={`detail-panel ${isOpen ? "" : "detail-panel--closed"}`}>
      <button className="detail-panel-close" onClick={onClose} aria-label="Close panel">
        x
      </button>
      <div className="detail-panel-content">{children}</div>
    </div>
  );
}
