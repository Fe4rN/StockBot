function obtenerUsuarioDeCookie() {
    const name = "session_user=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const ca = decodedCookie.split(';');
    
    let cookieValue = "";
    for(let i = 0; i < ca.length; i++) {
        let c = ca[i].trim();
        if (c.indexOf(name) == 0) {
            cookieValue = c.substring(name.length, c.length);
        }
    }

    if (!cookieValue) return null;

    try {
        const jsonStr = atob(cookieValue);

        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Error al descifrar la cookie de sesión", e);
        return null;
    }
}