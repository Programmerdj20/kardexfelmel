<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$page = isset($_GET['page']) ? intval($_GET['page']) : 1;

$apiUrl = "https://orocolombia.co/wp-json/wc/v3/products?consumer_key=ck_865f2431376662f2bff8e2fdca6a933869805784&consumer_secret=cs_b4d4ae6ce65cfa4300464afa935cc708398b90b4&per_page=100&page={$page}&orderby=modified&order=desc";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

// Agregar User-Agent personalizado
curl_setopt($ch, CURLOPT_USERAGENT, "Mozilla/5.0 (compatible; GrupoFelmelBot/1.0)");

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Evitar rate-limit si el servidor se sobrecarga (solo por seguridad)
// usleep(500000); // Descomentar si sigue fallando (500ms entre peticiones)

if ($error) {
    http_response_code(500);
    echo json_encode(["error" => "Error cURL", "detalle" => $error]);
    exit;
}

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode(["error" => "Respuesta HTTP no exitosa", "codigo" => $httpCode, "respuesta" => $response]);
    exit;
}

echo $response;
?>
