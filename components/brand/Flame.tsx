// The Proline brandmark — the standalone "airflow flame".
// Paths are the official vector (viewBox 0 0 39.7 33.1); fill follows currentColor
// so it recolors per surface: Sky Blue on white, white on Sky Blue / dark.
export function Flame({
  className,
  title = "Proline",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 39.7 33.1"
      className={className}
      fill="currentColor"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M21.5,11.4C8.6,12.3,1.7,24.5,0,33.1c4.2-3.7,9.9-12.5,22.4-13.4C33.1,19,39.3,14.4,39.7,0C35.7,6.8,35,10.4,21.5,11.4" />
      <path d="M23.5,23c-9.7,0.8-14.6,3.9-16.8,7.8c3.1-1.2,8.2-2.5,19.9-2.3c11.7,0.2,13.1-7.7,11.1-14.1C37.1,18.6,31.3,22.3,23.5,23" />
      <path d="M19.2,9.3c7.7-0.5,12.9-1.6,14.1-5.7C28.7,7,24.4,5.5,13.8,5.1C3.1,4.7,1.7,14.9,3,19.5C5.7,15.6,9.7,9.9,19.2,9.3" />
    </svg>
  );
}
