//----------------------------------------
//  Autor: Adrián Jáuregui Felipe
//  © StockBot 2026
//----------------------------------------

//Función básica para la camara
function updateCameraFeed(){

    const tab_camara=document.getElementById("tab-camara");

    if(!tab_camara.classList.contains("active")){
        console.log("retirada");
        return;
    }
    console.log("entrada");
    const img = document.getElementById("cameraFeed");
    const timestamp = new Date().getTime();
    img.src = `http://localhost:8080/stream?topic=/camera/image_raw&t=${timestamp}`;
}

setInterval(updateCameraFeed,100);
