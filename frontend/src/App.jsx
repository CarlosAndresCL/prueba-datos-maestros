import { useState } from 'react';
import Etapa1 from './pages/Etapa1';
import Etapa2 from './pages/Etapa2';

export default function App() {
    const [usuario, setUsuario] = useState('Usuario 1');

    return (
        <div className="contenedor">
            <div className="barra">
                <h1>Datos Maestros: solicitud de SKU</h1>
                <div className="campo">
                    <label>Usuario</label>
                    <select value={usuario} onChange={(e) => setUsuario(e.target.value)}>
                        <option>Usuario 1</option>
                        <option>Usuario 2</option>
                    </select>
                </div>
            </div>

            {usuario === 'Usuario 1' ? <Etapa1 usuario={usuario} /> : <Etapa2 usuario={usuario} />}
        </div>
    );
}