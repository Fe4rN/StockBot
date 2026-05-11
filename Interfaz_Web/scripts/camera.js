//----------------------------------------
//  Autor: Adrián Jáuregui Felipe
//  © StockBot 2026
//----------------------------------------

function updateCameraFeed(){
    const tab_camara = document.getElementById("tab-camara");
    const img = document.getElementById("cameraFeed");

    if(!tab_camara.classList.contains("active")){
        if (img.src !== "") img.src = ""; 
        return;
    }

    const streamUrl = "http://localhost:8080/stream?topic=/camera/image_raw";

    if (img.src !== streamUrl) {
        img.src = streamUrl;
        console.log("Transmisión en directo patrocinada por StockBot tu mozo de almacén de confianza.");
    }
}

setInterval(updateCameraFeed, 500);