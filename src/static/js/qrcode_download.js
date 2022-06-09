function download(){
    var link = document.createElement('a'); //Creates an 'a' element
    var thisImg = document.getElementById('qrcode').getElementsByTagName('img')[0]; //gets the first canvas element on the page, assuming the canvas you want to download is this element. 
    link.download = 'qrcode.png'; //Gives the download an output link
    link.href = thisImg.src //Gives the data to the link
    link.click(); //Clicks the 'a' element we created
}

function update_qrcode() {
    delete_qrcode();
    generate_qrcode();
}

function delete_qrcode() {
    document.getElementById('qrcode').getElementsByTagName('img')[0].remove();
    document.getElementById('qrcode').getElementsByTagName('canvas')[0].remove();
}

function generate_qrcode() {
    let qrlink = document.getElementById("linkinput").value;
    new QRCode(document.getElementById("qrcode"), qrlink);
} 
