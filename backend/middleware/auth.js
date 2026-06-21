import jwt from "jsonwebtoken";

//El middleware auth.js es un cadenero que se para frente a la puerta de cada ruta 
// y revisa si la peticion de React tien JWT o es usuario Invitado

const verificarToken = (req, res, next) => {
  //Extraemos el token de los encabezados
  const authHeader = req.headers["authorization"];

  const token = authHeader && authHeader.split(" ")[1];

  // NO TOKEN = INVITADO
  if (!token) {
    req.esInvitado = true; 
    return next(); 
  }

  // Si hay token, verificamos que no sea falso o caducado
  try {
    const decodificado = jwt.verify(token, "MI_CLAVE_SECRETA_SUPER_SEGURA_SISISI_123");
    req.usuario = decodificado; 
    req.esInvitado = false;
    next(); 
  } catch (error) {
    //Si el token es involido o caduco
    return res
      .status(403)
      .json({ error: "Tu sesión ha expirado o el token es inválido." });
  }
};

export default verificarToken;
