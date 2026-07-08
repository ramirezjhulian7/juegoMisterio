interface Props {
  title: string;
  caseNumber: string | null;
  briefing: string;
  onClose: () => void;
}

/** Modal con la lectura narrativa del caso. Se muestra al entrar a la sala. */
export default function Briefing({ title, caseNumber, briefing, onClose }: Props) {
  return (
    <div className="viewer" onClick={onClose}>
      <div className="briefing" onClick={(e) => e.stopPropagation()}>
        <div className="briefing-head">
          {caseNumber && <div className="briefing-num">EXPEDIENTE {caseNumber}</div>}
          <h1>{title}</h1>
        </div>
        <div className="briefing-body">
          {briefing.split("\n\n").map((par, i) => (
            <p key={i} dangerouslySetInnerHTML={{ __html: mdBold(par) }} />
          ))}
        </div>
        <button className="primary briefing-btn" onClick={onClose}>
          Comenzar la investigación →
        </button>
      </div>
    </div>
  );
}

// Convierte **texto** y *texto* en negrita/cursiva de forma segura (escapando HTML).
function mdBold(s: string): string {
  const esc = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return esc
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
}
