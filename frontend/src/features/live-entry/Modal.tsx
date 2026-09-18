import type { ReactNode } from "react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button onClick={onClose}>Done</button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
