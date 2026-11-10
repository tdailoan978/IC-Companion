const pad = (n: number) => String(n).padStart(2, '0');

/** "Build 2026-11-10 23:40 · abc1234", in the device's time zone. */
export function BuildStamp() {
  const d = new Date(__BUILD_INFO__.time);
  const when = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return (
    <p className="build-stamp">
      Build {when}
      {__BUILD_INFO__.commit && ` · ${__BUILD_INFO__.commit}`}
    </p>
  );
}
