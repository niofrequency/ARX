const REF_EVENT_NAMES: Record<1 | 2 | 3, string> = { 1: 'arx-set-ref1', 2: 'arx-set-ref2', 3: 'arx-set-ref3' };

export function setReferenceFile(file: File, slot: 1 | 2 | 3 = 2) {
  window.dispatchEvent(new CustomEvent(REF_EVENT_NAMES[slot], { detail: file }));
  const slotted = document.querySelector(`input[type="file"][data-arx-slot="${slot}"]`) as HTMLInputElement | null;
  const inputs = Array.from(document.querySelectorAll('input[type="file"][accept="image/*"]:not([data-arx-lib])')) as HTMLInputElement[];
  const target = slotted || inputs[slot - 1];
  if (!target) return;
  const dt = new DataTransfer();
  dt.items.add(file);
  target.files = dt.files;
  target.dispatchEvent(new Event('change', { bubbles: true }));
}

export function setReference2File(file: File) {
  setReferenceFile(file, 2);
}

export function setReference1File(file: File) {
  setReferenceFile(file, 1);
}

/** Image 3 — background/clothing/object reference. See adminPromptBuilder.ts's image3Role. */
export function setReference3File(file: File) {
  setReferenceFile(file, 3);
}

export function setCanvasRefsHidden(hidden: boolean) {
  document.body.classList.toggle('arx-hide-refs', hidden);
  let style = document.getElementById('arx-hide-refs-style') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'arx-hide-refs-style';
    document.head.appendChild(style);
  }
  style.textContent = hidden
    ? 'body.arx-hide-refs img.absolute.inset-0 { opacity: 0; pointer-events: none; }'
    : '';
}
