console.log("poping loading...");
var loading_mask = document.createElement("div");
loading_mask.id = "ext-plugin-loading";
loading_mask.innerHTML = ' \
<span class="glyphicon spinning"></span> \
<p style="font-size: 10px;">正在加载中 ...</p>'

if(document.getElementById("ext-recoder-window") == null){
    document.documentElement.appendChild(loading_mask);
}