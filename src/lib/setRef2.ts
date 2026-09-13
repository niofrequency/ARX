export function setReference2File(file: File) {
  window.dispatchEvent(new CustomEvent('arx-set-ref2', { detail: file }));
  const inputs = Array.from(document.querySelectorAll('input[type="file"][accept="image/*"]')) as HTMLInputElement[];
  const target = inputs[1] || inputs[0];
  if (!target) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  target.files = dt.files;
  target.dispatchEvent(new Event('change', { bubbles: true }));
}
