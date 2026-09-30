$ErrorActionPreference = 'Stop'
$districts = [ordered]@{
  'Johor' = @('Batu Pahat','Johor Bahru','Kluang','Kota Tinggi','Kulai','Mersing','Muar','Pontian','Segamat','Tangkak')
  'Kedah' = @('Baling','Bandar Baharu','Kota Setar','Kuala Muda','Kubang Pasu','Langkawi','Padang Terap','Pendang','Sik','Yan','Kulim')
  'Kelantan' = @('Bachok','Gua Musang','Jeli','Kota Bharu','Kuala Krai','Machang','Pasir Mas','Pasir Puteh','Tanah Merah','Tumpat')
  'Melaka' = @('Alor Gajah','Jasin','Melaka Tengah')
  'Negeri Sembilan' = @('Jelebu','Jempol','Kuala Pilah','Port Dickson','Rembau','Seremban','Tampin')
  'Pahang' = @('Bentong','Bera','Cameron Highland','Jerantut','Kuala Lipis','Kuantan','Maran','Pekan','Raub','Rompin','Temerloh')
  'Pulau Pinang' = @('Barat Daya','Seberang Perai Selatan','Seberang Perai Tengah','Seberang Perai Utara','Timur Laut')
  'Perak' = @('Batang Padang','Hilir Perak','Hulu Perak','Kampar','Kerian','Kinta','Kuala Kangsar','Larut Matang','Manjung','Muallim','Perak Tengah')
  'Perlis' = @('Arau','Kangar')
  'Selangor' = @('Gombak','Hulu Langat','Hulu Selangor','Klang','Kuala Langat','Kuala Selangor','Petaling','Sabak Bernam','Sepang')
  'Terengganu' = @('Besut','Dungun','Hulu Terengganu','Kemaman','Kuala Nerus','Kuala Terengganu','Marang','Setiu')
  'Sabah' = @('Beaufort','Keningau','Kota Belud','Kota Kinabalu','Kudat','Lahad Datu','Penampang','Sandakan','Tawau')
  'Sarawak' = @('Betong','Bintulu','Kapit','Kuching','Limbang','Miri','Mukah','Samarahan','Sarikei','Sibu','Sri Aman')
  'WP Kuala Lumpur' = @('Zon Cheras','Zon Kepong','Zon Lembah Pantai','Zon Titiwangsa')
  'WP Labuan' = @('WP Labuan')
  'WP Putrajaya' = @('WP Putrajaya')
  'ILK' = @('ILK')
}

$records = [System.Collections.Generic.List[object]]::new()
$coverage = [System.Collections.Generic.List[object]]::new()
foreach ($state in $districts.Keys) {
  foreach ($district in $districts[$state]) {
    $url = 'https://giret.moh.gov.my/gpass/api/getfs?negeri={0}&daerah={1}' -f [uri]::EscapeDataString($state), [uri]::EscapeDataString($district)
    $response = Invoke-RestMethod -Uri $url -Method Get
    $items = @($response)
    $coverage.Add([pscustomobject]@{ state = $state; district = $district; clinic_count = $items.Count })
    foreach ($item in $items) {
      $records.Add([pscustomobject]@{
        state = $state
        district = $district
        clinic_name = $item.nama
        facility_code = $item.kodFasilitiGiret
        source_url = $url
      })
    }
  }
}

$result = [ordered]@{
  retrieved_at = (Get-Date).ToString('yyyy-MM-ddTHH:mm:ssK')
  directory_url = 'https://giret.moh.gov.my/clinical/pengguna'
  records = $records
  coverage = $coverage
}
$result | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 'clinics_raw.json'
Write-Output ("records={0}; districts={1}; states={2}" -f $records.Count, $coverage.Count, $districts.Count)
