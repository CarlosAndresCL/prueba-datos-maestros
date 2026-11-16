import { useEffect, useState } from 'react';

export function useLista(listo, cargar, dependencias, alError) {
    const clave = JSON.stringify(dependencias);
    const [resultado, setResultado] = useState({ clave: null, datos: [] });

    useEffect(() => {
        if (!listo) return;
        let activo = true;
        cargar()
            .then((datos) => activo && setResultado({ clave, datos }))
            .catch((e) => activo && alError(e.message));
        return () => {
            activo = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clave, Boolean(listo)]);

    return listo && resultado.clave === clave ? resultado.datos : [];
}