export function Lista({ etiqueta, valor, opciones, onChange, deshabilitado = false }) {
    return (
        <div className="campo">
            <label>{etiqueta}</label>
            <select value={valor} onChange={(e) => onChange(e.target.value)} disabled={deshabilitado}>
                <option value="">Seleccione...</option>
                {opciones.map((o) => (
                    <option key={o} value={o}>
                        {o}
                    </option>
                ))}
            </select>
        </div>
    );
}

export function Entrada({ etiqueta, valor, onChange, tipo = 'text', paso, min }) {
    return (
        <div className="campo">
            <label>{etiqueta}</label>
            <input
                type={tipo}
                value={valor}
                step={paso}
                min={min}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
}

export function Unidad({ etiqueta, valor, opciones, onChange }) {
    return (
        <div className="campo">
            <label>{etiqueta}</label>
            <select value={valor} onChange={(e) => onChange(e.target.value)}>
                {opciones.map(([v, texto]) => (
                    <option key={v} value={v}>
                        {texto}
                    </option>
                ))}
            </select>
        </div>
    );
}