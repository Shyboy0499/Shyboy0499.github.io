export function installDeferredDocumentClick(
  listener: (event: MouseEvent) => void,
): () => void {
  let installed = false;
  const timer = window.setTimeout(() => {
    document.addEventListener("click", listener);
    installed = true;
  }, 0);

  return () => {
    window.clearTimeout(timer);
    if (installed) document.removeEventListener("click", listener);
  };
}
