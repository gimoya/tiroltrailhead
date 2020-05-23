/* proxy.php */
$url = "https://lawine.tirol.gv.at/data/produkte/ogd.geojson";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec ($ch);
curl_close ($ch);
echo $result;