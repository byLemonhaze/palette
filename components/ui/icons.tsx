export const LockClosedIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="M7 11V8a5 5 0 0 1 10 0v3m-9 0h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LockOpenIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="M17 8a5 5 0 0 0-10 0m1 3h8a2 2 0 0 1 2 2v7H6v-7a2 2 0 0 1 2-2Z"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CheckIcon = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor">
    <path
      d="m5 12 4.2 4.1L19 7"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const ChevronDownIcon = ({ rotated = false }: { rotated?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    className={`h-4 w-4 transition-transform ${rotated ? "rotate-180" : ""}`}
    fill="none"
    stroke="currentColor"
  >
    <path
      d="m6 9 6 6 6-6"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
