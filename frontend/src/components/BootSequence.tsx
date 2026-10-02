import { useEffect, useState } from "react";

const LINES = [
  "> loading CIS · NIST · STIG · ISO rule sets",
  "> starting AI normalization engine",
  "> connecting compliance evaluator",
  "> ready",
];

export function BootSequence({ onComplete }: { readonly onComplete: () => void }) {
  const [visible, setVisible] = useState(0);

  useEffect(() => {
    if (visible >= LINES.length) {
      const t = setTimeout(onComplete, 300);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible((v) => v + 1), 220);
    return () => clearTimeout(t);
  }, [visible, onComplete]);

  return (
    <div className="boot-screen">
      <div className="boot-lines">
        {LINES.slice(0, visible).map((line) => (
          <div className="boot-line" key={line}>
            {line}
          </div>
        ))}
        <span className="boot-cursor" />
      </div>
    </div>
  );
}
