// --- LOGIKA SLIDER ---
    function slideTo(index) {
      const slider = document.getElementById('slider');
      slider.style.transform = `translateX(-${index * 100}vw)`;
      
      // Update Active Class pada Navbar
      document.querySelectorAll('.nav-link').forEach((link, i) => {
        if(i === index) link.classList.add('active');
        else link.classList.remove('active');
      });
    }

// Physics Canvas
const canvas = document.getElementById('physics-canvas');
const ctx = canvas.getContext('2d');
let shapes = [];
let mouse = { x: -1000, y: -1000 };

// Tooltip Data
const SHAPE_INFO = [
  { name: "Simple Cubic", desc: "a = b = c" },
  { name: "BCC", desc: "Body-Centered Cubic" },
  { name: "FCC", desc: "Face-Centered Cubic" },
  { name: "Tetragonal", desc: "a = b ≠ c (Elongated)" },
  { name: "Hexagonal", desc: "6-fold Symmetry" },
  { name: "Octahedron", desc: "Coordination: 6" },
  { name: "Orthorhombic", desc: "a ≠ b ≠ c (Box)" }
];

window.addEventListener('resize', resizeCanvas);
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();

window.addEventListener('mousemove', (e) => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

function project(x, y, z, size, centerX, centerY, angleX, angleY) {
  let radX = angleX, radY = angleY;
  let ny = y * Math.cos(radX) - z * Math.sin(radX);
  let nz = y * Math.sin(radX) + z * Math.cos(radX);
  y = ny; z = nz;
  let nx = x * Math.cos(radY) + z * Math.sin(radY);
  nz = -x * Math.sin(radY) + z * Math.cos(radY);
  x = nx; z = nz;
  
  let factor = 600 / (600 + z);
  return { x: x * factor * size + centerX, y: y * factor * size + centerY, z: z };
}

class PhysicsGeometry {
  constructor(typeIndex) {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.vx = (Math.random() - 0.5) * 0.7; 
    this.vy = (Math.random() - 0.5) * 0.7; 
    
    this.size = 25 + Math.random() * 20;
    this.angleX = Math.random() * Math.PI;
    this.angleY = Math.random() * Math.PI;
    this.rotSpeedX = (Math.random() - 0.5) * 0.012;
    this.rotSpeedY = (Math.random() - 0.5) * 0.012;
    
    this.type = typeIndex % 7; 
    this.nodes = this.generateNodes(this.type);
    this.color = this.getColor(this.type);
    this.isHovered = false;
  }

  generateNodes(type) {
    let n = [];
    const push = (x, y, z) => n.push({x, y, z});
    switch(type) {
      case 0: case 1: case 2: // CUBIC
        for(let i of [-1, 1]) for(let j of [-1, 1]) for(let k of [-1, 1]) push(i, j, k);
        if (type === 1) push(0, 0, 0);
        if (type === 2) [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].forEach(v => push(...v));
        break;
      case 3: // TETRAGONAL
        for(let i of [-1, 1]) for(let j of [-1, 1]) for(let k of [-1.6, 1.6]) push(i, j, k);
        break;
      case 4: // HEXAGONAL
        for(let i = 0; i < 6; i++) {
          let a = (i / 6) * Math.PI * 2;
          push(Math.cos(a), Math.sin(a), 1.2); push(Math.cos(a), Math.sin(a), -1.2);
        }
        push(0, 0, 1.2); push(0, 0, -1.2);
        break;
      case 5: // OCTAHEDRON
        [[1.5,0,0],[-1.5,0,0],[0,1.5,0],[0,-1.5,0],[0,0,1.5],[0,0,-1.5]].forEach(v => push(...v));
        break;
      case 6: // ORTHORHOMBIC
        for(let i of [-0.8, 0.8]) for(let j of [-1.2, 1.2]) for(let k of [-1.8, 1.8]) push(i, j, k);
        break;
    }
    return n;
  }

  getColor(type) {
    return ['#FF3B30', '#3A86FF', '#00FF9F', '#FFCA3A', '#AF52DE', '#FF9500', '#00D4FF'][type];
  }

  update() {
    // Hover Detection
    let dx = this.x - mouse.x;
    let dy = this.y - mouse.y;
    this.isHovered = Math.sqrt(dx*dx + dy*dy) < 80;

    if (!this.isHovered) {
      this.x += this.vx;
      this.y += this.vy;
      this.angleX += this.rotSpeedX;
      this.angleY += this.rotSpeedY;
    }

    if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
    if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
  }

  draw() {
    let pNodes = this.nodes.map(n => project(n.x, n.y, n.z, this.size, this.x, this.y, this.angleX, this.angleY));

    // Glow Effect Logic
    ctx.shadowBlur = this.isHovered ? 15 : 0;
    ctx.shadowColor = this.color;

    ctx.beginPath();
    ctx.strokeStyle = this.isHovered ? this.color : this.color + '44';
    ctx.lineWidth = this.isHovered ? 2 : 1;

    for(let i = 0; i < pNodes.length; i++) {
      for(let j = i + 1; j < pNodes.length; j++) {
        let dx = this.nodes[i].x - this.nodes[j].x;
        let dy = this.nodes[i].y - this.nodes[j].y;
        let dz = this.nodes[i].z - this.nodes[j].z;
        let d = Math.sqrt(dx*dx + dy*dy + dz*dz);

        // Adaptive Thresholds
        let threshold = 2.1;
        if (this.type === 3) threshold = 3.3; // Tetragonal vertical edges (1.6 * 2)
        if (this.type === 4) threshold = 1.3; 
        if (this.type === 5) threshold = 2.2; 
        if (this.type === 6) threshold = 3.7; // Orthorhombic longest edge (1.8 * 2)

        if (d > 0.1 && d <= threshold) { 
          ctx.moveTo(pNodes[i].x, pNodes[i].y);
          ctx.lineTo(pNodes[j].x, pNodes[j].y);
        }
        if (this.type === 4 && d > 2.3 && d < 2.5) { // Hexagonal prism edges
          ctx.moveTo(pNodes[i].x, pNodes[i].y);
          ctx.lineTo(pNodes[j].x, pNodes[j].y);
        }
      }
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // Reset shadow for atoms

    // Tooltip
    if (this.isHovered) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 14px Poppins";
      ctx.fillText(SHAPE_INFO[this.type].name, this.x + 40, this.y - 10);
      ctx.font = "10px Poppins";
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(SHAPE_INFO[this.type].desc, this.x + 40, this.y + 5);
    }

    pNodes.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.isHovered ? 3.5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    });
  }
}

function init() {
  shapes = [];
  for(let i = 0; i < 21; i++) {
    shapes.push(new PhysicsGeometry(i));
  }
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  shapes.forEach(s => {
    s.update();
    s.draw();
  });
  requestAnimationFrame(animate);
}

init();
animate();

// Intersection Observer (Scroll Effect)
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });
document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));


// --- CONFIGURATION NOTE ---
// the Contentful client is no longer created in browser code; requests
// are proxied through an Edge function so the API token stays secret.
// (the CDN import tag can be removed if you no longer use contentful
// on the client side.)

// --- FETCH DATA DARI CONTENTFUL ---
async function fetchContent() {
  try {
    // hit our serverless proxy endpoint instead of calling Contentful directly
    const [expData, portData, pubData, eduData] = await Promise.all([
      fetch('/api/content?type=experience&order=-fields.period').then(r => r.json()),
      fetch('/api/content?type=portfolio').then(r => r.json()),
      fetch('/api/content?type=publication').then(r => r.json()),
      fetch('/api/content?type=education&order=-fields.period').then(r => r.json())
    ]);

    renderExperience(expData.items);
    renderPortfolio(portData.items);
    renderPublications(pubData.items);
    renderEducations(eduData.items);

    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise();
    }

  } catch (error) {
    console.error("Gagal koneksi ke Contentful:", error);
  }
}

// --- FETCH DATA DARI CONTENTFUL ---
async function fetchContent() {
  try {
    // Ambil semua data sekaligus
    const [expData, portData, pubData, eduData] = await Promise.all([
      client.getEntries({ content_type: 'experience', order: '-fields.period' }),
      client.getEntries({ content_type: 'portfolio' }),
      client.getEntries({ content_type: 'publication' }),
      // request education entries sorted by period (descending)
      client.getEntries({ content_type: 'education', order: '-fields.period' })
    ]);

    renderExperience(expData.items);
    renderPortfolio(portData.items);
    renderPublications(pubData.items);
    // pass raw array; we'll also ensure correct ordering inside renderer
    renderEducations(eduData.items);

    // Perintahkan MathJax untuk memproses rumus yang baru masuk
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise();
    }

  } catch (error) {
    console.error("Gagal koneksi ke Contentful:", error);
  }
}

// --- RENDER FUNCTIONS ---
function renderExperience(items) {
  const container = document.getElementById('experience-list');
  if (!container) return;

  container.innerHTML = items.map(item => {
    // Ambil list deskripsi, pastikan defaultnya array kosong jika tidak diisi
    const points = item.fields.description || [];

    // Ubah array string menjadi list HTML
    const pointsHtml = points.map(point => `<li>${point}</li>`).join('');

    return `
      <div class="timeline-item fade-in visible">
        <h3>${item.fields.title} <span style="color:var(--accent-blue);">${item.fields.period}</span></h3>
        <p><strong>${item.fields.company}</strong></p>
        
        <ul class="experience-points">
          ${pointsHtml}
        </div>
      </div>
    `;
  }).join('');

  // Pastikan MathJax me-render ulang jika ada LaTeX di dalam list
  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise();
  }
}

function renderPortfolio(items) {
  const container = document.getElementById('portfolio-grid');
  
  container.innerHTML = items.map((item, cardIdx) => {
    // Ambil semua media dari contentful (asumsi nama field: screenshots)
    const images = item.fields.screenshots || [];
    const validImages = images.filter(img => img && img.fields?.file);
    
    // Jika tidak ada gambar, pakai placeholder
    if (validImages.length === 0) {
      validImages.push({ fields: { file: { url: '//via.placeholder.com/400x300?text=No+Visual' } } });
    }

    const hasMultiple = validImages.length > 1;

    return `
      <div class="portfolio-card fade-in visible" id="card-${cardIdx}">
        <div class="carousel-wrapper">
          ${hasMultiple ? `
            <button class="carousel-btn btn-prev" onclick="moveSlide(${cardIdx}, -1)">❮</button>
            <button class="carousel-btn btn-next" onclick="moveSlide(${cardIdx}, 1)">❯</button>
          ` : ''}
          
          <div class="carousel-track" id="track-${cardIdx}" data-current="0" data-total="${validImages.length}">
            ${validImages.map(img => `
              <img src="https:${img.fields.file.url}" alt="Project View" />
            `).join('')}
          </div>

          <div class="carousel-dots" id="dots-${cardIdx}">
            ${validImages.map((_, i) => `<div class="dot ${i === 0 ? 'active' : ''}"></div>`).join('')}
          </div>
        </div>

        <div class="portfolio-info">
          <h3>${item.fields.title}</h3>
          <p>${item.fields.description}</p>
        </div>
      </div>
    `;
  }).join('');
}

// Fungsi untuk menggeser slide
function moveSlide(cardIdx, direction) {
  const track = document.getElementById(`track-${cardIdx}`);
  const dots = document.getElementById(`dots-${cardIdx}`).children;
  
  let current = parseInt(track.getAttribute('data-current'));
  const total = parseInt(track.getAttribute('data-total'));

  // Update index (Looping: jika di akhir balik ke awal)
  current = (current + direction + total) % total;
  
  // Geser track (Vektor Translasi)
  track.style.transform = `translateX(-${current * 100}%)`;
  track.setAttribute('data-current', current);

  // Update Dots
  Array.from(dots).forEach((dot, i) => {
    dot.classList.toggle('active', i === current);
  });
}

function renderPublications(items) {
  const container = document.getElementById('publications-list');
  container.innerHTML = items.map(item => `
    <li class="timeline-item fade-in visible">
      <strong>${item.fields.title}</strong> — ${item.fields.description}
      <br><small style="color:var(--accent-green);">${item.fields.status}</small>
    </li>
  `).join('');
}

function renderEducations(items) {
  const container = document.getElementById('educations-list'); 
  if(!container) return;

  // make sure entries are sorted by period; order string or date
  items.sort((a, b) => {
    const pa = a.fields.period || '';
    const pb = b.fields.period || '';
    // if period is something like "2020-2022" we can compare lexicographically
    return pb.localeCompare(pa); // descending order
  });

  container.innerHTML = items.map(item => {
    // Destructuring fields untuk kemudahan
    const { degree, school, period, major, description } = item.fields;

    return `
      <div class="timeline-item fade-in visible">
        <h3>${degree} - ${school} 
          <span style="color:var(--accent-red); margin-left:10px;">${period}</span>
        </h3>
        <p><strong>Focus:</strong> ${major}</p>
        <div class="edu-description" style="color: #ccc; font-size: 0.95rem; margin-top: 10px;">
          ${description}
        </div>
      </div>
    `;
  }).join('');
}

// Panggil fungsi fetch saat load
fetchContent();

// --- LOGIKA SLIDER (Tetap sama) ---
function slideTo(index) {
  const slider = document.getElementById('slider');
  slider.style.transform = `translateX(-${index * 100}vw)`;
  
  // Update Navbar Active State
  document.querySelectorAll('.nav-link').forEach((link, i) => {
    link.classList.toggle('active', i === index);
  });

  // RESET SCROLL: Paksa section kembali ke paling atas
  const sections = document.querySelectorAll('.section');
  sections.forEach((sec) => {
    sec.scrollTo({
      top: 0,
      behavior: 'smooth' // Bisa 'auto' jika ingin instan tanpa animasi
    });
  });
}


// --- KEYBOARD NAVIGATION LOGIC ---

// 1. Inisialisasi index halaman aktif (global)
let currentSlideIndex = 0; 

// 2. Modifikasi sedikit fungsi slideTo yang lama agar mengupdate index global
const originalSlideTo = slideTo;
window.slideTo = function(index) {
  currentSlideIndex = index; // Update index saat navigasi diklik manual
  originalSlideTo(index);
};

// 3. Tambahkan listener untuk tombol panah
window.addEventListener('keydown', (e) => {
  // Cek apakah user sedang mengetik di input/textarea agar tidak ganggu
  if (["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) return;

  if (e.key === 'ArrowRight') {
    // Jika belum di slide terakhir (4), pindah ke kanan
    if (currentSlideIndex < 4) {
      slideTo(currentSlideIndex + 1);
    }
  } else if (e.key === 'ArrowLeft') {
    // Jika belum di slide pertama (0), pindah ke kiri
    if (currentSlideIndex > 0) {
      slideTo(currentSlideIndex - 1);
    }
  }
});