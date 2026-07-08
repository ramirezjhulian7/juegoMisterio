import type { Character } from "../types";

interface Props {
  characters: Character[];
  onClose: () => void;
}

const ROLE_LABEL: Record<string, string> = {
  victima: "Víctima",
  sospechoso: "Sospechoso",
  testigo: "Testigo",
  invitado: "Invitado",
  invitada: "Invitada",
};

/** Presentación del elenco del caso, tras el briefing. */
export default function Cast({ characters, onClose }: Props) {
  return (
    <div className="viewer" onClick={onClose}>
      <div className="cast" onClick={(e) => e.stopPropagation()}>
        <div className="cast-head">
          <h1>Los presentes esa noche</h1>
          <p>Cuatro parejas. Una víctima. El resto... quién sabe. Conócelos.</p>
        </div>

        <div className="cast-grid">
          {characters.map((c) => (
            <div key={c.id} className={"cast-card" + (c.role === "victima" ? " victim" : "")}>
              {c.photo_path && <img src={`/uploads/${c.photo_path}`} alt={c.name} />}
              <div className="cast-info">
                <div className="cast-name">{c.name}</div>
                <div className="cast-role">{ROLE_LABEL[c.role] ?? c.role}</div>
                {c.bio && <p className="cast-bio">{c.bio}</p>}
              </div>
            </div>
          ))}
        </div>

        <button className="primary cast-btn" onClick={onClose}>
          Entrar al expediente →
        </button>
      </div>
    </div>
  );
}
