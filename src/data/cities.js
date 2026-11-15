// Koordinat perkiraan pusat kota (untuk perhitungan jadwal salat & kiblat). Bisa diganti GPS / input manual.
export const CITIES = [
  ['Banda Aceh', 5.5483, 95.3238], ['Medan', 3.5952, 98.6722], ['Padang', -0.9471, 100.4172], ['Pekanbaru', 0.5071, 101.4478],
  ['Jambi', -1.6101, 103.6131], ['Palembang', -2.9761, 104.7754], ['Bengkulu', -3.7928, 102.2608], ['Bandar Lampung', -5.3971, 105.2668],
  ['Serang', -6.1104, 106.164], ['Jakarta', -6.2088, 106.8456], ['Tangerang', -6.1783, 106.6319], ['Depok', -6.4025, 106.7942],
  ['Bekasi', -6.2383, 106.9756], ['Bogor', -6.5971, 106.806], ['Bandung', -6.9175, 107.6191], ['Tasikmalaya', -7.3274, 108.2207],
  ['Cirebon', -6.732, 108.5523], ['Kuningan', -6.9764, 108.4836], ['Semarang', -6.9667, 110.4167], ['Solo', -7.5755, 110.8243],
  ['Yogyakarta', -7.7956, 110.3695], ['Surabaya', -7.2575, 112.7521], ['Malang', -7.9666, 112.6326], ['Denpasar', -8.6705, 115.2126],
  ['Mataram', -8.5833, 116.1167], ['Kupang', -10.1772, 123.607], ['Pontianak', -0.0263, 109.3425], ['Banjarmasin', -3.3186, 114.5944],
  ['Balikpapan', -1.2379, 116.8529], ['Samarinda', -0.5022, 117.1536], ['Makassar', -5.1477, 119.4327], ['Palu', -0.8917, 119.8707],
  ['Kendari', -3.9985, 122.513], ['Gorontalo', 0.5435, 123.0568], ['Manado', 1.4748, 124.8421], ['Ternate', 0.7906, 127.3842],
  ['Ambon', -3.6954, 128.1814], ['Jayapura', -2.5916, 140.669], ['Makkah', 21.4225, 39.8262], ['Madinah', 24.4672, 39.6111]
].map(([name, lat, lng]) => ({ name, lat, lng }))
