const API_URL = "https://gis-backend-uts.vercel.app/api/locations";

// Inisialisasi map
const map = L.map("map").setView([-6.9175, 107.6191], 13);

// Tile layer dengan pilihan style yang lebih menarik
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let tempMarker;
let allMarkers = [];
let allLocations = [];
let currentFilter = 'all';

// Custom icon untuk marker
const customIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Klik peta untuk ambil koordinat
map.on("click", function(e) {
  const lat = e.latlng.lat.toFixed(6);
  const lng = e.latlng.lng.toFixed(6);
  
  document.getElementById("lat").value = lat;
  document.getElementById("lng").value = lng;
  document.getElementById("latDisplay").textContent = lat;
  document.getElementById("lngDisplay").textContent = lng;
  
  if (tempMarker) {
    map.removeLayer(tempMarker);
  }
  
  tempMarker = L.marker([lat, lng], {
    icon: customIcon,
    draggable: true
  }).addTo(map);
  
  tempMarker.bindPopup("📍 Lokasi yang dipilih").openPopup();
  
  // Update koordinat saat marker di-drag
  tempMarker.on('dragend', function(e) {
    const newLat = e.target.getLatLng().lat.toFixed(6);
    const newLng = e.target.getLatLng().lng.toFixed(6);
    document.getElementById("lat").value = newLat;
    document.getElementById("lng").value = newLng;
    document.getElementById("latDisplay").textContent = newLat;
    document.getElementById("lngDisplay").textContent = newLng;
  });
});

// Show alert message
function showAlert(message, type = 'success') {
  const alertBox = document.getElementById('alertBox');
  alertBox.className = `alert alert-${type} show`;
  alertBox.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
  
  setTimeout(() => {
    alertBox.classList.remove('show');
  }, 3000);
}

// Simpan atau update lokasi
async function saveLocation() {
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);
  const name = document.getElementById("name").value.trim();
  const category = document.getElementById("category").value;
  const editId = document.getElementById("editId").value;

  if (!lat || !lng) {
    showAlert("Silakan klik pada peta untuk menentukan koordinat!", 'error');
    return;
  }

  if (!name) {
    showAlert("Nama lokasi harus diisi!", 'error');
    return;
  }

  if (!category) {
    showAlert("Kategori harus dipilih!", 'error');
    return;
  }

  try {
    const method = editId ? "PUT" : "POST";
    const url = editId ? `${API_URL}/${editId}` : API_URL;
    
    const res = await fetch(url, {
      method: method,
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({ name, category, lat, lng })
    });

    if (res.ok) {
      showAlert(editId ? "Lokasi berhasil diupdate!" : "Lokasi berhasil disimpan!", 'success');
      resetForm();
      loadLocations();
    } else {
      showAlert("Gagal menyimpan lokasi. Coba lagi!", 'error');
    }
  } catch (error) {
    showAlert("Terjadi kesalahan koneksi!", 'error');
    console.error(error);
  }
}

// Load semua lokasi
async function loadLocations() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    allLocations = data;
    
    // Clear markers
    allMarkers.forEach(m => map.removeLayer(m));
    allMarkers = [];
    
    // Update stats
    document.getElementById('totalLocations').textContent = data.length;
    const uniqueCategories = [...new Set(data.map(loc => loc.category))];
    document.getElementById('totalCategories').textContent = uniqueCategories.length;
    
    // Render locations
    renderLocations(data);
    
  } catch (error) {
    console.error("Error loading locations:", error);
  }
}

// Render locations to list and map
function renderLocations(locations) {
  const locationList = document.getElementById("locationList");
  
  if (locations.length === 0) {
    locationList.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-map-marker-alt"></i>
        <p>Belum ada lokasi tersimpan.<br>Klik pada peta untuk menambah lokasi.</p>
      </div>
    `;
    return;
  }
  
  locationList.innerHTML = "";
  
  locations.forEach(loc => {
    // Add marker to map
    const marker = L.marker([loc.lat, loc.lng], {icon: customIcon})
      .addTo(map)
      .bindPopup(`
        <div style="text-align: center;">
          <strong style="font-size: 14px;">${loc.name}</strong><br>
          <span style="font-size: 12px; color: #667eea;">${loc.category}</span><br>
          <small style="color: #888;">Lat: ${loc.lat}, Lng: ${loc.lng}</small>
        </div>
      `);
    
    allMarkers.push(marker);
    
    // Add to sidebar list
    const itemDiv = document.createElement('div');
    itemDiv.className = 'location-item';
    itemDiv.dataset.name = loc.name.toLowerCase();
    itemDiv.dataset.category = loc.category;
    
    itemDiv.innerHTML = `
      <div class="location-header">
        <div>
          <div class="location-name">${loc.name}</div>
          <span class="category-badge">${loc.category}</span>
        </div>
      </div>
      <div class="location-coords">
        <span><i class="fas fa-location-arrow"></i> ${loc.lat}</span>
        <span><i class="fas fa-location-arrow"></i> ${loc.lng}</span>
      </div>
      <div class="location-actions">
        <button class="btn btn-view" onclick='viewLocation(${loc.lat}, ${loc.lng})'>
          <i class="fas fa-eye"></i> Lihat
        </button>
        <button class="btn btn-edit" onclick='editLocation(${JSON.stringify(loc)})'>
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="btn btn-delete" onclick='deleteLocation("${loc._id}", "${loc.name}")'>
          <i class="fas fa-trash"></i> Hapus
        </button>
      </div>
    `;
    
    locationList.appendChild(itemDiv);
  });
}

// View location on map
function viewLocation(lat, lng) {
  map.setView([lat, lng], 16);
  allMarkers.forEach(marker => {
    const markerLatLng = marker.getLatLng();
    if (markerLatLng.lat === lat && markerLatLng.lng === lng) {
      marker.openPopup();
    }
  });
}

// Edit location
function editLocation(loc) {
  document.getElementById("editId").value = loc._id;
  document.getElementById("lat").value = loc.lat;
  document.getElementById("lng").value = loc.lng;
  document.getElementById("latDisplay").textContent = loc.lat;
  document.getElementById("lngDisplay").textContent = loc.lng;
  document.getElementById("name").value = loc.name;
  document.getElementById("category").value = loc.category;
  
  document.getElementById("formTitle").textContent = "Edit Lokasi";
  document.getElementById("btnText").textContent = "Update Lokasi";
  
  if (tempMarker) map.removeLayer(tempMarker);
  tempMarker = L.marker([loc.lat, loc.lng], {
    icon: customIcon,
    draggable: true
  }).addTo(map);
  
  map.setView([loc.lat, loc.lng], 15);
  
  tempMarker.on('dragend', function(e) {
    const newLat = e.target.getLatLng().lat.toFixed(6);
    const newLng = e.target.getLatLng().lng.toFixed(6);
    document.getElementById("lat").value = newLat;
    document.getElementById("lng").value = newLng;
    document.getElementById("latDisplay").textContent = newLat;
    document.getElementById("lngDisplay").textContent = newLng;
  });
  
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Delete location
async function deleteLocation(id, name) {
  if (!confirm(`Yakin ingin menghapus "${name}"?`)) return;
  
  try {
    const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
    if (res.ok) {
      showAlert("Lokasi berhasil dihapus!", 'success');
      loadLocations();
    } else {
      showAlert("Gagal menghapus lokasi!", 'error');
    }
  } catch (error) {
    showAlert("Terjadi kesalahan koneksi!", 'error');
  }
}

// Reset form
function resetForm() {
  document.getElementById("editId").value = "";
  document.getElementById("lat").value = "";
  document.getElementById("lng").value = "";
  document.getElementById("latDisplay").textContent = "-";
  document.getElementById("lngDisplay").textContent = "-";
  document.getElementById("name").value = "";
  document.getElementById("category").value = "";
  document.getElementById("formTitle").textContent = "Tambah Lokasi Baru";
  document.getElementById("btnText").textContent = "Simpan Lokasi";
  
  if (tempMarker) {
    map.removeLayer(tempMarker);
    tempMarker = null;
  }
}

// Filter by category
function filterByCategory(category) {
  currentFilter = category;
  
  // Update active button
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  event.target.classList.add('active');
  
  // Filter locations
  filterLocations();
}

// Search and filter locations
function filterLocations() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const items = document.querySelectorAll('.location-item');
  
  items.forEach(item => {
    const name = item.dataset.name;
    const category = item.dataset.category;
    
    const matchesSearch = name.includes(searchTerm);
    const matchesCategory = currentFilter === 'all' || category === currentFilter;
    
    if (matchesSearch && matchesCategory) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

// Load locations on start
loadLocations();