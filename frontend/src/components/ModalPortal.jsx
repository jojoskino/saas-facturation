import { createPortal } from "react-dom";

/** Rend les modales au niveau du body pour passer au-dessus du header sticky. */
export default function ModalPortal({ children }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
